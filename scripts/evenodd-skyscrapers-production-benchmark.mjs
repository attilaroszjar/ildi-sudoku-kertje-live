import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seeds=process.argv.slice(2).map(Number).filter(Number.isFinite);
const runSeeds=seeds.length?seeds:[93000,93001,93002,93003,93004,93005,93006,93007,93008,93009];
const difficulties=['focused','expert'];

function load(ref){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))throw new Error('missing runtime script: '+ref);
  (0,eval)(`${fs.readFileSync(file,'utf8')}\n//# sourceURL=${ref}`);
}
function rounded(x){return +x.toFixed(3);}
function countGivens(grid){let n=0;for(const row of grid||[])for(const v of row||[])if(v)n++;return n;}
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
const variant=Array.isArray(B)&&B.find(v=>v.id==='evenodd-skyscrapers');
if(!G||!variant||typeof G.make!=='function')throw new Error('Even/Odd Skyscrapers production runtime missing');

const rows=[];
for(const difficulty of difficulties){
  for(const seed of runSeeds){
    const t0=performance.now();
    const out=G.make(variant,seed,difficulty);
    const generationMs=performance.now()-t0;
    if(!out||!Array.isArray(out.puzzle)||!Array.isArray(out.solution))throw new Error('generation failed for '+difficulty+' seed '+seed);
    const generation=out.generation||null;
    const row={
      seed,difficulty,
      generationMs:rounded(generationMs),
      givens:countGivens(out.puzzle),
      unique:generation&&generation.unique===true,
      variantEssential:generation&&generation.variantEssential===true,
      verification:generation&&generation.verification||null,
      generatorFamily:generation&&generation.generatorFamily||null,
      difficultyScore:generation&&generation.difficultyScore!=null?generation.difficultyScore:null,
      searchStats:generation&&generation.searchStats||null,
      locallyIrreducible:generation&&generation.locallyIrreducibleUnderProductionContract===true
    };
    rows.push(row);
    emit('EVENODD_SKYSCRAPERS_RUNTIME_SAMPLE',row);
  }
}

const summaries=difficulties.map(difficulty=>{
  const subset=rows.filter(r=>r.difficulty===difficulty),times=subset.map(r=>r.generationMs);
  return {
    difficulty,count:subset.length,
    minMs:rounded(Math.min(...times)),
    medianMs:rounded(percentile(times,.5)),
    p95Ms:rounded(percentile(times,.95)),
    maxMs:rounded(Math.max(...times)),
    maxSeed:subset.reduce((a,b)=>b.generationMs>a.generationMs?b:a).seed,
    givens:{min:Math.min(...subset.map(r=>r.givens)),max:Math.max(...subset.map(r=>r.givens))},
    allUnique:subset.every(r=>r.unique),
    allVariantEssential:subset.every(r=>r.variantEssential),
    allLocallyIrreducible:subset.every(r=>r.locallyIrreducible)
  };
});
emit('EVENODD_SKYSCRAPERS_PRODUCTION_BENCHMARK',{variant:variant.id,seeds:runSeeds,summaries});
console.log('EVENODD_SKYSCRAPERS_PRODUCTION_BENCHMARK:PASS');
