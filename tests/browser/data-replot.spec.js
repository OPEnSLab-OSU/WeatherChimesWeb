// Tests changing retrieval parameters after data has already been plotted.
// Covers the project partner requirement:
//   "Test the process of changing the data you retrieve after having previously plotted some data"

const { test, expect } = require('@playwright/test');
const { gotoApp, selectPreset, retrieveData, retrieveDataByRange } = require('./helpers');

test('re-retrieves with a different time window after initial plot', async ({ page }) => {
  await gotoApp(page);
  await selectPreset(page, 'Cascade Creek');

  // First retrieval — last 1 week
  await retrieveData(page, { amount: 1, timeframe: 'weeks' });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Re-retrieve with a wider window — last 2 weeks
  await retrieveData(page, { amount: 2, timeframe: 'weeks' });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});

test('switches from last-packets mode to date-range mode after a plot exists', async ({ page }) => {
  await gotoApp(page);
  await selectPreset(page, 'Cascade Creek');

  // Initial retrieval using last-packets modal
  await retrieveData(page, { amount: 1, timeframe: 'weeks' });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Switch to date-range mode using dates from the app's own display
  const retrieved = await retrieveDataByRange(page);
  if (retrieved === null) {
    test.skip(true, 'Date bounds were not populated for this dataset — skipping date-range check');
    return;
  }
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});

test('re-retrieves with a different prescaler after initial plot', async ({ page }) => {
  await gotoApp(page);
  await selectPreset(page, 'Cascade Creek');

  // First retrieval with prescaler = 1
  await retrieveData(page, { amount: 2, timeframe: 'weeks', prescaler: 1 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Re-retrieve with prescaler = 2 (use every 2nd packet)
  await retrieveData(page, { amount: 2, timeframe: 'weeks', prescaler: 2 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});

test('changes dataset then re-retrieves with different time window', async ({ page }) => {
  await gotoApp(page);
  await selectPreset(page, 'Cascade Creek');
  await retrieveData(page, { amount: 1, timeframe: 'weeks' });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Switch to a different dataset and re-retrieve
  await selectPreset(page, 'WhaleFest');
  await retrieveData(page, { amount: 2, timeframe: 'weeks' });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});
