# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: track-limit.spec.js >> measures max stable track count before slowdown or failure
- Location: tests\browser\track-limit.spec.js:10:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - heading "ear2earth" [level=2] [ref=e3]
    - navigation [ref=e4]:
      - list [ref=e5]:
        - listitem [ref=e6]:
          - button "Quick Tour" [ref=e7] [cursor=pointer]
        - listitem [ref=e8]:
          - link "User Guide" [ref=e9] [cursor=pointer]:
            - /url: user-guide.html
        - listitem [ref=e10]:
          - link "Contributors" [ref=e11] [cursor=pointer]:
            - /url: contributor-guide.html
        - listitem [ref=e12]:
          - link "About" [ref=e13] [cursor=pointer]:
            - /url: "#"
  - main [ref=e14]:
    - region "Main Controls" [ref=e16]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e21]
          - button "Select a Database" [active] [ref=e28] [cursor=pointer]:
            - img [ref=e29]
            - text: Select a Database
          - generic [ref=e33]:
            - generic [ref=e34]: "Earliest: MM/DD/YY"
            - generic [ref=e35]: "Latest: MM/DD/YY"
          - generic [ref=e36]:
            - generic [ref=e37] [cursor=pointer]:
              - img [ref=e38]
              - generic [ref=e43]: Last Packets
            - generic [ref=e44] [cursor=pointer]:
              - img [ref=e45]
              - generic [ref=e50]: Date Range
        - generic [ref=e51]:
          - img [ref=e53]
          - generic [ref=e60]:
            - button "View Metadata" [ref=e61] [cursor=pointer]:
              - img [ref=e62]
              - generic [ref=e66]: View Metadata
            - button "Help" [ref=e67] [cursor=pointer]:
              - img [ref=e68]
        - generic [ref=e72]:
          - img [ref=e74]
          - generic [ref=e81]:
            - generic [ref=e82]: Master Volume
            - slider "Master Volume" [ref=e83]: "0"
          - generic [ref=e84]:
            - button "Play" [ref=e85] [cursor=pointer]:
              - img [ref=e86]
            - button "Stop" [ref=e88] [cursor=pointer]:
              - img [ref=e89]
          - generic [ref=e91]:
            - generic [ref=e92]: BPM
            - slider "BPM" [ref=e93]: "125"
            - generic [ref=e94]: "125"
          - generic [ref=e95]:
            - generic [ref=e96] [cursor=pointer]: 1x
            - generic [ref=e97] [cursor=pointer]: 2x
            - generic [ref=e98] [cursor=pointer]: 4x
            - generic [ref=e99] [cursor=pointer]: 8x
        - generic [ref=e100]:
          - img [ref=e102]
          - generic [ref=e109]:
            - button "Share" [ref=e110] [cursor=pointer]:
              - img [ref=e111]
            - button "Download" [ref=e117] [cursor=pointer]:
              - img [ref=e118]
            - button "Undo" [disabled] [ref=e123]:
              - img [ref=e124]
            - button "Redo" [disabled] [ref=e127]:
              - img [ref=e128]
          - generic [ref=e131]:
            - button "Packet Refresh" [ref=e132] [cursor=pointer]:
              - img [ref=e133]
              - generic [ref=e138]: Packet Refresh
            - button "Help" [ref=e139] [cursor=pointer]:
              - img [ref=e140]
        - generic [ref=e144]:
          - img [ref=e146]
          - button "Clear Space" [disabled] [ref=e154] [cursor=pointer]:
            - img [ref=e155]
            - text: Clear Space
    - generic [ref=e160]:
      - generic [ref=e161] [cursor=pointer]: ×
      - heading "Configure Data Source" [level=3] [ref=e162]
      - generic [ref=e164]: Please select a preset or choose a database and device to retrieve data from.
      - generic [ref=e165]:
        - generic [ref=e166]: "Preset:"
        - combobox "Preset:" [ref=e167]:
          - option "Select a Preset" [selected]
          - option "Cascade Creek"
          - option "WhaleFest"
          - option "OSU Solar Array 1 2025"
          - option "OSU Solar Array 2 2025"
      - generic [ref=e168]:
        - separator [ref=e169]
        - generic [ref=e170]: OR
        - separator [ref=e171]
      - generic [ref=e172]:
        - generic [ref=e173]: "Database:"
        - combobox "Database:" [ref=e174]:
          - option "Select a database" [selected]
      - generic [ref=e175]:
        - generic [ref=e176]: "Device:"
        - combobox "Device:" [ref=e177]:
          - option "Select a device" [selected]
      - button "Confirm" [ref=e178] [cursor=pointer]
    - generic [ref=e183]:
      - generic [ref=e184]:
        - button "×" [ref=e185] [cursor=pointer]
        - generic [ref=e187]:
          - generic [ref=e188]: "Volume:"
          - slider [ref=e189]: "0"
        - generic [ref=e190]:
          - generic [ref=e191]:
            - generic [ref=e192]: "Sensor:"
            - combobox [ref=e193]
          - generic [ref=e194]:
            - generic [ref=e195]: "Reading:"
            - combobox [ref=e196]
        - button "Sound Options ▼" [ref=e197] [cursor=pointer]
      - generic:
        - generic [ref=e201]:
          - generic [ref=e202]: "Volume:"
          - slider [ref=e203]: "0"
        - generic:
          - generic:
            - generic: "Sensor:"
            - combobox [ref=e204]
          - generic:
            - generic: "Reading:"
            - combobox [ref=e205]
        - button "Sound Options ▼" [ref=e206] [cursor=pointer]
    - button "Add Track" [ref=e207] [cursor=pointer]:
      - generic [ref=e208]: Add Track
      - img [ref=e209]
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
  28  |   await page.waitForSelector('#dataSourceModal', { state: 'visible', timeout: 5000 });
  29  | 
  30  |   // Wait for databases to load from the server before selecting
> 31  |   await page.waitForFunction(
      |              ^ Error: page.waitForFunction: Test timeout of 60000ms exceeded.
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