// Navigates to the app with the onboarding walkthrough pre-dismissed so tests
// are not blocked by the first-time user flow.
async function gotoApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ear2earth-onboarding-v1-complete', 'true');
  });
  await page.goto('/');
}

// Maps preset names to their exact database/device values.
// Mirrors the predefinedPairs array in index.js.
const PRESET_CONFIG = {
  'Cascade Creek':           { database: 'TEK_Cascade',         device: 'KutiChime13ISOTS' },
  'WhaleFest':               { database: 'WhaleFest23',          device: 'KhutiChime7' },
  'OSU Solar Array 1 2025':  { database: 'Summer2025ChimeTest',  device: 'EZ_Power_SD_29_Aug_2' },
  'OSU Solar Array 2 2025':  { database: 'Summer2025ChimeTest',  device: 'CAP_FIX_29_Aug_1' },
};

// Opens the dataset modal and selects a database/device by preset name.
// Directly selects #databases (fires the change event → fetchDevices) rather than
// using the preset dropdown, which relies on an async handler that Playwright
// cannot reliably wait for.
async function selectPreset(page, presetName) {
  const config = PRESET_CONFIG[presetName];
  if (!config) throw new Error(`Unknown preset: ${presetName}`);

  await page.click('#openPresetModal');
  await page.waitForSelector('#dataSourceModal', { state: 'visible', timeout: 5000 });

  // Wait for databases to load from the server before selecting
  await page.waitForFunction(
    () => (document.getElementById('databases')?.options.length ?? 0) > 1,
    { timeout: 15000 }
  );

  // Selecting #databases fires its change event, which triggers fetchDevices
  await page.selectOption('#databases', config.database);

  // Wait for the device list to populate for the selected database
  await page.waitForFunction(
    () => (document.getElementById('devices')?.options.length ?? 0) > 1,
    { timeout: 15000 }
  );

  await page.selectOption('#devices', config.device);
  await page.click('#confirmDataSource');
  await page.waitForSelector('#dataSourceModal', { state: 'hidden', timeout: 5000 });
}

// Retrieves data via the Last Packets modal and waits for a Plotly chart to render.
// amount + timeframe define the lookback window (e.g. 2 weeks).
// prescaler filters to every Nth packet.
async function retrieveData(page, { amount = 2, timeframe = 'weeks', prescaler = 1 } = {}) {
  await page.click('#lastXPacketsLabel');
  await page.waitForSelector('#lastXPacketsModal', { state: 'visible', timeout: 5000 });
  await page.fill('#numericalSelection', String(amount));
  await page.selectOption('#timeframes', timeframe);
  await page.fill('#modalPrescaler1', String(prescaler));
  await page.click('#confirmLastPackets');
  await page.waitForSelector('#lastXPacketsModal', { state: 'hidden', timeout: 5000 });
  await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
}

// Retrieves data via the Date Range modal using dates read from the app's own
// earliest/latest date display (populated after a dataset is confirmed).
// Skips gracefully if the app hasn't populated those values yet.
async function retrieveDataByRange(page, { prescaler = 1 } = {}) {
  const dates = await page.evaluate(() => {
    const earliest = document.getElementById('earliestDateDisplay')?.textContent?.replace('Earliest: ', '').trim();
    const latest = document.getElementById('latestDateDisplay')?.textContent?.replace('Latest: ', '').trim();
    return { earliest, latest };
  });

  if (!dates.earliest || !dates.latest || dates.earliest === 'MM/DD/YY') {
    return null;
  }

  await page.click('#dateRangeLabel');
  await page.waitForSelector('#dateTimeModal', { state: 'visible', timeout: 5000 });

  const toDatetimeLocal = (mmddyy) => {
    const [m, d, y] = mmddyy.split('/');
    return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00`;
  };

  await page.fill('#modalStartTime', toDatetimeLocal(dates.earliest));
  await page.fill('#modalEndTime', toDatetimeLocal(dates.latest));
  await page.fill('#modalPrescaler', String(prescaler));
  await page.click('#confirmDateTime');
  await page.waitForSelector('#dateTimeModal', { state: 'hidden', timeout: 5000 });
  await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
  return true;
}

// Presets available in the app. Add Wisp / Dendrometer here once those
// databases are confirmed to exist in the connected MongoDB instance.
const PRESETS = [
  'Cascade Creek',
  'WhaleFest',
  'OSU Solar Array 1 2025',
  'OSU Solar Array 2 2025',
];

module.exports = { gotoApp, selectPreset, retrieveData, retrieveDataByRange, PRESETS };
