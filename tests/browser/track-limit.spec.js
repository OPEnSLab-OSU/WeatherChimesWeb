// Stress test: measures how many sound tracks can be added and remain responsive.
// Covers the project partner requirement: "See how many tracks we can create and sonify"

const { test, expect } = require('@playwright/test');
const { selectPreset, retrieveData } = require('./helpers');

const MAX_TRACKS_TO_TRY = 20;
const PER_TRACK_TIMEOUT_MS = 5000;

test('measures max stable track count before slowdown or failure', async ({ page }) => {
  await page.goto('/');
  await selectPreset(page, 'Cascade Creek');
  await retrieveData(page, { packets: 16 });

  const timings = [];

  // One module already exists on startup; start counting from 1
  let trackCount = 1;

  for (let i = 0; i < MAX_TRACKS_TO_TRY - 1; i++) {
    const before = Date.now();
    await page.click('#addModule');
    trackCount++;

    try {
      await page.waitForFunction(
        (expected) => document.querySelectorAll('.soundModule').length >= expected,
        trackCount,
        { timeout: PER_TRACK_TIMEOUT_MS }
      );
      timings.push({ track: trackCount, ms: Date.now() - before, ok: true });
    } catch {
      timings.push({ track: trackCount, ms: PER_TRACK_TIMEOUT_MS, ok: false });
      console.log(`Track ${trackCount} timed out — stopping`);
      break;
    }
  }

  const successful = timings.filter((t) => t.ok);
  console.log('\nTrack addition timings:');
  timings.forEach(({ track, ms, ok }) =>
    console.log(`  Track ${String(track).padStart(2)}: ${String(ms).padStart(5)}ms  ${ok ? 'OK' : 'TIMEOUT'}`)
  );
  console.log(`\nMax stable track count: ${successful.at(-1)?.track ?? 0}`);

  // At minimum, expect the app to handle 5 tracks without timing out
  expect(successful.length).toBeGreaterThanOrEqual(5);
});
