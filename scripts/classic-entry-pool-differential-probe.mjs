import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seeds=[93000,93001,93002,93003,93004,93005,93006,93007,93008,93009,93010,93011,93012,93013,93014,93015,93016,93017,93018,93019];
const pools=[8,4,2,1];
const timeoutMs=8000;
const self=fileURLToPath(import.meta.url);

function rounded(x){return +x.toFixed(3);}
function percentile(xs,p){if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

if(process.argv[2]==='--worker'){
  const seed=Number(process.argv[3]);
  const entryPool=Number(process.argv[4]);
  globalThis.__CLASSIC_ENTRY_POOL_OVERRIDE=entryPool;
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const last=refs.indexOf('games/p3-size-control.js');
  if(first<0||last<first)throw new Error('production runtime range missing');
  function load(ref){
    const file=path.join(root,ref);
    let src=fs.readFileSync(file,'utf8');
    if(ref==='games/classic-human-runtime-generator.js'){
      const needle="entryPool:8,entryCandidates:1";
      if(!src.includes(needle))throw new Error('entry pool contract marker missing');
      src=src.replace(needle,`entryPool:${entryPool},entryCandidates:1`);
    }
    (0,eval)(`${src}\n//# sourceURL=${ref}`);
  }
  globalThis.window=globalThis;
  globalThis.performance=performance;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of bankRefs)load(ref);
  for(const ref of refs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref)))load(ref);
  const G=globalThis.SudokuGenerator;
  const B=globalThis.SudokuBank;
  const variant=Array.isArray(B)&&B.find(v=>v.id==='classic');
  if(!G||!variant||typeof G.make!=='function')throw new Error('Classic production runtime missing');
  const t0=performance.now();
  const out=G.make(variant,seed,'expert');
  const generationMs=performance.now()-t0;
  const g=out&&out.generation||{};
  const row={
    seed,entryPool,generationMs:rounded(generationMs),
    givens:g.clues??null,unique:g.unique===true,
    locallyIrreducible:g.locallyIrreducibleUnderProductionContract===true,
    humanLevel:g.humanLevel??null,humanScore:g.humanScore??null,humanStatus:g.humanStatus||null,
    baseAttempts:g.baseAttempts??null,removalAttempts:g.removalAttempts??null,
    localRemovalAttempts:g.localRemovalAttempts??null,localAcceptedRemovals:g.localAcceptedRemovals??null,
    multistartEvaluations:g.multistartEvaluations??null,evaluationCacheHits:g.evaluationCacheHits??null,
    brutalPrunes:g.brutalPrunes??null,rawEntryCandidateCount:g.rawEntryCandidateCount??null,
    selectedEntryCandidateCount:g.entryCandidateCount??null,chosenEntryClues:g.chosenEntryClues??null,
    runtimeProfile:g.runtimeProfile||null
  };
  emit('CLASSIC_ENTRY_POOL_SAMPLE',row);
  process.exit(0);
}

const rows=[];
for(const entryPool of pools){
  for(const seed of seeds){
    const cp=spawnSync(process.execPath,[self,'--worker',String(seed),String(entryPool)],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:4*1024*1024});
    if(cp.error&&cp.error.code==='ETIMEDOUT'){
      const row={seed,entryPool,timeout:true,timeoutMs};rows.push(row);emit('CLASSIC_ENTRY_POOL_TIMEOUT',row);continue;
    }
    if(cp.status!==0){
      const row={seed,entryPool,error:true,status:cp.status,stderr:(cp.stderr||'').trim().slice(-2000)};rows.push(row);emit('CLASSIC_ENTRY_POOL_ERROR',row);continue;
    }
    const line=(cp.stdout||'').split(/\r?\n/).find(x=>x.startsWith('CLASSIC_ENTRY_POOL_SAMPLE '));
    if(!line){const row={seed,entryPool,error:true,status:cp.status,stderr:'missing sample output'};rows.push(row);emit('CLASSIC_ENTRY_POOL_ERROR',row);continue;}
    const row=JSON.parse(line.slice('CLASSIC_ENTRY_POOL_SAMPLE '.length));rows.push(row);console.log(line);
  }
}
const summary=pools.map(entryPool=>{
  const subset=rows.filter(r=>r.entryPool===entryPool),ok=subset.filter(r=>!r.timeout&&!r.error),times=ok.map(r=>r.generationMs);
  return {entryPool,completed:ok.length,timeouts:subset.filter(r=>r.timeout).length,errors:subset.filter(r=>r.error).length,
    minMs:times.length?rounded(Math.min(...times)):null,medianMs:times.length?rounded(percentile(times,.5)):null,p95Ms:times.length?rounded(percentile(times,.95)):null,maxMs:times.length?rounded(Math.max(...times)):null,
    allUnique:ok.length>0&&ok.every(r=>r.unique),allLocallyIrreducible:ok.length>0&&ok.every(r=>r.locallyIrreducible),
    levels:[...new Set(ok.map(r=>r.humanLevel))].sort((a,b)=>a-b),givens:ok.length?{min:Math.min(...ok.map(r=>r.givens)),max:Math.max(...ok.map(r=>r.givens))}:null,
    evaluations:ok.length?{min:Math.min(...ok.map(r=>r.multistartEvaluations)),max:Math.max(...ok.map(r=>r.multistartEvaluations))}:null};
});
emit('CLASSIC_ENTRY_POOL_DIFFERENTIAL',{seeds,pools,timeoutMs,summary});
if(summary.some(s=>s.errors))throw new Error('entry pool differential had worker errors');
console.log('CLASSIC_ENTRY_POOL_DIFFERENTIAL:PASS');
