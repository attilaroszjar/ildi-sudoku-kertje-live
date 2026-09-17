import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001,difficulty='expert',id='skyscraper-parks2';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};

let loaded=0;
for(const ref of loadRefs){
  const t0=performance.now();
  await import(pathToFileURL(path.join(root,ref)).href);
  const ms=performance.now()-t0;
  loaded++;
  if(ref==='games/sudoku-generator.js'||ref==='games/iteration19-generator-hardening.js'||ref==='games/p3-size-control.js'){
    console.log(`PARKS2_PHASE load=${ref} ms=${ms.toFixed(1)}`);
  }
}
console.log(`PARKS2_PHASE runtimeLoaded files=${loaded}`);

const generator=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
if(!generator||!variant)throw new Error('Parks2 production runtime unavailable');

console.log(`PARKS2_PHASE makeBegin seed=${seed} difficulty=${difficulty}`);
const t0=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-t0;
console.log(`PARKS2_PHASE makeEnd ms=${makeMs.toFixed(1)}`);

if(!out||!Array.isArray(out.puzzle))throw new Error('Parks2 generator returned no puzzle');
let givens=0;for(const row of out.puzzle)for(const v of row)if(v)givens++;
const g=out.generation||{};
console.log(`PARKS2_PHASE result givens=${givens} verification=${g.verification||'n/a'} policy=${g.policy||'n/a'} localIrreducible=${g.locallyIrreducibleUnderProductionContract===true} measurementSkipped=${g.measurementSkipped||'n/a'}`);
const failures=[];
if(givens!==6)failures.push(`givens=${givens}, expected canonical 6`);
if(g.verification!=='solver-verified-local-irreducible')failures.push(`verification=${g.verification}`);
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(g.locallyIrreducibleUnderProductionContract!==true)failures.push('local irreducibility certificate missing');
if(g.measurementSkipped!=='exact-local-irreducibility-certificate')failures.push(`measurementSkipped=${g.measurementSkipped}`);
if(failures.length){for(const f of failures)console.error(`PARKS2_PRODUCTION_PHASE_PROBE_FAILURE ${f}`);console.log('PARKS2_PRODUCTION_PHASE_PROBE:FAIL');process.exitCode=1;}
else console.log('PARKS2_PRODUCTION_PHASE_PROBE:PASS');
