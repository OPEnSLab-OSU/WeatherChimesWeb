// Opens the dataset modal, selects a named preset, waits for the database/device
// dropdowns to auto-populate, then confirms and closes the modal.
async function selectPreset(page, presetName) {
  await page.click('#openPresetModal');
  await page.waitForSelector('#dataSourceModal', { state: 'visible', timeout: 5000 });
  await page.selectOption('#modalPreset', { label: presetName });
  await page.waitForFunction(() => {
    const db = document.getElementById('databases');
    const dev = document.getElementById('devices');
    return db && dev && db.value !== 'default' && dev.value !== 'default';
  }, { timeout: 15000 });
  await page.click('#confirmDataSource');
  await page.waitForSelector('#dataSourceModal', { state: 'hidden', timeout: 5000 });
}

// Retrieves data using last-X-packets mode and waits for a Plotly chart to render.
async function retrieveData(page, { packets = 16 } = {}) {
  await page.locator('#lastXPackets').check();
  await page.fill('#numpackets', String(packets));
  await page.click('#retrieve');
  await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
}

// Presets available in the app. Add Wisp / Dendrometer here once those
// databases are confirmed to exist in the connected MongoDB instance.
const PRESETS = [
  'Cascade Creek',
  'WhaleFest',
  'OSU Solar Array 1 2025',
  'OSU Solar Array 2 2025',
];

module.exports = { selectPreset, retrieveData, PRESETS };
