import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalJson, structuralSolutionFingerprint, summarizeProductionSamples } from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=[
  'skyscraper','diagonal-skyscrapers','inside-skyscrapers','killer-skyscrapers','product-skyscrapers',
  'skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','skyscraper-sums','sum-skyscraper-parks'
];
const samplesPerVariant=4;
const perSampleTimeoutMs=15000;
const concurrency=4;
const self=fileURLToPath(import.meta.url);

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const all=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  return all.filter(x=>{
    if(/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x))return true;
    if(x==='games/sudoku-generator.js')return true;
    if(/^games\/(?:extra-house-generator-core|line-generator-core|killer-generator|line-generator-[^/]+)\.js$/.test(x))return true;
    if(/^games\/iteration\d+-generator-hardening\.js$/.test(x))return true;
    if(/^games\/[^/]+(?:generator|runtime)-hardening\.js$/.test(x))return true;
    return false;
  });
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  const refs=runtimeRefs();
  for(const file of refs){
    const full=path.join(root,file);
    if(!fs.existsSync(full))throw new Error('runtime ref missing: '+file);
    vm.runInContext(fs.readFileSync(full,'utf8'),ctx,{filename:file});
  }
  if(!ctx.SudokuGenerator||typeof ctx.SudokuGenerator.make!=='function')throw new Error('SudokuGenerator.make missing after runtime bootstrap');
  if(!Array.isArray(ctx.SudokuBank))throw new Error('SudokuBank missing after runtime bootstrap');
  const missing=ids.filter(id=>!ctx.SudokuBank.some(v=>v.id===id));
  if(missing.length)throw new Error('missing canonical Skyscraper variants: '+missing.join(','));
  return ctx;
}

function topologyPayload(generated){
  const d=generated&&generated.data||{};
  const omit=new Set(['source','sources','reference','references','note','notes','description','rule','inputMode']);
  const out={};
  for(const key of Object.keys(d).sort())if(!omit.has(key))out[key]=d[key];
  return out;
}

function auditCounts(G,variant,generated){
  if(variant.kind==='skyscraperparks'||variant.kind==='sumskyscraperparks'){
    if(typeof G.countParkSolutions!=='function')throw new Error('countParkSolutions missing for '+variant.id);
    return {
      exact:G.countParkSolutions(generated.puzzle,generated,2,false),
      baseline:G.countParkSolutions(generated.puzzle,generated,2,true),
      baselineKind:'latin-without-skyscraper-clues'
    };
  }
  return {
    exact:G.countVariantSolutions(generated.puzzle,generated,2),
    baseline:G.countSolutions(generated.puzzle,2),
    baselineKind:'classic-sudoku'
  };
}

function structuralMarkerOk(ctx,variant,flags){
  const structuralKinds=ctx.XSumsRuntimeHardening&&ctx.XSumsRuntimeHardening.skyscraperStructuralKinds||[];
  if(!structuralKinds.includes(variant.kind))return true;
  if(variant.kind==='skyscrapernontouching'){
    return flags.generatorFamily==='skyscraper-nontouching-anti-king-seeded-exact-verified';
  }
  return flags.generatorFamily==='skyscraper-structural-automorphism-exact-verified';
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const started=Date.now();
  try{
    const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id);
    const generated=G.make(variant,seed,'focused');
    const replay=G.make(variant,seed,'focused');
    const counts=auditCounts(G,variant,generated),exact=counts.exact,baseline=counts.baseline;
    const replayOk=canonicalJson({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===canonicalJson({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const flags=generated.generation||{};
    const markerOk=structuralMarkerOk(ctx,variant,flags);
    const contractOk=exact===1&&baseline>1&&replayOk&&flags.unique===true&&flags.variantEssential===true&&markerOk;
    console.log(JSON.stringify({
      id,seed,status:contractOk?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,
      exact,baseline,baselineKind:counts.baselineKind,replayOk,structuralMarkerOk:markerOk,
      solution:canonicalJson(generated.solution),
      structure:structuralSolutionFingerprint(generated.solution),
      topology:canonicalJson(topologyPayload(generated)),
      puzzle:canonicalJson(generated.puzzle),
      topologyKeys:Object.keys(topologyPayload(generated)).sort(),
      generation:flags
    }));
    process.exit(contractOk?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}

const jobs=[];
for(let vi=0;vi<ids.length;vi++)for(let si=0;si<samplesPerVariant;si++)jobs.push({id:ids[vi],seed:(0x6b450000+vi*0x10000+si*0x1f3d)>>>0});
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id:job.id,seed:job.seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
  child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);let row;try{row=JSON.parse(lines.at(-1)||'');}catch{row={id:job.id,seed:job.seed,status:'WORKER_ERROR',stderr:err.trim().slice(0,400)};}resolve(row);});
});}
let next=0;
async function workerLoop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>workerLoop()));

const byVariant={},failures=[];
for(const id of ids){
  const vr=rows.filter(r=>r.id===id),exhausted=vr.filter(r=>r.status==='EXHAUSTED');
  const evaluated=vr.map(r=>r.status==='EXHAUSTED'?{...r,status:'FAIL'}:r);
  const result=summarizeProductionSamples(evaluated,{expectedSamples:samplesPerVariant,requireTopology:true,maxSampleMs:perSampleTimeoutMs});
  const failureSamples=vr.filter(r=>r.status!=='PASS').map(r=>({seed:r.seed,status:r.status,error:r.error,exact:r.exact,baseline:r.baseline,baselineKind:r.baselineKind,replayOk:r.replayOk,structuralMarkerOk:r.structuralMarkerOk,generation:r.generation}));
  const topologyKeys=[...new Set(vr.flatMap(r=>r.topologyKeys||[]))].sort();
  byVariant[id]={...result.summary,exhausted:exhausted.length,topologyKeys,failureReasons:result.failures,failureSamples};
  if(!result.pass)failures.push(id);
}
const pass=failures.length===0;
console.log('SKYSCRAPER_FAMILY_PRODUCTION_GATE '+JSON.stringify({samplesPerVariant,perSampleTimeoutMs,concurrency,byVariant,failures}));
console.log('SKYSCRAPER_FAMILY_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
