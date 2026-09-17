import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const self=fileURLToPath(import.meta.url);
const root=path.resolve(path.dirname(self),'..');
const TIMEOUT_MS=5000;
const defaultSeeds=Array.from({length:20},(_,i)=>93000+i);

function load(ref){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))throw new Error('missing runtime script: '+ref);
  (0,eval)(`${fs.readFileSync(file,'utf8')}\n//# sourceURL=${ref}`);
}
function rounded(x){return +x.toFixed(3);}
function countGivens(grid){let n=0;for(const row of grid||[])for(const v of row||[])if(v)n++;return n;}
function percentile(xs,p){if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

async function worker(seed){
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
  const variant=Array.isArray(B)&&B.find(v=>v.id==='classic');
  if(!G||!variant||typeof G.make!=='function')throw new Error('Classic production runtime missing');
  const t0=performance.now();
  const out=G.make(variant,seed,'expert');
  const ms=performance.now()-t0;
  const gen=out&&out.generation||{};
  emit('CLASSIC_RUNTIME_WORKER',{
    seed,
    generationMs:rounded(ms),
    givens:countGivens(out&&out.puzzle),
    unique:gen.unique===true,
    humanLevel:Number.isInteger(gen.humanLevel)?gen.humanLevel:null,
    humanScore:gen.humanScore==null?null:gen.humanScore,
    humanStatus:gen.humanStatus||null,
    baseAttempts:gen.baseAttempts==null?null:gen.baseAttempts,
    removalAttempts:gen.removalAttempts==null?null:gen.removalAttempts,
    localRemovalAttempts:gen.localRemovalAttempts==null?null:gen.localRemovalAttempts,
    localAcceptedRemovals:gen.localAcceptedRemovals==null?null:gen.localAcceptedRemovals,
    multistartEvaluations:gen.multistartEvaluations==null?null:gen.multistartEvaluations,
    evaluationCacheHits:gen.evaluationCacheHits==null?null:gen.evaluationCacheHits,
    brutalPrunes:gen.brutalPrunes==null?null:gen.brutalPrunes,
    runtimeProfile:gen.runtimeProfile||null,
    locallyIrreducible:gen.locallyIrreducibleUnderProductionContract===true
  });
}

if(process.argv[2]==='--worker'){
  const seed=Number(process.argv[3]);
  if(!Number.isFinite(seed))throw new Error('invalid worker seed');
  await worker(seed);
}else{
  const supplied=process.argv.slice(2).map(Number).filter(Number.isFinite);
  const seeds=supplied.length?supplied:defaultSeeds;
  const rows=[];let timeouts=0,errors=0;
  for(const seed of seeds){
    const cp=spawnSync(process.execPath,[self,'--worker',String(seed)],{encoding:'utf8',timeout:TIMEOUT_MS,maxBuffer:1024*1024});
    if(cp.error&&cp.error.code==='ETIMEDOUT'){
      timeouts++;
      emit('CLASSIC_RUNTIME_TIMEOUT',{seed,timeout:true,timeoutMs:TIMEOUT_MS});
      continue;
    }
    if(cp.status!==0){
      errors++;
      emit('CLASSIC_RUNTIME_ERROR',{seed,status:cp.status,stderr:String(cp.stderr||'').trim().slice(-1000)});
      continue;
    }
    const line=String(cp.stdout||'').trim().split(/\r?\n/).find(x=>x.startsWith('CLASSIC_RUNTIME_WORKER '));
    if(!line){errors++;emit('CLASSIC_RUNTIME_ERROR',{seed,status:cp.status,stderr:'worker output missing'});continue;}
    const row=JSON.parse(line.slice('CLASSIC_RUNTIME_WORKER '.length));
    rows.push(row);emit('CLASSIC_RUNTIME_SAMPLE',row);
  }
  const times=rows.map(r=>r.generationMs);
  const summary={
    seeds,count:seeds.length,completed:rows.length,timeouts,errors,timeoutMs:TIMEOUT_MS,
    minMs:times.length?rounded(Math.min(...times)):null,
    medianMs:times.length?rounded(percentile(times,.5)):null,
    p95Ms:times.length?rounded(percentile(times,.95)):null,
    maxMs:times.length?rounded(Math.max(...times)):null,
    maxSeed:rows.length?rows.reduce((a,b)=>b.generationMs>a.generationMs?b:a).seed:null,
    allUnique:rows.length>0&&rows.every(r=>r.unique),
    allLocallyIrreducible:rows.length>0&&rows.every(r=>r.locallyIrreducible),
    levels:[...new Set(rows.map(r=>r.humanLevel))].sort((a,b)=>(a??99)-(b??99)),
    evaluations:{min:rows.length?Math.min(...rows.map(r=>r.multistartEvaluations??0)):null,max:rows.length?Math.max(...rows.map(r=>r.multistartEvaluations??0)):null}
  };
  emit('CLASSIC_INTERMITTENT_RUNTIME_BENCHMARK',summary);
  if(errors)throw new Error('Classic benchmark worker error');
  console.log('CLASSIC_INTERMITTENT_RUNTIME_BENCHMARK:PASS');
}
