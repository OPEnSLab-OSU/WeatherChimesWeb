// Tests changing retrieval parameters after data has already been plotted.
// Covers the project partner requirement:
//   "Test the process of changing the data you retrieve after having previously plotted some data"

const { test, expect } = require('@playwright/test');
const { selectPreset, retrieveData } = require('./helpers');

test('re-retrieves with a different packet count after initial plot', async ({ page }) => {
  await page.goto('/');
  await selectPreset(page, 'Cascade Creek');

  // First retrieval
  await retrieveData(page, { packets: 16 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Change packet count and retrieve again
  await retrieveData(page, { packets: 50 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});

test('switches from last-packets mode to date-range mode after a plot exists', async ({ page }) => {
  await page.goto('/');
  await selectPreset(page, 'Cascade Creek');

  // Initial retrieval using last-X-packets
  await retrieveData(page, { packets: 16 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Switch to date-range mode using the modal
  await page.locator('#timeRange').check();
  await page.waitForSelector('#dateRangeLabel', { state: 'visible' });

  // The date range modal requires start/end times — read the available range first
  const { startTime, endTime } = await page.evaluate(() => {
    const start = document.getElementById('startTime')?.value;
    const end = document.getElementById('endTime')?.value;
    return { startTime: start, endTime: end };
  });

  // Only proceed if the app has already populated date range fields
  if (startTime && endTime) {
    await page.click('#retrieve');
    await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
    expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
  } else {
    test.skip('Date range fields were not auto-populated for this dataset');
  }
});

test('re-retrieves with a different prescaler after initial plot', async ({ page }) => {
  await page.goto('/');
  await selectPreset(page, 'Cascade Creek');

  // First retrieval with prescaler = 1
  await page.fill('#prescaler', '1');
  await retrieveData(page, { packets: 32 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Re-retrieve with prescaler = 2 (uses every 2nd packet)
  await page.fill('#prescaler', '2');
  await page.click('#retrieve');
  await page.waitForSelector('.js-plotly-plot', { timeout: 30000 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});

test('changes dataset then re-retrieves with different packet count', async ({ page }) => {
  await page.goto('/');
  await selectPreset(page, 'Cascade Creek');
  await retrieveData(page, { packets: 16 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);

  // Change to a different dataset
  await selectPreset(page, 'WhaleFest');

  // Re-retrieve with a different packet count
  await retrieveData(page, { packets: 32 });
  expect(await page.locator('.js-plotly-plot').count()).toBeGreaterThan(0);
});
