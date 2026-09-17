import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptSources = [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map((m) => m[1]);
const generatorIndex = scriptSources.indexOf('games/sudoku-generator.js');
const arcIndex = scriptSources.indexOf('games/skyscraper-parks-arc-runtime.js');

if (generatorIndex < 0) throw new Error('Production sudoku-generator.js wiring not found');
if (arcIndex < generatorIndex) throw new Error('Production Skyscraper Parks ARC runtime wiring not found after generator');

globalThis.window = globalThis;

function evaluateHostRealm(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  // Indirect eval executes against the real Node global realm. This profiler intentionally
  // avoids node:vm so its timings are comparable with the project's host-realm evidence.
  (0, eval)(`${source}\n//# sourceURL=${relativePath}`);
}

const loaded = [];
for (let i = 0; i <= arcIndex; i += 1) {
  const src = scriptSources[i];
  if (!src.startsWith('games/')) continue;

  // Before sudoku-generator.js only the registered Sudoku banks are needed. From the
  // generator onward, replay every non-DOM game/core/runtime script in the exact production
  // order. This keeps transitive dependencies available without maintaining a fragile list.
  let shouldLoad = /^games\/sudoku-bank(?:-[^/]+)?\.js$/.test(src)
    || src === 'games/skyscraper-parks2-certified-corpus.js'
    || src === 'games/sudoku-generator.js';

  if (!shouldLoad && i > generatorIndex) {
    const source = fs.readFileSync(path.join(root, src), 'utf8');
    shouldLoad = !source.includes('document.');
  }

  if (!shouldLoad) continue;
  evaluateHostRealm(src);
  loaded.push(src);
}

if (!globalThis.SudokuGenerator) throw new Error('SudokuGenerator was not initialized');
if (!Array.isArray(globalThis.SudokuBank)) throw new Error('SudokuBank was not initialized');
if (typeof globalThis.SudokuGenerator.countParkSolutions !== 'function') throw new Error('Production Parks exact verifier was not initialized');

const variant = globalThis.SudokuBank.find((entry) => entry && entry.id === 'skyscraper-parks');
if (!variant) throw new Error('skyscraper-parks variant was not registered by the production bank chain');

const seed = Number(process.argv[2] ?? 92001) >>> 0;
const difficulty = 'expert';

const started = performance.now();
const generated = globalThis.SudokuGenerator.make(variant, seed, difficulty);
const generationMs = performance.now() - started;
const givens = generated.puzzle.flat().filter(Boolean).length;

// Authoritative Parks contract: row/column Latin constraints plus the outside park clues.
const verifyStarted = performance.now();
const parkSolutions = globalThis.SudokuGenerator.countParkSolutions(generated.puzzle, generated, 2, false);
const verifyMs = performance.now() - verifyStarted;

const baseStarted = performance.now();
const parkBaseSolutions = globalThis.SudokuGenerator.countParkSolutions(generated.puzzle, generated, 2, true);
const baseVerifyMs = performance.now() - baseStarted;

// Keep the generic Sudoku counter only as a diagnostic. It is not the Parks contract.
const genericStarted = performance.now();
const genericVariantSolutions = globalThis.SudokuGenerator.countVariantSolutions(generated.puzzle, generated, 2);
const genericVerifyMs = performance.now() - genericStarted;

const summary = {
  seed,
  difficulty,
  givens,
  generationMs: Number(generationMs.toFixed(1)),
  verifyMs: Number(verifyMs.toFixed(1)),
  baseVerifyMs: Number(baseVerifyMs.toFixed(1)),
  parkSolutions,
  parkBaseSolutions,
  unique: parkSolutions === 1,
  variantEssential: parkSolutions === 1 && parkBaseSolutions > 1,
  genericVariantSolutions,
  genericVerifyMs: Number(genericVerifyMs.toFixed(1)),
  verification: generated.generation?.verification ?? null,
  generatorFamily: generated.generation?.generatorFamily ?? generated.generation?.mode ?? null,
  productionArcLoaded: loaded.includes('games/skyscraper-parks-arc-runtime.js'),
  loadedScriptCount: loaded.length
};

console.log('SKYSCRAPER_PARKS_CURRENT_HOST_REALM', JSON.stringify(summary));
console.log('SKYSCRAPER_PARKS_CURRENT_HOST_REALM_GATE:' + (summary.unique && summary.variantEssential && summary.productionArcLoaded ? 'PASS' : 'FAIL'));

if (!(summary.unique && summary.variantEssential && summary.productionArcLoaded)) process.exitCode = 1;
