/**
 * Automated asset capture using Playwright.
 *
 * Usage:
 *   npx playwright install chromium   # first time only
 *   npx tsx scripts/capture-assets.ts
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3100
 *   - `playwright` and `tsx` installed as dev deps
 *
 * Outputs go to docs/assets/
 */

import { chromium, type Page, type Browser } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = join(__dirname, '..', 'docs', 'assets');

// Ensure output dirs exist
const dirs = ['screenshots', 'social', 'thumbnails', 'favicon'];
for (const d of dirs) {
  const p = join(OUT, d);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

/** Wait for the WebGL canvas to be present and simulation to settle */
async function waitForVisualization(page: Page, timeout = 15_000) {
  await page.waitForSelector('canvas', { timeout });
  // Give the force simulation time to settle and bloom to render
  await page.waitForTimeout(4000);
}

/** Capture a screenshot at a given viewport */
async function captureScreenshot(
  page: Page,
  url: string,
  viewport: { width: number; height: number },
  outputPath: string,
  options?: { waitMs?: number; fullPage?: boolean },
) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'networkidle' });
  await waitForVisualization(page);
  if (options?.waitMs) await page.waitForTimeout(options.waitMs);
  await page.screenshot({
    path: outputPath,
    fullPage: options?.fullPage ?? false,
    type: 'png',
  });
  console.log(`  ✓ ${outputPath}`);
}

/** Record a video clip */
async function recordClip(
  browser: Browser,
  url: string,
  viewport: { width: number; height: number },
  outputDir: string,
  durationMs: number,
) {
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: outputDir, size: viewport },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await waitForVisualization(page);
  await page.waitForTimeout(durationMs);
  await context.close(); // saves the video
  console.log(`  ✓ Video saved to ${outputDir}/`);
}

// Demo template configs — match these to your actual route paths
const DEMO_TEMPLATES = [
  { name: 'world', route: '/world', label: 'Live Network' },
  { name: 'agents', route: '/agents', label: 'AI Agents' },
  { name: 'embed', route: '/embed', label: 'Embeddable' },
];

async function main() {
  console.log('🎬 Capturing hero media assets...');
  console.log(`   Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // ── Feature Screenshots ──────────────────────────────────────────
  console.log('📸 Feature screenshots');

  await captureScreenshot(
    page,
    `${BASE_URL}/world`,
    { width: 1920, height: 1080 },
    join(OUT, 'screenshots', 'dark-full.png'),
  );

  await captureScreenshot(
    page,
    `${BASE_URL}/world`,
    { width: 390, height: 844 },
    join(OUT, 'screenshots', 'mobile.png'),
  );

  await captureScreenshot(
    page,
    `${BASE_URL}/world`,
    { width: 800, height: 450 },
    join(OUT, 'screenshots', 'hero-still.png'),
  );

  // ── Demo Thumbnails ──────────────────────────────────────────────
  console.log('\n🖼️  Demo thumbnails');

  for (const demo of DEMO_TEMPLATES) {
    await captureScreenshot(
      page,
      `${BASE_URL}${demo.route}`,
      { width: 800, height: 600 },
      join(OUT, 'thumbnails', `${demo.name}.png`),
    );
  }

  // ── Social Media Videos ──────────────────────────────────────────
  console.log('\n🎥 Social media videos');

  // "The Overview" — 15s square clip for social
  await recordClip(
    browser,
    `${BASE_URL}/world`,
    { width: 1080, height: 1080 },
    join(OUT, 'social'),
    15_000,
  );

  // "The Overview" — 16:9 for YouTube/blog
  await recordClip(
    browser,
    `${BASE_URL}/world`,
    { width: 1920, height: 1080 },
    join(OUT, 'social'),
    15_000,
  );

  // ── Favicon capture from dynamic route ───────────────────────────
  console.log('\n🔖 Favicons from dynamic routes');

  for (const { route, size, name } of [
    { route: '/icon', size: { width: 32, height: 32 }, name: 'favicon-32x32.png' },
    { route: '/apple-icon', size: { width: 180, height: 180 }, name: 'apple-touch-icon.png' },
    { route: '/icon-192', size: { width: 192, height: 192 }, name: 'icon-192.png' },
    { route: '/icon-512', size: { width: 512, height: 512 }, name: 'icon-512.png' },
  ]) {
    await page.setViewportSize(size);
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load' });
    if (response) {
      const buffer = await response.body();
      const { writeFileSync } = await import('fs');
      writeFileSync(join(OUT, 'favicon', name), buffer);
      console.log(`  ✓ ${name}`);
    }
  }

  // ── OG Image capture ─────────────────────────────────────────────
  console.log('\n🌐 OG image');

  await page.setViewportSize({ width: 1200, height: 630 });
  const ogResponse = await page.goto(`${BASE_URL}/opengraph-image`, { waitUntil: 'load' });
  if (ogResponse) {
    const { writeFileSync } = await import('fs');
    writeFileSync(join(OUT, 'og-image.png'), await ogResponse.body());
    console.log('  ✓ og-image.png');
  }

  await browser.close();

  console.log('\n✅ All assets captured!');
  console.log(`   Output directory: ${OUT}`);
  console.log('\nPost-processing tips:');
  console.log('  Hero GIF:  ffmpeg -i social/overview.webm -vf "fps=15,scale=800:450" -loop 0 hero.gif');
  console.log('  Optimize:  gifsicle --optimize=3 --lossy=80 hero.gif -o hero.gif');
  console.log('  MP4:       ffmpeg -i social/overview.webm -c:v libx264 -crf 18 -preset slow hero.mp4');
}

main().catch((err) => {
  console.error('Asset capture failed:', err);
  process.exit(1);
});
