const express = require("express");
const path = require("path");
const app = express();

require("dotenv").config();

const uri = process.env.URI;

// Log GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    console.log(`GET Request: ${req.url}`);
  }
  next();
});

// Zero-pad non-padded ISO time components (e.g. "T9:5:56" -> "T09:05:56Z")
// Needed because some device firmware omits leading zeros, which $dateFromString rejects
function fixTimestamp(ts) {
  if (!ts) return ts;
  const [datePart, timePart] = ts.replace('Z', '').split('T');
  if (!timePart) return ts;
  const parts = timePart.split(':').map(p => p.padStart(2, '0'));
  return `${datePart}T${parts.join(':')}Z`;
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname)));

// Serve the names of all the databases to choose from
app.get("/databases", async (req, res) => {
  const mongoclient = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await mongoclient.connect();

    // List all databases
    let databasesList = await mongoclient.db().admin().listDatabases();

    // Create an array of database names
    let databaseNames = databasesList.databases.map((db) => db.name);

    // Send the list of database names as JSON
    res.json(databaseNames);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  } finally {
    await mongoclient.close();
  }
});

app.get('/collections', async (req, res) => {
  const databaseName = req.query.database;

  const mongoclient = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await mongoclient.connect();

    const database = mongoclient.db(databaseName);

    // List all collections
    let collectionsList = await database.listCollections().toArray();
    let collectionNames = collectionsList.map(col => col.name);
    res.status(200).json(collectionNames);

    console.log('Collections: ', collectionNames);
  } catch (err) {
    console.error(err);
    res.status(500);
  } finally {
    await mongoclient.close();
  }
});

app.get("/data", async (req, res) => {
  const databaseName = req.query.database;
  const collectionName = req.query.collection;
  const x = parseInt(req.query.x);
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;
  const prescaler = req.query.prescaler ? parseInt(req.query.prescaler) : 1;
  const metadata = parseInt(req.query.metadata);

  const mongoclient = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await mongoclient.connect();

    const database = mongoclient.db(databaseName);
    const collection = database.collection(collectionName);

    let packets;

      if (x) {
          // Sort by _id (ObjectId contains insertion time) — reliable regardless of timestamp format
          packets = (await collection.find({}, { projection: { Packet: 0 }}).sort({"_id": -1}).limit(x).toArray()).reverse();
      } else if (startTime && endTime) {
          const start = new Date(startTime);
          const end = new Date(endTime);
          // Use date-string prefix for a rough MongoDB filter (date portion is always zero-padded),
          // then do precise filtering in Node.js using fixTimestamp to handle non-padded time components
          const startDateStr = start.toISOString().slice(0, 10);
          const endDayAfter = new Date(end);
          endDayAfter.setUTCDate(endDayAfter.getUTCDate() + 1);
          const endDateNext = endDayAfter.toISOString().slice(0, 10);

          const raw = await collection.find(
            { 'Timestamp.time_local': { $gte: startDateStr, $lt: endDateNext } },
            { projection: { Packet: 0, WiFi: 0 } }
          ).toArray();

          packets = raw
            .filter(d => {
              const t = new Date(fixTimestamp(d?.Timestamp?.time_local));
              return t >= start && t < end;
            })
            .sort((a, b) =>
              new Date(fixTimestamp(a.Timestamp.time_local)) -
              new Date(fixTimestamp(b.Timestamp.time_local))
            );
          // Apply the prescaler to the packets
      } else {
        // No valid mode provided, don’t crash: tell the client
        return res.status(400).json({
          error: "Must provide either x or startTime and endTime for /data",
        });
      }

      if (packets) packets = packets.filter((_, index) => index % prescaler === 0);

    // Send the packets as JSON
    res.status(200).json(packets);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  } finally {
    await mongoclient.close();
  }
});

app.get('/metadata', async (req, res) => {
  // Query the database like before and set up the mongoclient
  const databaseName = req.query.database;

  const mongoclient = new MongoClient(uri);

  try {
    await mongoclient.connect();

    // Connect to the database in the URL, and retrieve all collections.
    const database = mongoclient.db(databaseName);
    const collections = await database.listCollections().toArray();
    let packet = null;

    // Search through all collections in the database until a metadata packet is found
    for (let i = 0; i < collections.length; i++) {
      packet = await database.collection(collections[i].name).findOne({ type: 'metadata' }, {});

      // If metadata is found, stop searching through the collections
      if (packet != null) {
        break;
      }
    }

    res.status(200).json(packet);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  } finally {
    await mongoclient.close();
  }
});

app.get('/date-range', async (req, res) => {
  const { database: databaseName, collection: collectionName } = req.query;
  const mongoclient = new MongoClient(uri);
  try {
    await mongoclient.connect();
    const col = mongoclient.db(databaseName).collection(collectionName);

    // Sort by _id (ObjectId insertion order) to find oldest and newest documents
    // that have a valid Timestamp.time_local field (skips metadata/malformed packets).
    const filter = { 'Timestamp.time_local': { $exists: true, $ne: null } };
    const proj = { projection: { 'Timestamp.time_local': 1, _id: 0 } };
    const [oldest, newest] = await Promise.all([
      col.find(filter, proj).sort({ _id: 1 }).limit(1).next(),
      col.find(filter, proj).sort({ _id: -1 }).limit(1).next(),
    ]);

    if (!oldest || !newest) return res.json({ minDate: null, maxDate: null });

    // Return as device-local timezone-naive strings (no Z) so the client
    // can use them directly in datetime-local inputs without UTC conversion
    const minFixed = fixTimestamp(oldest.Timestamp.time_local);
    const maxFixed = fixTimestamp(newest.Timestamp.time_local);

    if (!minFixed || !maxFixed) return res.json({ minDate: null, maxDate: null });

    res.json({
      minDate: minFixed.slice(0, -1),
      maxDate: maxFixed.slice(0, -1),
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  } finally {
    await mongoclient.close();
  }
});

// for any request that doesn't
// match one above, send back the index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const { MongoClient } = require('mongodb');
