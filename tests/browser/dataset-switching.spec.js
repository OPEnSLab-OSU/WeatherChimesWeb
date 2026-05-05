// Tests retrieving data from multiple distinct datasets, including switching
// between them mid-session without reloading the page.
// Covers the project partner requirements:
//   "Queue up different databases that are not on the same preset"
//   "Wisp, Dendrometer" — add those to PRESETS in helpers.js once confirmed in MongoDB

const { test, expect } = require('@playwright/test');
const { selectPreset, retrieveData, PRESETS } = require('./helpers');

for (const preset of PRESETS) {
  test(`loads and retrieves data for preset: ${preset}`, async ({ page }) => {
    await page.goto('/');
    await selectPreset(page, preset);
    await retrieveData(page, { packets: 16 });

    const chartCount = await page.locator('.js-plotly-plot').count();
    expect(chartCount).toBeGreaterThan(0);
  });
}

test('switches between two different datasets in the same session', async ({ page }) => {
  await page.goto('/');

  // First dataset
  await selectPreset(page, PRESETS[0]);
  await retrieveData(page, { packets: 16 });
  const firstChartCount = await page.locator('.js-plotly-plot').count();
  expect(firstChartCount).toBeGreaterThan(0);

  // Switch to a second dataset without reloading
  await selectPreset(page, PRESETS[1]);
  await retrieveData(page, { packets: 16 });
  const secondChartCount = await page.locator('.js-plotly-plot').count();
  expect(secondChartCount).toBeGreaterThan(0);
});

test('switches between two datasets with multiple tracks active', async ({ page }) => {
  await page.goto('/');

  await selectPreset(page, PRESETS[0]);
  await retrieveData(page, { packets: 16 });

  // Add two extra tracks (3 total)
  await page.click('#addModule');
  await page.waitForFunction(() => document.querySelectorAll('.soundModule').length >= 2);
  await page.click('#addModule');
  await page.waitForFunction(() => document.querySelectorAll('.soundModule').length >= 3);

  // Switch datasets — all tracks should survive the change
  await selectPreset(page, PRESETS[1]);
  await retrieveData(page, { packets: 16 });

  const chartCount = await page.locator('.js-plotly-plot').count();
  expect(chartCount).toBeGreaterThan(0);

  const moduleCount = await page.evaluate(() => document.querySelectorAll('.soundModule').length);
  expect(moduleCount).toBeGreaterThanOrEqual(3);
});
