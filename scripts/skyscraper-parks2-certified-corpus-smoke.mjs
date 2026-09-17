#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const root=process.cwd();globalThis.window=globalThis;globalThis.performance=performance;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1].split('?')[0]);
for(const ref of refs){if(!ref.startsWith('games/'))continue;const p=path.join(root,ref);if(!fs.existsSync(p))continue;(0,eval)(`${fs.readFileSync(p,'utf8')}\n//# sourceURL=${ref}`);if(ref==='games/iteration19-generator-hardening.js')break;}
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v.id==='skyscraper-parks2');
if(!variant)throw new Error('Parks2 variant missing');
if(!globalThis.SkyscraperParks2CertifiedCorpus?.length)throw new Error('Parks2 certified corpus missing');
if(!globalThis.SudokuGenerator?.make)throw new Error('SudokuGenerator.make missing');
const t0=performance.now(),out=globalThis.SudokuGenerator.make(variant,92001,'expert'),ms=performance.now()-t0;
const givens=out.puzzle.flat().filter(Boolean).length;
if(givens!==6)throw new Error(`expected 6 givens, got ${givens}`);
if(out.generation?.verification!=='certified-corpus-exact')throw new Error('certified corpus verification marker missing');
if(out.generation?.locallyIrreducibleUnderProductionContract!==true)throw new Error('local irreducibility certificate missing');
if(out.generation?.variantEssential!==true||out.generation?.unique!==true)throw new Error('exact contract markers missing');
if(out.generation?.corpusEntryId!=='parks2-expert-seed-92001-a')throw new Error('unexpected corpus entry');
console.log(`PARKS2_CERTIFIED_CORPUS_SMOKE generationMs=${ms.toFixed(3)} givens=${givens} entry=${out.generation.corpusEntryId}`);
console.log('PARKS2_CERTIFIED_CORPUS_SMOKE:PASS');
