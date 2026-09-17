import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const worker=process.argv.includes('--worker');
const argSeeds=process.argv.filter(x=>/^\d+$/.test(x)).map(Number);
const seeds=argSeeds.length?argSeeds:[93005,93017];
const timeoutMs=15000;

function rounded(x){return +x.toFixed(3);}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

if(!worker){
  const rows=[];
  for(const seed of seeds){
    const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--worker',String(seed)],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024*8});
    if(child.error&&child.error.code==='ETIMEDOUT'){
      const row={seed,timeout:true,timeoutMs};rows.push(row);emit('CLASSIC_HOTSPOT_PHASE_TIMEOUT',row);continue;
    }
    if(child.status!==0){
      const row={seed,error:true,status:child.status,stderr:(child.stderr||'').trim().slice(-2000)};rows.push(row);emit('CLASSIC_HOTSPOT_PHASE_ERROR',row);continue;
    }
    process.stdout.write(child.stdout||'');
    const line=(child.stdout||'').split(/\r?\n/).find(x=>x.startsWith('CLASSIC_HOTSPOT_PHASE_PROFILE '));
    if(line)rows.push(JSON.parse(line.slice('CLASSIC_HOTSPOT_PHASE_PROFILE '.length)));
  }
  emit('CLASSIC_HOTSPOT_PHASE_SUMMARY',{seeds,timeoutMs,completed:rows.filter(r=>!r.timeout&&!r.error).length,timeouts:rows.filter(r=>r.timeout).length,errors:rows.filter(r=>r.error).length});
  console.log('CLASSIC_HOTSPOT_PHASE_PROFILE:PASS');
  process.exit(0);
}

const seed=Number(process.argv[process.argv.length-1]);
function load(ref){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))throw new Error('missing runtime script: '+ref);
  (0,eval)(`${fs.readFileSync(file,'utf8')}\n//# sourceURL=${ref}`);
}
function countGivens(grid){let n=0;for(const row of grid||[])for(const v of row||[])if(v)n++;return n;}
function percentile(xs,p){if(!xs.length)return 0;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}

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

const C=globalThis.ClassicHumanContracts;
const S=globalThis.ClassicHumanRuntimeSolver;
const E=globalThis.ClassicHumanRuntimeEvaluator;
const G=globalThis.SudokuGenerator;
const B=globalThis.SudokuBank;
const variant=Array.isArray(B)&&B.find(v=>v.id==='classic');
if(!C||!S||!E||!G||!variant)throw new Error('Classic expert runtime dependencies missing');

const exactTimes=[];
const solveTimes=[];
const evalTimes=[];
let exactCalls=0,solveCalls=0,evalCalls=0;
const originalCount=C.countSolutions;
C.countSolutions=function(){const t0=performance.now();try{return originalCount.apply(this,arguments);}finally{exactCalls++;exactTimes.push(performance.now()-t0);}};
const originalSolve=S.solve;
S.solve=function(){const t0=performance.now();try{return originalSolve.apply(this,arguments);}finally{solveCalls++;solveTimes.push(performance.now()-t0);}};
const originalEval=E.evaluateExpertSearch;
E.evaluateExpertSearch=function(){const t0=performance.now();try{return originalEval.apply(this,arguments);}finally{evalCalls++;evalTimes.push(performance.now()-t0);}};

const t0=performance.now();
const out=G.make(variant,seed,'expert');
const generationMs=performance.now()-t0;
if(!out||!out.generation)throw new Error('Classic expert generation failed');

function summarize(times){
  const total=times.reduce((a,b)=>a+b,0);
  return {calls:times.length,totalMs:rounded(total),p50Ms:rounded(percentile(times,.5)),p95Ms:rounded(percentile(times,.95)),worstMs:rounded(Math.max(0,...times))};
}
const gen=out.generation;
const profile={
  seed,
  generationMs:rounded(generationMs),
  givens:countGivens(out.puzzle),
  unique:gen.unique===true,
  humanLevel:gen.humanLevel??null,
  humanScore:gen.humanScore??null,
  humanStatus:gen.humanStatus||null,
  phases:{
    exactUniqueness:summarize(exactTimes),
    humanSolve:summarize(solveTimes),
    evaluator:summarize(evalTimes)
  },
  generatorCounters:{
    baseAttempts:gen.baseAttempts??null,
    removalAttempts:gen.removalAttempts??null,
    localRemovalAttempts:gen.localRemovalAttempts??null,
    localAcceptedRemovals:gen.localAcceptedRemovals??null,
    rawEntryCandidateCount:gen.rawEntryCandidateCount??null,
    entryCandidateCount:gen.entryCandidateCount??null,
    multistartEvaluations:gen.multistartEvaluations??null,
    evaluationCacheHits:gen.evaluationCacheHits??null,
    brutalPrunes:gen.brutalPrunes??null
  },
  instrumented:{exactCalls,solveCalls,evalCalls},
  locallyIrreducible:gen.locallyIrreducibleUnderProductionContract===true,
  runtimeProfile:gen.runtimeProfile||null
};
emit('CLASSIC_HOTSPOT_PHASE_PROFILE',profile);
