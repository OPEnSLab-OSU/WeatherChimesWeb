const express = require('express');
const path = require('path');
const app = express();

require('dotenv').config();

const uri = process.env.URI;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname)));

// Serve the names of all the databases to choose from
app.get('/databases', async (req, res) => {
  const mongoclient = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await mongoclient.connect();

    // List all databases
    let databasesList = await mongoclient.db().admin().listDatabases();

    // Create an array of database names
    let databaseNames = databasesList.databases.map(db => db.name);

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
  console.log("Request to /collections");
  databaseName = req.query.database;

  const mongoclient = new MongoClient(uri);

  try {
      // Connect to the MongoDB server
      await mongoclient.connect();
        
      const database = mongoclient.db(databaseName);
      
      // List all collections
      let collectionsList = await database.listCollections().toArray();
      let collectionNames = collectionsList.map(col => col.name);
      res.status(200).json(collectionNames);

      console.log("Collections: ", collectionNames);
  } catch (err) {
      console.error(err);
      res.status(500);
  } finally {
    await mongoclient.close();
  }
});

app.get('/data', async (req, res) => {
  const databaseName = req.query.database;
  const collectionName = req.query.collection;
  const x = parseInt(req.query.x);
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;
  const prescaler = req.query.prescaler ? parseInt(req.query.prescaler) : 1;

  const mongoclient = new MongoClient(uri);

  try {
      // Connect to the MongoDB server
      await mongoclient.connect();

      const database = mongoclient.db(databaseName);
      const collection = database.collection(collectionName);

      let packets;

      if (x) {
          // Get the last x documents from the collection
          packets = await collection.find({}, { projection: { Analog: 0, Packet: 0 }}).sort({"Timestamp.time_utc": -1}).limit(x).toArray();
      } else if (startTime && endTime) {
          // Get documents between startTime and endTime
          packets = await collection.find({ "Timestamp.time_utc": { "$gte": startTime, "$lt": endTime } }, { projection: { Analog: 0, Packet: 0 }}).sort({"Timestamp.time_utc": -1}).toArray();
          // Apply the prescaler to the packets
      }

      packets = packets.filter((_, index) => index % prescaler === 0);

      // Send the packets as JSON
      res.status(200).json(packets);
  } catch (err) {
      console.error(err);
      res.status(500).send(err);
  } finally {
      await mongoclient.close();
  }
});

// for any request that doesn't
// match one above, send back the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const { MongoClient } = require('mongodb');