#!/usr/bin/env node
/**
 * Source Map Extraction Script
 *
 * Downloads an npm package tarball and extracts original source code from
 * embedded source maps (via the `sourcesContent` array in .map files).
 *
 * Usage:
 *   node scripts/extract-sourcemap.mjs @gizatech/luminair-react
 *   node scripts/extract-sourcemap.mjs @gizatech/luminair-react --output ./extracted
 *   node scripts/extract-sourcemap.mjs @gizatech/luminair-web
 *
 * How it works:
 *   1. Fetches the package metadata from the npm registry
 *   2. Downloads the latest tarball
 *   3. Extracts all .map files from the tarball
 *   4. Parses each source map's `sourcesContent` array
 *   5. Writes each original source file to disk, preserving directory structure
 */

import { execSync } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
  Usage: node scripts/extract-sourcemap.mjs <package-name> [--output <dir>]

  Examples:
    node scripts/extract-sourcemap.mjs @gizatech/luminair-react
    node scripts/extract-sourcemap.mjs @gizatech/luminair-react --output ./extracted/luminair
  `);
  process.exit(0);
}

const packageName = args[0];
const outputIdx = args.indexOf('--output');
const outputDir = outputIdx !== -1 && args[outputIdx + 1]
  ? resolve(args[outputIdx + 1])
  : resolve(`./extracted/${packageName.replace(/^@/, '').replace(/\//g, '-')}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function downloadToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  mkdirSync(dirname(dest), { recursive: true });
  const ws = createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body), ws);
  return dest;
}

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n📦 Fetching package metadata for: ${packageName}`);

  // 1. Get package metadata from npm registry
  const meta = await fetchJson(`https://registry.npmjs.org/${packageName}`);
  const latestVersion = meta['dist-tags']?.latest;
  if (!latestVersion) {
    console.error('Could not determine latest version');
    process.exit(1);
  }

  const versionData = meta.versions[latestVersion];
  const tarballUrl = versionData.dist.tarball;
  console.log(`   Version: ${latestVersion}`);
  console.log(`   Tarball: ${tarballUrl}`);

  // 2. Download the tarball
  const tmpDir = resolve('./.tmp-sourcemap-extract');
  mkdirSync(tmpDir, { recursive: true });
  const tarballPath = join(tmpDir, 'package.tgz');

  console.log(`\n⬇️  Downloading tarball...`);
  await downloadToFile(tarballUrl, tarballPath);

  // 3. Extract tarball using tar
  const extractedDir = join(tmpDir, 'extracted');
  mkdirSync(extractedDir, { recursive: true });
  console.log(`\n📂 Extracting tarball...`);
  execSync(`tar xzf "${tarballPath}" -C "${extractedDir}"`, { stdio: 'pipe' });

  // 4. Find all .map files
  const allFiles = walkDir(extractedDir);
  const mapFiles = allFiles.filter(f => f.endsWith('.map'));
  const jsFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));

  console.log(`\n🗺️  Found ${mapFiles.length} source map file(s):`);
  mapFiles.forEach(f => console.log(`   - ${basename(f)}`));

  if (mapFiles.length === 0) {
    // Check if any JS files contain inline source maps
    console.log(`\n🔍 Checking ${jsFiles.length} JS file(s) for inline source maps...`);
    let foundInline = false;

    for (const jsFile of jsFiles) {
      const content = readFileSync(jsFile, 'utf-8');
      const inlineMatch = content.match(/\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,(.+)/);
      if (inlineMatch) {
        foundInline = true;
        console.log(`   ✅ Found inline source map in ${basename(jsFile)}`);
        const mapJson = JSON.parse(Buffer.from(inlineMatch[1], 'base64').toString('utf-8'));
        extractSourcesFromMap(mapJson, basename(jsFile));
      }
    }

    if (!foundInline) {
      console.log('\n⚠️  No source maps found. The package may not publish source maps.');
      console.log('   Listing all files in the package for reference:\n');
      allFiles.forEach(f => console.log(`   ${f.replace(extractedDir + '/', '')}`));
    }
  } else {
    // 5. Extract sourcesContent from each .map file
    for (const mapFile of mapFiles) {
      console.log(`\n🔍 Processing: ${basename(mapFile)}`);
      const mapJson = JSON.parse(readFileSync(mapFile, 'utf-8'));
      extractSourcesFromMap(mapJson, basename(mapFile));
    }
  }

  // 6. Also copy the raw compiled files for reference
  const rawDir = join(outputDir, '__compiled__');
  mkdirSync(rawDir, { recursive: true });
  for (const jsFile of jsFiles) {
    const dest = join(rawDir, basename(jsFile));
    writeFileSync(dest, readFileSync(jsFile));
  }
  // Copy .map files too
  for (const mapFile of mapFiles) {
    const dest = join(rawDir, basename(mapFile));
    writeFileSync(dest, readFileSync(mapFile));
  }

  // Copy .css files
  const cssFiles = allFiles.filter(f => f.endsWith('.css'));
  for (const cssFile of cssFiles) {
    const dest = join(rawDir, basename(cssFile));
    writeFileSync(dest, readFileSync(cssFile));
  }

  // Copy type definitions
  const dtsFiles = allFiles.filter(f => f.endsWith('.d.ts'));
  if (dtsFiles.length > 0) {
    const typesDir = join(outputDir, '__types__');
    mkdirSync(typesDir, { recursive: true });
    for (const dtsFile of dtsFiles) {
      const relPath = dtsFile.replace(extractedDir + '/package/', '');
      const dest = join(typesDir, relPath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, readFileSync(dtsFile));
    }
    console.log(`\n📝 Copied ${dtsFiles.length} type definition file(s) to __types__/`);
  }

  // 7. Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n✅ Done! Extracted sources written to: ${outputDir}\n`);
}

function extractSourcesFromMap(mapJson, mapFileName) {
  const { sources, sourcesContent } = mapJson;

  if (!sources || !sourcesContent) {
    console.log(`   ⚠️  No sourcesContent in ${mapFileName} — this map only contains mappings, not original source.`);
    console.log(`   Sources referenced: ${sources?.length ?? 0}`);
    if (sources) {
      sources.forEach(s => console.log(`     - ${s}`));
    }
    return;
  }

  console.log(`   📄 ${sources.length} source file(s) with embedded content:`);

  let extracted = 0;
  for (let i = 0; i < sources.length; i++) {
    const sourcePath = sources[i];
    const content = sourcesContent[i];

    if (!content) {
      console.log(`     ⏭️  ${sourcePath} (no content — likely external/node_modules)`);
      continue;
    }

    // Clean up the source path (remove webpack:// prefixes, ../ etc.)
    let cleanPath = sourcePath
      .replace(/^webpack:\/\/[^/]*\//, '')
      .replace(/^\.\//g, '')
      .replace(/^\.\.\//, '')
      .replace(/\?[^?]*$/, ''); // remove query strings

    // Skip node_modules sources — we only want the package's own code
    if (cleanPath.includes('node_modules/')) {
      continue;
    }

    const destPath = join(outputDir, cleanPath);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, content, 'utf-8');
    extracted++;
    console.log(`     ✅ ${cleanPath} (${(content.length / 1024).toFixed(1)} KB)`);
  }

  console.log(`   → Extracted ${extracted}/${sources.length} files`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
