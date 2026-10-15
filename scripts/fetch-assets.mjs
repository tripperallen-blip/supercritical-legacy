import { access, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://supercritical.one';
const UPLOADS = `${ORIGIN}/wp-content/uploads/`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'public/assets');

const NAMED = [
  ['2025/03/SCT-Logo-Horizontal-1000.png', 'brand/SCT-Logo-Horizontal-1000.png'],
  ['2024/11/SCT-Logo-Horizontal-500-white-1.png', 'brand/SCT-Logo-Horizontal-500-white-1.png'],
  ['2024/11/SCT-Logo-Horizontal-500-white.png', 'brand/SCT-Logo-Horizontal-500-white.png'],
  ['2025/03/SCT-Logo-Vertical-1000-white.png', 'brand/SCT-Logo-Vertical-1000-white.png'],
  ['2024/11/SCT-favicon.png', 'brand/SCT-favicon.png'],
  ['2024/11/cropped-SCT-favicon.png', 'brand/cropped-SCT-favicon.png'],
  ['2026/01/VIDEO-2026-01-14-12-30-01.mp4', 'VIDEO-2026-01-14-12-30-01.mp4'],
];

const PAGES = [
  '/',
  '/technology/',
  '/contact-us/',
  '/about-us__trashed/our-team/',
  '/investors__trashed/news/',
  '/supercritical-materials-licenses-patented-uranium-and-critical-materials-extraction-technology/',
];

const failures = [];

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function uploadRel(raw) {
  const value = decodeHtml(raw).trim();
  if (!value || value.startsWith('data:')) return null;
  let url;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return null;
  }
  const marker = '/wp-content/uploads/';
  const index = url.pathname.indexOf(marker);
  if (index === -1) return null;
  const rel = decodeURIComponent(url.pathname.slice(index + marker.length));
  if (!rel || rel.includes('..') || rel.includes('*')) return null;
  if (!/\.[a-z0-9]+$/i.test(rel)) return null;
  return rel;
}

function canonicalRel(rel) {
  return rel.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function basenamesUnder(dir) {
  const names = new Set();
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) await walk(path.join(current, entry.name));
      else names.add(entry.name);
    }
  }
  await walk(dir);
  return names;
}

async function download(rel, dest) {
  const url = UPLOADS + rel;
  if (await exists(dest)) {
    console.log(`skip  ${rel}`);
    return 'skipped';
  }
  const partial = `${dest}.partial`;
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'supercritical-legacy-asset-fetch' },
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
    await rename(partial, dest);
    console.log(`saved ${rel} -> ${path.relative(ROOT, dest)}`);
    return 'saved';
  } catch (error) {
    await rm(partial, { force: true });
    const reason = error instanceof Error ? error.message : String(error);
    failures.push(`${url} (${reason})`);
    console.log(`fail  ${rel} (${reason})`);
    return 'failed';
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return match ? decodeHtml(match[2] ?? match[3] ?? '') : '';
}

function stylesheetLinks(html, pageUrl) {
  const links = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const href = attr(tag, 'href');
    if (!href) continue;
    const rel = attr(tag, 'rel').toLowerCase();
    const as = attr(tag, 'as').toLowerCase();
    if (rel.includes('stylesheet') || as === 'style' || /\.css(\?|$)/i.test(href)) {
      links.push(new URL(href, pageUrl).href);
    }
  }
  return links;
}

function cssImports(css, baseUrl) {
  const links = [];
  const pattern = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/gi;
  for (const match of css.matchAll(pattern)) {
    try {
      links.push(new URL(match[1], baseUrl).href);
    } catch {
      // Ignore malformed import targets.
    }
  }
  return links;
}

function uploadsInText(text) {
  const found = new Set();
  const pattern = /(?:https?:)?\/\/[^"'()\s]+\/wp-content\/uploads\/[^"'()\s]+|\/wp-content\/uploads\/[^"'()\s]+/gi;
  for (const match of text.matchAll(pattern)) {
    const rel = uploadRel(match[0].replace(/[),;]+$/, ''));
    if (rel) found.add(rel);
  }
  return found;
}

function uploadsInCss(css, baseUrl) {
  const found = uploadsInText(css);
  const pattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  for (const match of css.matchAll(pattern)) {
    const raw = match[2].trim();
    if (raw.startsWith('data:')) continue;
    try {
      const rel = uploadRel(new URL(raw, baseUrl).href);
      if (rel) found.add(rel);
    } catch {
      // Ignore unresolved CSS urls.
    }
  }
  return found;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'supercritical-legacy-asset-fetch' },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function main() {
  for (const [rel, dest] of NAMED) {
    await download(rel, path.join(ASSETS, dest));
  }

  const found = new Set();
  const stylesheets = new Set();
  const queue = [];

  for (const page of PAGES) {
    const pageUrl = new URL(page, ORIGIN).href;
    try {
      const html = await fetchText(pageUrl);
      for (const rel of uploadsInText(html)) found.add(rel);
      for (const href of stylesheetLinks(html, pageUrl)) {
        if (!stylesheets.has(href)) queue.push(href);
      }
      console.log(`page  ${pageUrl}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${pageUrl} (${reason})`);
      console.log(`fail  page ${pageUrl} (${reason})`);
    }
  }

  while (queue.length) {
    const href = queue.shift();
    if (stylesheets.has(href)) continue;
    stylesheets.add(href);
    try {
      const css = await fetchText(href);
      for (const rel of uploadsInCss(css, href)) found.add(rel);
      for (const imported of cssImports(css, href)) {
        if (!stylesheets.has(imported)) queue.push(imported);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${href} (${reason})`);
      console.log(`fail  css ${href} (${reason})`);
    }
  }

  const listed = [...found].sort();
  console.log(`\nFound ${listed.length} wp-content/uploads URLs across ${PAGES.length} pages and ${stylesheets.size} stylesheets:`);
  for (const rel of listed) console.log(`  ${UPLOADS}${rel}`);

  const namedRels = new Set(NAMED.map(([rel]) => rel));
  const have = await basenamesUnder(ASSETS);
  const canonical = [...new Set(listed.map(canonicalRel))].sort();
  console.log(`\nCanonical uploads to consider: ${canonical.length}`);

  for (const rel of canonical) {
    const base = path.basename(rel);
    if (namedRels.has(rel) || have.has(base)) {
      console.log(`skip  ${rel}`);
      continue;
    }
    const dest = path.join(ASSETS, 'extra', base);
    const result = await download(rel, dest);
    if (result === 'saved') have.add(base);
  }

  console.log(`\nFailed downloads: ${failures.length ? failures.length : 'none'}`);
  for (const failure of failures) console.log(`  ${failure}`);
  if (failures.length) process.exitCode = 1;
}

await main();
