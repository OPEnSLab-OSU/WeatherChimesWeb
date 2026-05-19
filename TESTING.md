# Ear2Earth — Testing Guide

This project has two separate test suites that serve different purposes. This guide explains what each one does, how to set it up, how to run it, and how to extend it.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [API Load Tests](#api-load-tests)
  - [How It Works](#how-it-works-api)
  - [Running the Tests](#running-api-tests)
  - [CLI Options](#cli-options)
  - [Reading the Output](#reading-api-output)
- [Browser UI Tests](#browser-ui-tests)
  - [How It Works](#how-it-works-browser)
  - [First-Time Setup](#first-time-setup)
  - [Running the Tests](#running-browser-tests)
  - [Test Files](#test-files)
  - [Reading the Report](#reading-the-report)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)

---

## Overview

| Suite | Tool | What it tests | Needs server? | Needs browser? |
|---|---|---|---|---|
| API Load Tests | Node.js script | Server endpoints under concurrent load | Yes | No |
| Browser UI Tests | Playwright | Real user workflows in actual browsers | Yes (auto-started) | Yes (auto-managed) |

Both suites require the server to be running and a `.env` file with a valid MongoDB `URI`. See the [Developer Setup](README.md#developer-setup) section in the README for those steps.

---

## Prerequisites

Before running either suite:

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Create a `.env` file** at the project root:
   ```
   URI=mongodb+srv://<username>:<password>@<cluster>.<id>.mongodb.net/...
   ```

3. **For browser tests only** — install Playwright's browser binaries:
   ```bash
   npx playwright install
   ```
   This downloads Chromium, Firefox, and WebKit (~500 MB total). Only needs to be done once per machine, or after a Playwright version update.

---

## API Load Tests

### How It Works (API)

`scripts/stress-test.js` is a Node.js script that simulates multiple concurrent users hitting the Express server's REST API endpoints directly — no browser involved. It is purely a backend load test.

Each virtual user fires a series of HTTP requests to:
- `GET /databases`
- `GET /collections`
- `GET /date-range`
- `GET /metadata`
- `GET /data` (by packet count and by time range)

Users are staggered by a configurable ramp delay so load increases gradually rather than all at once. After all users complete, the script prints a summary with latency percentiles (p50/p95/max), failure counts, and throughput.

### Running API Tests

> **The server must be running before you execute the stress test.** The script sends real HTTP requests to `http://localhost:3000` — if the server is not up, every request will fail immediately with `fetch failed`.

**Step 1** — Start the server in one terminal:
```bash
node server.js
```

**Step 2** — Run a test preset in a second terminal:
```bash
# Default: 10 users, 5 iterations each, mixed mode
npm run stress:test

# Burst: 25 users, faster ramp
npm run stress:burst

# Heavy: 60 users, large payload, fast ramp
npm run stress:heavy
```

### CLI Options

You can also run the script directly with any combination of flags:

```bash
node scripts/stress-test.js [options]

Options:
  --users <n>         Number of concurrent virtual users (default: 10)
  --iterations <n>    Requests per user (default: 5)
  --ramp-ms <ms>      Delay between starting each user (default: 150)
  --timeout-ms <ms>   Per-request timeout (default: 15000)
  --x-packets <n>     Packet count for /data requests (default: 250)
  --prescaler <n>     Single prescaler value (default: 1)
  --prescalers <list> Comma-separated prescaler values, e.g. 1,2,4,8
                      Creates a /data step per value, varying load across users
  --mode <name>       Workload profile: mixed | data-only | discovery (default: mixed)
  --database <name>   Target a specific database (skips auto-discovery)
  --collection <name> Target a specific collection (skips auto-discovery)
```

**Mode descriptions:**

| Mode | Endpoints hit |
|---|---|
| `mixed` | All endpoints — closest to real user behavior |
| `data-only` | `/data` only — maximum pressure on the heaviest endpoint |
| `discovery` | `/databases`, `/collections`, `/date-range`, `/metadata` only |

**Example — vary prescalers across 30 simultaneous users:**
```bash
node scripts/stress-test.js --users 30 --prescalers 1,2,4,8
```

### Reading API Output

```
Stress test completed
=====================
Base URL:      http://localhost:3000
Mode:          mixed
Users:         10
Iterations:    5
Prescalers:    1
Target data:   MyDatabase/MyCollection
Requests:      50
Failures:      0
Duration:      3241.2 ms
Throughput:    15.43 req/s

Per-endpoint summary
--------------------
/collections   count= 10  fail=  0  p50=  142.3 ms  p95=  310.5 ms  max=  412.0 ms
/data(range)   count= 10  fail=  0  p50=  890.1 ms  p95= 1823.4 ms  max= 2100.2 ms
/data(x)       count= 10  fail=  0  p50=  780.4 ms  p95= 1650.0 ms  max= 1980.3 ms
/databases     count= 10  fail=  0  p50=   98.2 ms  p95=  201.4 ms  max=  290.1 ms
/date-range    count= 10  fail=  0  p50=  110.3 ms  p95=  230.0 ms  max=  310.4 ms
/metadata      count= 10  fail=  0  p50=  130.1 ms  p95=  270.2 ms  max=  350.0 ms
```

- **p50** — half of requests completed faster than this. A good median target.
- **p95** — 95% of requests completed faster than this. High values here indicate occasional slow responses.
- **max** — the single slowest request. Useful for spotting outliers.
- **Failures** — HTTP errors or timeouts. A non-zero value means the server is dropping requests under this load.

---

## Browser UI Tests

### How It Works (Browser)

`tests/browser/` contains Playwright tests that control real browsers (Chromium, Firefox, WebKit, mobile Chrome, mobile Safari) and simulate actual user interactions — clicking buttons, filling inputs, waiting for charts to render.

These tests cover what the API load tests cannot: the frontend, Tone.js audio pipeline, Plotly charts, and multi-track behavior.

Playwright automatically starts `node server.js` before the tests run (and reuses it if it is already running), so you do not need to start the server manually for browser tests.

### First-Time Setup

After cloning the repo and running `npm install`, download the browser binaries once:
```bash
npx playwright install
```

If you update `@playwright/test` in the future, run this again to get the matching browser versions.

### Running Browser Tests

```bash
# Run all tests across all 5 browser/device configurations
npm run test:browser

# Run only on one browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari

# Run a single test file
npx playwright test tests/browser/track-limit.spec.js

# Open the visual HTML report after a run
npm run test:browser:report
```

### Test Files

#### `tests/browser/helpers.js`

Shared utility functions used by all test files. If the UI changes in a way that affects how tests interact with the app, this is usually the only file that needs updating.

- **`gotoApp(page)`** — navigates to the app with the onboarding walkthrough pre-dismissed so tests are not blocked by the first-time user flow.

- **`selectPreset(page, presetName)`** — opens the dataset modal, selects a database and device by preset name, and confirms. Uses the `#databases` dropdown directly (which fires `fetchDevices`) rather than the preset dropdown, which has an async handler that Playwright cannot reliably wait for.

- **`retrieveData(page, { amount, timeframe, prescaler })`** — opens the Last Packets modal, fills in the time window and prescaler, and clicks Retrieve Data. Waits for a Plotly chart to appear before returning.
  - `amount` — how many of the time unit to look back (default: `2`)
  - `timeframe` — `'minutes'` | `'hours'` | `'days'` | `'weeks'` | `'months'` (default: `'weeks'`)
  - `prescaler` — use every Nth packet (default: `1`)

- **`retrieveDataByRange(page, { prescaler })`** — opens the Date Range modal using the earliest/latest dates the app has already computed for the current dataset. Returns `null` if the app has not yet populated those dates.

- **`PRESETS`** — array of available dataset names. Update this and `PRESET_CONFIG` when new datasets are added to the app's `predefinedPairs` in `index.js`.

#### `tests/browser/track-limit.spec.js`

Answers the question: **how many sound tracks can be added before the app slows down or breaks?**

- Loads a dataset, retrieves data, then adds tracks one by one up to 20.
- Times each addition and stops if one exceeds the threshold.
- Logs a full timing table and the maximum stable track count.
- Asserts that at least 5 tracks work without timing out (baseline sanity check).

#### `tests/browser/dataset-switching.spec.js`

Tests **loading data from multiple different datasets**, including switching between them mid-session.

- Runs one test per preset to verify each dataset loads and renders a chart.
- Tests switching from one dataset to another without reloading the page.
- Tests switching datasets while multiple tracks are already active.

To add any other dataset: add an entry to `PRESET_CONFIG` and `PRESETS` in `helpers.js`, matching the database and device names exactly as they appear in MongoDB.

#### `tests/browser/data-replot.spec.js`

Tests **changing retrieval parameters after data has already been plotted** — simulating a user who retrieves data and then adjusts their query.

- Re-retrieves with a different time window (e.g., 1 week → 2 weeks).
- Switches from Last Packets mode to Date Range mode.
- Re-retrieves with a different prescaler value.
- Changes to a different dataset and re-retrieves.

### Reading the Report

After running `npm run test:browser:report`, a browser window opens with a full HTML report showing:

- Pass/fail status per test per browser
- Time taken per test
- Screenshots captured on failure
- The exact error and line that caused each failure

The `test-results/` and `playwright-report/` directories are listed in `.gitignore` and should not be committed.

---

## Adding New Tests

### Adding a new browser test

1. Create a new file in `tests/browser/` named `your-test.spec.js`.
2. Import the helpers you need:
   ```js
   const { test, expect } = require('@playwright/test');
   const { gotoApp, selectPreset, retrieveData } = require('./helpers');
   ```
3. Write your test using `gotoApp` before any interaction and `selectPreset` + `retrieveData` to get data loaded:
   ```js
   test('your test description', async ({ page }) => {
     await gotoApp(page);
     await selectPreset(page, 'Cascade Creek');
     await retrieveData(page, { amount: 1, timeframe: 'weeks' });
     // your assertions here
   });
   ```
4. Run it in isolation first: `npx playwright test tests/browser/your-test.spec.js --project=chromium`

### Adding a new dataset to browser tests

1. Confirm the database and collection names exist in MongoDB.
2. Open `tests/browser/helpers.js` and add an entry to `PRESET_CONFIG`:
   ```js
   'Your Preset Name': { database: 'YourDatabase', device: 'YourCollection' },
   ```
3. Add the name to the `PRESETS` array if you want it included in the `dataset-switching` loop.
4. Optionally add it to `predefinedPairs` in `index.js` so it appears in the app's UI as well.

### Adding a new API load test scenario

Add a new npm script to `package.json` pointing to `stress-test.js` with your preferred flags:
```json
"stress:your-scenario": "node scripts/stress-test.js --users 50 --mode data-only --prescalers 1,4,16"
```

---

## Troubleshooting

**`browserType.launch: Executable doesn't exist`**
Run `npx playwright install --force` to re-download the browser binaries.

**Tests fail immediately on the first `selectPreset` call**
The dataset modal is not opening. Check that `node server.js` is running and reachable at `http://localhost:3000`. Playwright's `webServer` config will auto-start it, but if another process is already on port 3000 and it is not the Ear2Earth server, the tests will fail.

**`waitForFunction` timeout on `#devices`**
The device dropdown did not populate. This means `fetchDevices` did not complete — usually because the database name in `PRESET_CONFIG` does not exactly match what is stored in MongoDB. Verify the spelling in `helpers.js`.

**All tests pass on Chromium but fail on Firefox or WebKit**
Firefox/WebKit binaries may not be installed. Run `npx playwright install firefox webkit`.

**API stress test shows high failure rate**
- Check that `node server.js` is running.
- Try reducing `--users` and `--iterations` to find the load level where failures begin.
- Check the MongoDB connection — the URI in `.env` may be rate-limited or the cluster may be paused.

**`No report found` when running `npm run test:browser:report`**
The HTML report is only written after a full test run. Run `npm run test:browser` first, then open the report.
