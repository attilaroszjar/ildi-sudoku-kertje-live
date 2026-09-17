import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/skyscraper-parks-arc-runtime.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production generator script range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))continue;
  (0,eval)(`${fs.readFileSync(file,'utf8')}\n//# sourceURL=${ref}`);
}

const G=globalThis.SudokuGenerator;
if(!G||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime not loaded');
const targets=['nabner','skyscraper-parks'];
const seeds=[92001,92002,92003,92004,92005];
const rows=[];
for(const id of targets){
  const variant=globalThis.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error(`variant missing: ${id}`);
  for(const seed of seeds){
    const t0=performance.now();
    const out=G.make(variant,seed,'expert');
    const generationMs=performance.now()-t0;
    const stats={};
    const v0=performance.now();
    let unique;
    if(id==='skyscraper-parks'){
      if(typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks exact verifier missing');
      unique=G.countParkSolutions(out.puzzle,out,2,false,stats)===1;
    }else{
      unique=G.countVariantSolutions(out.puzzle,out,2,stats)===1;
    }
    const verificationMs=performance.now()-v0;
    const meta=out.generation||{};
    const row={
      id,seed,generationMs:+generationMs.toFixed(1),verificationMs:+verificationMs.toFixed(1),
      givens:out.puzzle.flat().filter(Boolean).length,unique,
      variantEssential:meta.variantEssential===true,
      nodes:stats.nodes??meta.nodes??meta.searchNodes??meta.solverNodes??null,
      branches:stats.branches??meta.branches??meta.searchBranches??meta.solverBranches??null,
      deadEnds:stats.deadEnds??meta.deadEnds??meta.searchDeadEnds??meta.solverDeadEnds??null,
      verification:meta.verification??null,policy:meta.policy??null
    };
    rows.push(row);
    console.log('P0B_RUNTIME_SAMPLE '+JSON.stringify(row));
  }
}
function percentile(xs,p){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];}
for(const id of targets){
  const xs=rows.filter(r=>r.id===id);
  const summary={
    id,
    generationP50Ms:percentile(xs.map(r=>r.generationMs),0.50),
    generationP95Ms:percentile(xs.map(r=>r.generationMs),0.95),
    generationWorstMs:Math.max(...xs.map(r=>r.generationMs)),
    verificationP50Ms:percentile(xs.map(r=>r.verificationMs),0.50),
    verificationP95Ms:percentile(xs.map(r=>r.verificationMs),0.95),
    verificationWorstMs:Math.max(...xs.map(r=>r.verificationMs)),
    allUnique:xs.every(r=>r.unique),allVariantEssential:xs.every(r=>r.variantEssential),
    countersAvailable:xs.some(r=>r.nodes!==null||r.branches!==null||r.deadEnds!==null)
  };
  console.log('P0B_RUNTIME_SUMMARY '+JSON.stringify(summary));
}
console.log('P0B_FREEZE_RUNTIME_INVENTORY:PASS');