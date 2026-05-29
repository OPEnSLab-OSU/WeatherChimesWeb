# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dataset-switching.spec.js >> loads and retrieves data for preset: Cascade Creek
- Location: tests\browser\dataset-switching.spec.js:11:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#dataSourceModal') to be visible
    14 × locator resolved to hidden <div class="modal" id="dataSourceModal">…</div>

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "ear2earth" [level=2] [ref=e3]
    - navigation [ref=e4]:
      - list [ref=e5]:
        - listitem [ref=e6]:
          - button "Quick Tour" [ref=e7] [cursor=pointer]
        - listitem [ref=e8]:
          - link "User Guide" [ref=e9]:
            - /url: user-guide.html
        - listitem [ref=e10]:
          - link "Contributors" [ref=e11]:
            - /url: contributor-guide.html
        - listitem [ref=e12]:
          - link "About" [ref=e13]:
            - /url: "#"
  - main [ref=e14]:
    - region "Main Controls" [ref=e16]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e21]
          - button "Select a Database" [ref=e28] [cursor=pointer]:
            - img [ref=e29]
            - text: Select a Database
          - generic [ref=e33]:
            - generic [ref=e34]: "Earliest: MM/DD/YY"
            - generic [ref=e35]: "Latest: MM/DD/YY"
          - generic [ref=e36]:
            - generic [ref=e37] [cursor=pointer]:
              - img [ref=e38]
              - generic [ref=e42]: Last Packets
            - generic [ref=e43] [cursor=pointer]:
              - img [ref=e44]
              - generic [ref=e46]: Date Range
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: "# of packets:"
              - textbox "# of packets:" [ref=e50] [cursor=pointer]: "16"
            - generic [ref=e51]:
              - generic [ref=e52]: "Use of every:"
              - textbox [ref=e53] [cursor=pointer]: "1"
        - generic [ref=e54]:
          - img [ref=e56]
          - generic [ref=e63]:
            - button "View Metadata" [ref=e64] [cursor=pointer]:
              - img [ref=e65]
              - generic [ref=e69]: View Metadata
            - button "Help" [ref=e70] [cursor=pointer]:
              - img [ref=e71]
        - generic [ref=e73]:
          - img [ref=e75]
          - generic [ref=e82]:
            - generic [ref=e83]: Master Volume
            - slider "Master Volume" [ref=e84]: "0"
          - generic [ref=e85]:
            - button "Play" [ref=e86] [cursor=pointer]:
              - img [ref=e87]
            - button "Stop" [ref=e89] [cursor=pointer]:
              - img [ref=e90]
          - generic [ref=e92]:
            - generic [ref=e93]: BPM
            - slider "BPM" [ref=e94]: "125"
            - generic [ref=e95]: "125"
          - generic [ref=e96]:
            - generic [ref=e97] [cursor=pointer]: 1x
            - generic [ref=e98] [cursor=pointer]: 2x
            - generic [ref=e99] [cursor=pointer]: 4x
            - generic [ref=e100] [cursor=pointer]: 8x
        - generic [ref=e101]:
          - img [ref=e103]
          - generic [ref=e110]:
            - button "Share" [ref=e111] [cursor=pointer]:
              - img [ref=e112]
            - button "Download" [ref=e118] [cursor=pointer]:
              - img [ref=e119]
            - button "Undo" [ref=e123] [cursor=pointer]:
              - img [ref=e124]
            - button "Redo" [ref=e127] [cursor=pointer]:
              - img [ref=e128]
          - generic [ref=e131]:
            - button "Packet Refresh" [ref=e132] [cursor=pointer]:
              - img [ref=e133]
              - generic [ref=e138]: Packet Refresh
            - button "Help" [ref=e139] [cursor=pointer]:
              - img [ref=e140]
        - generic [ref=e142]:
          - img [ref=e144]
          - button "Clear Space" [ref=e152] [cursor=pointer]:
            - img [ref=e153]
            - text: Clear Space
    - button "Add Track" [ref=e160] [cursor=pointer]:
      - generic [ref=e161]: Add Track
      - img [ref=e162]
```

# Test source

```ts
  1   | // Navigates to the app with the onboarding walkthrough pre-dismissed so tests
  2   | // are not blocked by the first-time user flow.
  3   | async function gotoApp(page) {
  4   |   await page.addInitScript(() => {
  5   |     localStorage.setItem('ear2earth-onboarding-v1-complete', 'true');
  6   |   });
  7   |   await page.goto('/');
  8   | }
  9   | 
  10  | // Maps preset names to their exact database/device values.
  11  | // Mirrors the predefinedPairs array in index.js.
  12  | const PRESET_CONFIG = {
  13  |   'Cascade Creek':           { database: 'TEK_Cascade',         device: 'KutiChime13ISOTS' },
  14  |   'WhaleFest':               { database: 'WhaleFest23',          device: 'KhutiChime7' },
  15  |   'OSU Solar Array 1 2025':  { database: 'Summer2025ChimeTest',  device: 'EZ_Power_SD_29_Aug_2' },
  16  |   'OSU Solar Array 2 2025':  { database: 'Summer2025ChimeTest',  device: 'CAP_FIX_29_Aug_1' },
  17  | };
  18  | 
  19  | // Opens the dataset modal and selects a database/device by preset name.
  20  | // Directly selects #databases (fires the change event → fetchDevices) rather than
  21  | // using the preset dropdown, which relies on an async handler that Playwright
  22  | // cannot reliably wait for.
  23  | async function selectPreset(page, presetName) {
  24  |   const config = PRESET_CONFIG[presetName];
  25  |   if (!config) throw new Error(`Unknown preset: ${presetName}`);
  26  | 
  27  |   await page.click('#openPresetModal');
> 28  |   await page.waitForSelector('#dataSourceModal', { state: 'visible', timeout: 5000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  29  | 
  30  |   // Wait for databases to load from the server before selecting
  31  |   await page.waitForFunction(
  32  |     () => (document.getElementById('databases')?.options.length ?? 0) > 1,
  33  |     { timeout: 15000 }
  34  |   );
  35  | 
  36  |   // Selecting #databases fires its change event, which triggers fetchDevices
  37  |   await page.selectOption('#databases', config.database);
  38  | 
  39  |   // Wait for the device list to populate for the selected database
  40  |   await page.waitForFunction(
  41  |     () => (document.getElementById('devices')?.options.length ?? 0) > 1,
  42  |     { timeout: 15000 }
  43  |   );
  44  | 
  45  |   await page.selectOption('#devices', config.device);
  46  |   await page.click('#confirmDataSource');
  47  |   await page.waitForSelector('#dataSourceModal', { state: 'hidden', timeout: 5000 });
  48  | }
  49  | 
  50  | // Retrieves data via the Last Packets modal and waits for a Plotly chart to render.
  51  | // amount + timeframe define the lookback window (e.g. 2 weeks).
  52  | // prescaler filters to every Nth packet.
  53  | async function retrieveData(page, { amount = 2, timeframe = 'weeks', prescaler = 1 } = {}) {
  54  |   await page.click('#lastXPacketsLabel');
  55  |   await page.waitForSelector('#lastXPacketsModal', { state: 'visible', timeout: 5000 });
  56  |   await page.fill('#numericalSelection', String(amount));
  57  |   await page.selectOption('#timeframes', timeframe);
  58  |   await page.fill('#modalPrescaler1', String(prescaler));
  59  |   await page.click('#confirmLastPackets');
  60  |   await page.waitForSelector('#lastXPacketsModal', { state: 'hidden', timeout: 5000 });
  61  |   await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
  62  | }
  63  | 
  64  | // Retrieves data via the Date Range modal using dates read from the app's own
  65  | // earliest/latest date display (populated after a dataset is confirmed).
  66  | // Skips gracefully if the app hasn't populated those values yet.
  67  | async function retrieveDataByRange(page, { prescaler = 1 } = {}) {
  68  |   const dates = await page.evaluate(() => {
  69  |     const earliest = document.getElementById('earliestDateDisplay')?.textContent?.replace('Earliest: ', '').trim();
  70  |     const latest = document.getElementById('latestDateDisplay')?.textContent?.replace('Latest: ', '').trim();
  71  |     return { earliest, latest };
  72  |   });
  73  | 
  74  |   if (!dates.earliest || !dates.latest || dates.earliest === 'MM/DD/YY') {
  75  |     return null;
  76  |   }
  77  | 
  78  |   await page.click('#dateRangeLabel');
  79  |   await page.waitForSelector('#dateTimeModal', { state: 'visible', timeout: 5000 });
  80  | 
  81  |   const toDatetimeLocal = (mmddyy) => {
  82  |     const [m, d, y] = mmddyy.split('/');
  83  |     return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00`;
  84  |   };
  85  | 
  86  |   await page.fill('#modalStartTime', toDatetimeLocal(dates.earliest));
  87  |   await page.fill('#modalEndTime', toDatetimeLocal(dates.latest));
  88  |   await page.fill('#modalPrescaler', String(prescaler));
  89  |   await page.click('#confirmDateTime');
  90  |   await page.waitForSelector('#dateTimeModal', { state: 'hidden', timeout: 5000 });
  91  |   await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
  92  |   return true;
  93  | }
  94  | 
  95  | // Presets available in the app. Add Wisp / Dendrometer here once those
  96  | // databases are confirmed to exist in the connected MongoDB instance.
  97  | const PRESETS = [
  98  |   'Cascade Creek',
  99  |   'WhaleFest',
  100 |   'OSU Solar Array 1 2025',
  101 |   'OSU Solar Array 2 2025',
  102 | ];
  103 | 
  104 | module.exports = { gotoApp, selectPreset, retrieveData, retrieveDataByRange, PRESETS };
  105 | 
```