import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seeds=process.argv.slice(2).map(Number).filter(Number.isFinite);
const runSeeds=seeds.length?seeds:[93000,93001,93002,93003,93004];

function load(ref){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))throw new Error('missing runtime script: '+ref);
  (0,eval)(`${fs.readFileSync(file,'utf8')}\n//# sourceURL=${ref}`);
}
function rounded(x){return +x.toFixed(3);}
function countGivens(grid){let n=0;for(const row of grid)for(const v of row)if(v)n++;return n;}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}
function percentile(xs,p){if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/p3-size-control.js');
if(first<0||last<first)throw new Error('production runtime range missing');

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of bankRefs)load(ref);
for(const ref of refs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref)))load(ref);

const G=globalThis.SudokuGenerator;
const B=globalThis.SudokuBank;
const variant=Array.isArray(B)&&B.find(v=>v.id==='sudoku-16x16');
if(!G||!variant||typeof G.make!=='function'||typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('16x16 production runtime missing');

const rows=[];
for(const seed of runSeeds){
  const t0=performance.now();
  const out=G.make(variant,seed,'expert');
  const generationMs=performance.now()-t0;
  if(!out||!out.generation||!Array.isArray(out.puzzle))throw new Error('16x16 generation failed for seed '+seed);
  const stats={};
  const v0=performance.now();
  const count=G.countLargeClassicSolutionsExact(out.puzzle,2,stats);
  const verificationMs=performance.now()-v0;
  const row={
    seed,
    generationMs:rounded(generationMs),
    verificationMs:rounded(verificationMs),
    givens:countGivens(out.puzzle),
    unique:count===1&&out.generation.unique===true,
    locallyIrreducible:out.generation.locallyIrreducibleUnderProductionContract===true,
    acceptedRemovals:out.generation.acceptedRemovals??null,
    rejectedRemovals:out.generation.rejectedRemovals??null,
    verification:out.generation.verification,
    generatorFamily:out.generation.generatorFamily,
    finalStats:stats,
    generationStats:out.generation.exactSearchStats||null
  };
  rows.push(row);
  emit('SUDOKU16_RUNTIME_SAMPLE',row);
}
const times=rows.map(r=>r.generationMs);
const summary={
  seeds:runSeeds,
  count:rows.length,
  minMs:rounded(Math.min(...times)),
  medianMs:rounded(percentile(times,.5)),
  p95Ms:rounded(percentile(times,.95)),
  maxMs:rounded(Math.max(...times)),
  maxSeed:rows.reduce((a,b)=>b.generationMs>a.generationMs?b:a).seed,
  givens:{min:Math.min(...rows.map(r=>r.givens)),max:Math.max(...rows.map(r=>r.givens))},
  allUnique:rows.every(r=>r.unique),
  allLocallyIrreducible:rows.every(r=>r.locallyIrreducible),
  contract:rows.every(r=>r.verification==='classic16-dlx-precovered-exact-v2'&&r.generatorFamily==='large-unique-removal-expert-local-irreducible')
};
emit('SUDOKU16_PRODUCTION_BENCHMARK',summary);
if(!summary.allUnique||!summary.allLocallyIrreducible||!summary.contract)throw new Error('16x16 production contract failure');
console.log('SUDOKU16_PRODUCTION_BENCHMARK:PASS');
