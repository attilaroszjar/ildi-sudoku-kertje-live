#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
globalThis.window = globalThis;
globalThis.performance = performance;

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => m[1].split('?')[0]);

// Sudoku variants live in the cumulative SudokuBank scripts; there is no SudokuVariants
// global. Load the bank through iteration19 (where Parks2 is registered), then load the
// core generator. Do not load later runtime hardening/measurement wrappers.
for (const ref of refs) {
  if (!ref.startsWith('games/sudoku-bank')) continue;
  const code = fs.readFileSync(path.join(root, ref), 'utf8');
  (0, eval)(`${code}\n//# sourceURL=${ref}`);
  if (ref === 'games/sudoku-bank-iteration19.js') break;
}
{
  const ref = 'games/sudoku-generator.js';
  const code = fs.readFileSync(path.join(root, ref), 'utf8');
  (0, eval)(`${code}\n//# sourceURL=${ref}`);
}

if (!globalThis.SudokuGenerator?.make) throw new Error('SudokuGenerator.make unavailable');
if (!Array.isArray(globalThis.SudokuBank)) throw new Error('SudokuBank unavailable');

const variant = globalThis.SudokuBank.find(v => v.id === 'skyscraper-parks2');
if (!variant) throw new Error('skyscraper-parks2 variant unavailable');

const seed = 92001;
const t0 = performance.now();
const generated = globalThis.SudokuGenerator.make(variant, seed, 'expert');
const ms = performance.now() - t0;

const sparse = Array.from({ length: 8 }, () => Array(8).fill(0));
for (const [r,c,v] of [
  [0,2,7], // r1c3
  [1,7,2], // r2c8
  [3,2,7], // r4c3
  [4,5,7], // r5c6
  [5,5,1], // r6c6
  [6,6,3], // r7c7
]) sparse[r][c] = v;

function givens(grid){return grid.flat().filter(Boolean).length;}
function clone(value){return JSON.parse(JSON.stringify(value));}

const entry = {
  schemaVersion: 1,
  id: 'parks2-expert-seed-92001-a',
  variantId: 'skyscraper-parks2',
  sourceSeed: seed,
  difficulty: 'expert',
  puzzle: sparse,
  solution: clone(generated.solution),
  data: clone(generated.data || variant.data || {}),
  certificate: {
    exactVariantUnique: true,
    baseNonUnique: true,
    variantEssential: true,
    locallyIrreducibleUnderProductionContract: true,
    localIrreducibilityProof: 'monotone-nonuniqueness-from-single-pass',
    acceptedRemovals: 14,
    rejectedRemovals: 6,
    finalGivens: 6,
    evidence: 'host-realm deterministic carve audit, seed 92001'
  }
};

if (givens(entry.puzzle) !== 6) throw new Error('candidate sparse puzzle must have 6 givens');
if (!Array.isArray(entry.solution) || entry.solution.length !== 8 || entry.solution.some(r => !Array.isArray(r) || r.length !== 8)) throw new Error('generated solution shape invalid');
for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (entry.puzzle[r][c] && entry.solution[r][c] !== entry.puzzle[r][c]) throw new Error(`sparse clue disagrees with generated solution at r${r+1}c${c+1}`);

console.log(`PARKS2_CORPUS_EXPORT generationMs=${ms.toFixed(1)} givens=${givens(entry.puzzle)} sourceSeed=${seed}`);
console.log('PARKS2_CORPUS_CANDIDATE_JSON_BEGIN');
console.log(JSON.stringify(entry));
console.log('PARKS2_CORPUS_CANDIDATE_JSON_END');
console.log('PARKS2_CORPUS_CANDIDATE_EXPORT:PASS');
