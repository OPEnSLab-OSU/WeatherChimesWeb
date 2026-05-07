# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: data-replot.spec.js >> re-retrieves with a different packet count after initial plot
- Location: tests\browser\data-replot.spec.js:8:1

# Error details

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

# Test source

```ts
  1  | // Opens the dataset modal, selects a named preset, waits for the database/device
  2  | // dropdowns to auto-populate, then confirms and closes the modal.
  3  | async function selectPreset(page, presetName) {
  4  |   await page.click('#openPresetModal');
  5  |   await page.waitForSelector('#dataSourceModal', { state: 'visible', timeout: 5000 });
  6  |   await page.selectOption('#modalPreset', { label: presetName });
> 7  |   await page.waitForFunction(() => {
     |              ^ Error: page.waitForFunction: Target page, context or browser has been closed
  8  |     const db = document.getElementById('databases');
  9  |     const dev = document.getElementById('devices');
  10 |     return db && dev && db.value !== 'default' && dev.value !== 'default';
  11 |   }, { timeout: 15000 });
  12 |   await page.click('#confirmDataSource');
  13 |   await page.waitForSelector('#dataSourceModal', { state: 'hidden', timeout: 5000 });
  14 | }
  15 | 
  16 | // Retrieves data using last-X-packets mode and waits for a Plotly chart to render.
  17 | async function retrieveData(page, { packets = 16 } = {}) {
  18 |   await page.locator('#lastXPackets').check();
  19 |   await page.fill('#numpackets', String(packets));
  20 |   await page.click('#retrieve');
  21 |   await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
  22 | }
  23 | 
  24 | // Presets available in the app. Add Wisp / Dendrometer here once those
  25 | // databases are confirmed to exist in the connected MongoDB instance.
  26 | const PRESETS = [
  27 |   'Cascade Creek',
  28 |   'WhaleFest',
  29 |   'OSU Solar Array 1 2025',
  30 |   'OSU Solar Array 2 2025',
  31 | ];
  32 | 
  33 | module.exports = { selectPreset, retrieveData, PRESETS };
  34 | 
```