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
const siblings=globalThis.LineGeneratorProvenSiblings;
const variant=globalThis.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner production runtime not loaded');
const seed=Number(process.env.NABNER_PHASE_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_PHASE_SEED invalid');

function countClues(grid){return grid.flat().filter(Boolean).length;}
function percentile(xs,p){
  if(!xs.length)return 0;
  const a=xs.slice().sort((x,y)=>x-y);
  return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];
}

let t=performance.now();
const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
const baselineMs=performance.now()-t;
const baselineGivens=countClues(baseline.puzzle);

const baselineStats={};
t=performance.now();
const baselineSolutions=G.countVariantSolutions(baseline.puzzle,baseline,2,baselineStats);
const baselineVerifyMs=performance.now()-t;

const rawCountVariantSolutions=G.countVariantSolutions;
const calls=[];
G.countVariantSolutions=function(source,variantArg,limit,statsArg){
  const stats=statsArg||{};
  const started=performance.now();
  const result=rawCountVariantSolutions.call(this,source,variantArg,limit,stats);
  const elapsed=performance.now()-started;
  if(variantArg&&variantArg.id==='nabner'){
    calls.push({
      givens:countClues(source),
      ms:+elapsed.toFixed(1),
      result,
      nodes:stats.nodes??null,
      branches:stats.branches??null,
      deadEnds:stats.deadEnds??null,
      propagated:stats.propagated??null
    });
  }
  return result;
};

t=performance.now();
const full=G.make(variant,seed,'expert');
const fullMs=performance.now()-t;
G.countVariantSolutions=rawCountVariantSolutions;

const callTimes=calls.map(row=>row.ms);
const slowest=calls.slice().sort((a,b)=>b.ms-a.ms).slice(0,8);
const nonUnique=calls.filter(row=>row.result>1);
const uniqueCalls=calls.filter(row=>row.result===1);

console.log('NABNER_EXPERT_PHASE_TIMING '+JSON.stringify({
  realm:'host-eval',
  seed,
  baselineMs:+baselineMs.toFixed(1),
  baselineGivens,
  baselineSolutions,
  baselineVerifyMs:+baselineVerifyMs.toFixed(1),
  baselineVerifyNodes:baselineStats.nodes??null,
  baselineVerifyBranches:baselineStats.branches??null,
  baselineVerifyDeadEnds:baselineStats.deadEnds??null,
  baselineVerifyPropagated:baselineStats.propagated??null,
  fullMs:+fullMs.toFixed(1),
  finalGivens:countClues(full.puzzle),
  verification:full.generation?.verification||null,
  policy:full.generation?.policy||null,
  acceptedRemovals:full.generation?.acceptedRemovals??null,
  rejectedRemovals:full.generation?.rejectedRemovals??null
}));
console.log('NABNER_EXPERT_CARVE_CALL_SUMMARY '+JSON.stringify({
  calls:calls.length,
  uniqueCalls:uniqueCalls.length,
  nonUniqueCalls:nonUnique.length,
  totalMs:+callTimes.reduce((a,b)=>a+b,0).toFixed(1),
  p50Ms:+percentile(callTimes,0.50).toFixed(1),
  p95Ms:+percentile(callTimes,0.95).toFixed(1),
  worstMs:+Math.max(0,...callTimes).toFixed(1)
}));
for(const row of slowest)console.log('NABNER_EXPERT_SLOW_CALL '+JSON.stringify(row));
const pass=baselineGivens===30&&baselineSolutions===1&&full.generation?.locallyIrreducibleUnderProductionContract===true;
console.log('NABNER_EXPERT_PHASE_TIMING_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
