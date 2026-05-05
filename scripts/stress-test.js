#!/usr/bin/env node

const { performance } = require("node:perf_hooks");
const { setTimeout: sleep } = require("node:timers/promises");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();

const DEFAULTS = {
  baseUrl: "http://localhost:3000",
  users: 10,
  iterations: 5,
  rampMs: 150,
  timeoutMs: 15000,
  xPackets: 250,
  prescaler: 1,
  prescalers: null,
  mode: "mixed",
  numDatabases: 2,
};

// Time windows used by the Last Packets feature (relative to the most recent packet).
const LAST_PACKETS_WINDOWS = [
  { label: "1h",  ms: 60 * 60 * 1000 },
  { label: "6h",  ms: 6 * 60 * 60 * 1000 },
  { label: "1d",  ms: 24 * 60 * 60 * 1000 },
  { label: "7d",  ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

const HELP_TEXT = `
WeatherChimes stress test harness

Usage:
  node scripts/stress-test.js [options]

Options:
  --base-url <url>        Server base URL. Default: http://localhost:3000
  --users <n>             Concurrent virtual users. Default: 10
  --iterations <n>        Requests per user. Default: 5
  --ramp-ms <ms>          Delay between starting users. Default: 150
  --timeout-ms <ms>       Per-request timeout. Default: 15000
  --x-packets <n>         Packet count for /data x-mode (data-only). Default: 250
  --prescaler <n>         Prescaler for /data requests. Default: 1
  --prescalers <list>     Comma-separated prescaler values to vary across users (e.g. 1,2,4)
  --database <name>       Explicit database to target
  --collection <name>     Explicit collection to target
  --num-databases <n>     Number of databases to use in multi-db mode. Default: 2
  --mode <name>           Workload mode (see below). Default: mixed
  --help                  Show this help text

Modes:
  mixed          Discovery endpoints + last-packets data calls with varied time windows
  data-only      Raw /data calls using the x= parameter (throughput baseline)
  discovery      Only /databases, /collections, /date-range, /metadata
  last-packets   Simulate the Last Packets UI feature: /data with start/end derived from
                 the dataset maxDate across 5 time windows (1h, 6h, 1d, 7d, 30d)
  refresh        Simulate Packet Refresh: all users repeatedly hit the same fixed /data
                 URL (last 1h of data). Use --ramp-ms 0 for maximum burst pressure.
  multi-db       Interleave requests across up to --num-databases discovered databases

Examples:
  npm run stress:test
  npm run stress:burst
  node scripts/stress-test.js --users 40 --iterations 8 --mode last-packets
  node scripts/stress-test.js --users 20 --mode refresh --ramp-ms 0
  node scripts/stress-test.js --users 30 --mode multi-db --num-databases 3
  node scripts/stress-test.js --users 15 --mode data-only --prescalers 1,2,4
`;

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) continue;
    if (token === "--help") {
      options.help = true;
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const nextValue = inlineValue ?? argv[i + 1];
    const consumesNext = inlineValue === undefined && argv[i + 1] && !argv[i + 1].startsWith("--");

    if (nextValue === undefined) {
      throw new Error(`Missing value for --${rawKey}`);
    }

    options[key] = nextValue;

    if (consumesNext) {
      i += 1;
    }
  }

  options.users = Number(options.users);
  options.iterations = Number(options.iterations);
  options.rampMs = Number(options.rampMs);
  options.timeoutMs = Number(options.timeoutMs);
  options.xPackets = Number(options.xPackets);
  options.prescaler = Number(options.prescaler);
  options.numDatabases = Number(options.numDatabases);

  if (options.prescalers !== null) {
    options.prescalers = String(options.prescalers).split(",").map(Number);
  }

  return options;
}

function validateOptions(options) {
  const numericKeys = ["users", "iterations", "rampMs", "timeoutMs", "xPackets", "prescaler", "numDatabases"];

  for (const key of numericKeys) {
    if (!Number.isFinite(options[key]) || options[key] < 0) {
      throw new Error(`Invalid numeric value for ${key}: ${options[key]}`);
    }
  }

  const validModes = new Set(["mixed", "data-only", "discovery", "last-packets", "refresh", "multi-db"]);
  if (!validModes.has(options.mode)) {
    throw new Error(`Invalid mode "${options.mode}". Expected one of: ${[...validModes].join(", ")}`);
  }

  if (options.prescalers !== null) {
    for (const ps of options.prescalers) {
      if (!Number.isFinite(ps) || ps < 0) {
        throw new Error(`Invalid prescaler value in --prescalers: ${ps}`);
      }
    }
  }

  if (options.users < 1) throw new Error("users must be at least 1");
  if (options.iterations < 1) throw new Error("iterations must be at least 1");
  if (options.timeoutMs < 1) throw new Error("timeout-ms must be at least 1");
  if (options.numDatabases < 1) throw new Error("num-databases must be at least 1");
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function formatMs(value) {
  if (value == null) return "n/a";
  return `${value.toFixed(1)} ms`;
}

function summarizeByEndpoint(results) {
  const grouped = new Map();

  for (const result of results) {
    if (!grouped.has(result.endpoint)) {
      grouped.set(result.endpoint, []);
    }
    grouped.get(result.endpoint).push(result);
  }

  return [...grouped.entries()]
    .map(([endpoint, endpointResults]) => {
      const latencies = endpointResults.map((result) => result.durationMs);
      const failures = endpointResults.filter((result) => !result.ok).length;

      return {
        endpoint,
        count: endpointResults.length,
        failures,
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        max: latencies.length ? Math.max(...latencies) : null,
      };
    })
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint));
}

async function timedRequest(url, endpoint, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();

    return {
      endpoint,
      url,
      ok: response.ok,
      status: response.status,
      durationMs: performance.now() - startedAt,
      bodyLength: text.length,
    };
  } catch (error) {
    return {
      endpoint,
      url,
      ok: false,
      status: null,
      durationMs: performance.now() - startedAt,
      error: error.name === "AbortError" ? "Request timed out" : error.message,
      bodyLength: 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestJson(url, endpoint, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }

    return {
      data: JSON.parse(text),
      durationMs: performance.now() - startedAt,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Build a conservative 20% slice from the end of the full date range (used by data-only mode).
function buildTimeWindow(dateRange) {
  if (!dateRange.minDate || !dateRange.maxDate) return null;

  const min = new Date(dateRange.minDate);
  const max = new Date(dateRange.maxDate);
  const spanMs = max.getTime() - min.getTime();

  if (!Number.isFinite(spanMs) || spanMs <= 0) {
    return { startTime: min.toISOString(), endTime: max.toISOString() };
  }

  const sliceMs = Math.max(Math.floor(spanMs * 0.2), 5 * 60 * 1000);
  const start = new Date(Math.max(min.getTime(), max.getTime() - sliceMs));

  return { startTime: start.toISOString(), endTime: max.toISOString() };
}

// Build /data steps for each Last Packets time window relative to the dataset's maxDate,
// mirroring how the UI calculates startTime/endTime instead of using x=N.
function buildLastPacketsSteps(baseUrl, queryBase, dateRange, prescalerValues) {
  if (!dateRange.maxDate) return [];

  const end = new Date(dateRange.maxDate);
  const minMs = dateRange.minDate ? new Date(dateRange.minDate).getTime() : 0;

  return LAST_PACKETS_WINDOWS.flatMap(({ label, ms }) => {
    const startTime = new Date(Math.max(minMs, end.getTime() - ms)).toISOString();
    const endTime = end.toISOString();

    return prescalerValues.map((ps) => ({
      endpoint: `/data(lp-${label})`,
      url: `${baseUrl}/data/?${queryBase}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&prescaler=${encodeURIComponent(ps)}`,
    }));
  });
}

// Discover up to maxCount database/collection pairs that have timestamped sensor data.
async function discoverWorkloadTargets(options, maxCount) {
  if (options.database && options.collection) {
    return [{ database: options.database, collection: options.collection }];
  }

  if (!process.env.URI) {
    throw new Error("URI is not set in the environment. Add it to .env or pass --database and --collection.");
  }

  const client = new MongoClient(process.env.URI);
  const targets = [];

  try {
    await client.connect();
    const { databases } = await client.db().admin().listDatabases();

    for (const db of databases) {
      if (["admin", "config", "local"].includes(db.name)) continue;
      if (targets.length >= maxCount) break;

      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();

      for (const col of collections) {
        if (targets.length >= maxCount) break;

        const found = await database.collection(col.name).findOne(
          { "Timestamp.time_local": { $exists: true }, type: { $ne: "metadata" } },
          { projection: { _id: 1 } }
        );

        if (found) {
          targets.push({ database: db.name, collection: col.name });
        }
      }
    }
  } finally {
    await client.close();
  }

  if (targets.length === 0) {
    throw new Error("Unable to discover a collection with timestamped sensor data.");
  }

  return targets;
}

async function buildScenario(options) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const prescalerValues = options.prescalers ?? [options.prescaler];
  const maxTargets = options.mode === "multi-db" ? options.numDatabases : 1;

  const targets = await discoverWorkloadTargets(options, maxTargets);

  // Fetch the date range for each discovered target.
  const targetData = [];
  for (const target of targets) {
    const queryBase = `database=${encodeURIComponent(target.database)}&collection=${encodeURIComponent(target.collection)}`;
    const dateRangeUrl = `${baseUrl}/date-range?${queryBase}`;
    const dateRange = (await requestJson(dateRangeUrl, "/date-range", options.timeoutMs)).data;
    targetData.push({ target, queryBase, dateRangeUrl, dateRange });
  }

  const primary = targetData[0];
  const timeWindow = buildTimeWindow(primary.dateRange);

  // Discovery steps — deduplicated since /databases is the same URL regardless of target.
  const allDiscoverySteps = targetData.flatMap(({ target, queryBase, dateRangeUrl }) => [
    { endpoint: "/databases",   url: `${baseUrl}/databases` },
    { endpoint: "/collections", url: `${baseUrl}/collections?database=${encodeURIComponent(target.database)}` },
    { endpoint: "/date-range",  url: dateRangeUrl },
    { endpoint: "/metadata",    url: `${baseUrl}/metadata?database=${encodeURIComponent(target.database)}` },
  ]);
  const discoverySteps = [...new Map(allDiscoverySteps.map((s) => [s.url, s])).values()];

  // Last-packets steps — one step per time window per prescaler per target.
  const lastPacketsSteps = targetData.flatMap(({ queryBase, dateRange }) =>
    buildLastPacketsSteps(baseUrl, queryBase, dateRange, prescalerValues)
  );

  // Legacy x= steps — used by data-only mode as a raw throughput baseline.
  const xDataSteps = prescalerValues.map((ps) => ({
    endpoint: "/data(x)",
    url: `${baseUrl}/data/?${primary.queryBase}&x=${encodeURIComponent(options.xPackets)}&prescaler=${encodeURIComponent(ps)}`,
  }));

  const rangeDataSteps = timeWindow
    ? prescalerValues.map((ps) => ({
        endpoint: "/data(range)",
        url: `${baseUrl}/data/?${primary.queryBase}&startTime=${encodeURIComponent(timeWindow.startTime)}&endTime=${encodeURIComponent(timeWindow.endTime)}&prescaler=${encodeURIComponent(ps)}`,
      }))
    : [];

  // Refresh mode: a single fixed URL for the most recent 1 hour of data from the primary target.
  const refreshUrl = primary.dateRange.maxDate
    ? (() => {
        const endTime = new Date(primary.dateRange.maxDate);
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000).toISOString();
        return `${baseUrl}/data/?${primary.queryBase}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime.toISOString())}&prescaler=${encodeURIComponent(options.prescaler)}`;
      })()
    : null;

  const refreshSteps = refreshUrl
    ? [{ endpoint: "/data(refresh-1h)", url: refreshUrl }]
    : rangeDataSteps;

  const modeSteps = {
    mixed:           [...discoverySteps, ...lastPacketsSteps],
    "data-only":     [...xDataSteps, ...rangeDataSteps],
    discovery:       discoverySteps,
    "last-packets":  lastPacketsSteps.length ? lastPacketsSteps : rangeDataSteps,
    refresh:         refreshSteps,
    "multi-db":      [...discoverySteps, ...lastPacketsSteps],
  };

  const steps = modeSteps[options.mode];

  if (!steps || steps.length === 0) {
    throw new Error(
      `No steps could be built for mode "${options.mode}". Ensure the database has timestamped data.`
    );
  }

  return {
    primaryTarget: primary.target,
    allTargets: targets,
    dateRange: primary.dateRange,
    timeWindow,
    steps,
  };
}

async function runVirtualUser(userId, options, scenario) {
  if (options.rampMs > 0) {
    await sleep(userId * options.rampMs);
  }

  const results = [];

  for (let i = 0; i < options.iterations; i += 1) {
    const step = scenario.steps[Math.floor(Math.random() * scenario.steps.length)];
    results.push(await timedRequest(step.url, step.endpoint, options.timeoutMs));
  }

  return results;
}

function printSummary(options, scenario, results, totalDurationMs) {
  const totalRequests = results.length;
  const failures = results.filter((result) => !result.ok).length;
  const latencies = results.map((result) => result.durationMs);
  const requestsPerSecond = totalDurationMs > 0 ? totalRequests / (totalDurationMs / 1000) : 0;
  const summaryRows = summarizeByEndpoint(results);
  const prescalerDisplay = options.prescalers ? options.prescalers.join(", ") : String(options.prescaler);
  const targetsDisplay = scenario.allTargets.map((t) => `${t.database}/${t.collection}`).join(", ");

  console.log("");
  console.log("Stress test completed");
  console.log("=====================");
  console.log(`Base URL:      ${options.baseUrl}`);
  console.log(`Mode:          ${options.mode}`);
  console.log(`Users:         ${options.users}`);
  console.log(`Iterations:    ${options.iterations}`);
  console.log(`Prescalers:    ${prescalerDisplay}`);
  console.log(`Target(s):     ${targetsDisplay}`);
  console.log(`Requests:      ${totalRequests}`);
  console.log(`Failures:      ${failures}`);
  console.log(`Duration:      ${formatMs(totalDurationMs)}`);
  console.log(`Throughput:    ${requestsPerSecond.toFixed(2)} req/s`);

  if (scenario.timeWindow) {
    console.log(`Time window:   ${scenario.timeWindow.startTime} -> ${scenario.timeWindow.endTime}`);
  }

  console.log("");
  console.log("Per-endpoint summary");
  console.log("--------------------");

  for (const row of summaryRows) {
    console.log(
      `${row.endpoint.padEnd(20)} count=${String(row.count).padStart(3)}  fail=${String(row.failures).padStart(3)}  p50=${formatMs(row.p50).padStart(9)}  p95=${formatMs(row.p95).padStart(9)}  max=${formatMs(row.max).padStart(9)}`
    );
  }

  const errorSamples = results.filter((result) => !result.ok).slice(0, 5);
  if (errorSamples.length) {
    console.log("");
    console.log("Sample failures");
    console.log("---------------");
    for (const failure of errorSamples) {
      console.log(`${failure.endpoint}: status=${failure.status ?? "n/a"} error=${failure.error ?? "HTTP error"} url=${failure.url}`);
    }
  }

  console.log("");
  console.log(
    `Overall latency: p50=${formatMs(percentile(latencies, 50))}, p95=${formatMs(percentile(latencies, 95))}, max=${formatMs(latencies.length ? Math.max(...latencies) : null)}`
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT.trim());
    return;
  }

  validateOptions(options);

  console.log("Preparing stress scenario...");
  const scenario = await buildScenario(options);

  const targetsDisplay = scenario.allTargets.map((t) => `${t.database}/${t.collection}`).join(", ");
  console.log(`Using ${targetsDisplay}`);
  if (scenario.timeWindow) {
    console.log(`Sample time window: ${scenario.timeWindow.startTime} -> ${scenario.timeWindow.endTime}`);
  }
  console.log(`Steps in scenario: ${scenario.steps.length}`);

  const startedAt = performance.now();
  const settled = await Promise.all(
    Array.from({ length: options.users }, (_, userId) => runVirtualUser(userId, options, scenario))
  );
  const totalDurationMs = performance.now() - startedAt;
  const results = settled.flat();

  printSummary(options, scenario, results, totalDurationMs);

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Stress test failed.");
  console.error(error.message);
  process.exitCode = 1;
});
