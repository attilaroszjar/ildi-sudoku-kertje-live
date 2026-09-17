import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderStandalone } from './build-standalone.mjs';

const release = 'Ildi Sudoku Kertje.html';
const snapshot = 'Ildi Sudoku Kertje - Post-Hardening.html';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const a = fs.readFileSync(release);
const b = fs.readFileSync(snapshot);
const expected = Buffer.from(renderStandalone());

if (!a.equals(b)) fail('standalone HTML files differ');
if (!a.equals(expected)) fail('standalone HTML is stale relative to modular source');

const html = a.toString('utf8');

const externalScripts =
  [...html.matchAll(/<script[^>]+src=["'][^"']+["']/gi)].length;
const externalStyles =
  [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].length;

if (externalScripts !== 0) fail(`external script count = ${externalScripts}`);
if (externalStyles !== 0) fail(`external stylesheet count = ${externalStyles}`);

for (const api of [
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/i,
  /\bWebSocket\b/i,
  /\bEventSource\b/i
]) {
  if (api.test(html)) fail(`network API detected: ${api}`);
}

const urls = [...html.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map(m => m[0]);
const nonSvgUrls = urls.filter(url => !url.startsWith('http://www.w3.org/2000/svg'));

if (nonSvgUrls.length) {
  fail(`unexpected URL reference(s): ${nonSvgUrls.join(', ')}`);
}

try {
  execFileSync(
    process.execPath,
    ['scripts/sudoku-generator-inventory.mjs', '--check'],
    { stdio: 'ignore' }
  );
} catch {
  fail('Sudoku generator inventory snapshot is stale');
}

execFileSync(
  process.execPath,
  ['--test', 'tests/region-sum-segments.test.js'],
  { stdio: 'ignore' }
);

execFileSync(
  process.execPath,
  ['--test', 'tests/catalogue-integrity.test.js'],
  { stdio: 'ignore' }
);

const hash = crypto.createHash('sha256').update(a).digest('hex');

console.log('RELEASE GATE: PASS');
console.log('catalogue: 106');
console.log('external runtime dependencies: 0');
console.log(`standalone sha256: ${hash}`);
