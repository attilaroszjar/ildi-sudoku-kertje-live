import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/miracle-generator-hardening.js');
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const load=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);
const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=92001;
const generated=G.make(variant,seed,'expert');
const before=G.countParkSolutions;
(0,eval)(`${fs.readFileSync(path.join(root,'games/skyscraper-parks-hybrid-runtime.js'),'utf8')}\n//# sourceURL=games/skyscraper-parks-hybrid-runtime.js`);
const H=globalThis.SkyscraperParksHybridRuntime;
if(!H||G.countParkSolutions===before)throw new Error('hybrid runtime not installed');
function clone(grid){return grid.map(r=>r.slice());}
function clues(grid){return grid.flat().filter(Boolean).length;}
const cases=[{id:'base',puzzle:clone(generated.puzzle)}];
for(let idx=0;idx<81;idx++){const r=Math.floor(idx/9),c=idx%9;if(!generated.puzzle[r][c])continue;const p=clone(generated.puzzle);p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});}
let mismatches=0,legacyMs=0,hybridMs=0;
for(const tc of cases){let t=performance.now();const legacy=H.legacyCount(tc.puzzle,generated,2,false);legacyMs+=performance.now()-t;t=performance.now();const hybrid=G.countParkSolutions(tc.puzzle,generated,2,false);hybridMs+=performance.now()-t;if(legacy!==hybrid)mismatches++;}
const baseIgnoreLegacy=H.legacyCount(generated.puzzle,generated,2,true);
const baseIgnoreHybrid=G.countParkSolutions(generated.puzzle,generated,2,true);
const removed=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1','r7c6','r2c6'];
const sparse=clone(generated.puzzle);for(const cell of removed){const m=/r(\d+)c(\d+)/.exec(cell);sparse[Number(m[1])-1][Number(m[2])-1]=0;}
if(clues(sparse)!==11)throw new Error('expected 11-clue sparse state');
let t=performance.now();const sparseSolutions=G.countParkSolutions(sparse,generated,2,false);const sparseMs=performance.now()-t;
t=performance.now();const sparseBase=G.countParkSolutions(sparse,generated,2,true);const sparseBaseMs=performance.now()-t;
console.log('SKYSCRAPER_PARKS_HYBRID_RUNTIME '+JSON.stringify({seed,threshold:H.threshold,cases:cases.length,mismatches,legacyMs:+legacyMs.toFixed(1),hybridMs:+hybridMs.toFixed(1),baseIgnore:{legacy:baseIgnoreLegacy,hybrid:baseIgnoreHybrid,match:baseIgnoreLegacy===baseIgnoreHybrid},sparse:{clues:11,solutions:sparseSolutions,baseFamilySolutions:sparseBase,runtimeMs:+sparseMs.toFixed(1),baseRuntimeMs:+sparseBaseMs.toFixed(1),productionContractPass:sparseSolutions===1&&sparseBase>1}}));
const pass=mismatches===0&&baseIgnoreLegacy===baseIgnoreHybrid&&sparseSolutions===1&&sparseBase>1;
console.log('SKYSCRAPER_PARKS_HYBRID_RUNTIME_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
