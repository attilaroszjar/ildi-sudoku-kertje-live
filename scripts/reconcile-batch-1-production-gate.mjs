import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalJson, structuralSolutionFingerprint, summarizeProductionSamples } from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['little-killer','clone','quadruple'];
const samplesPerVariant=4;
const perSampleTimeoutMs=15000;
const concurrency=3;
const self=fileURLToPath(import.meta.url);

function loadRuntime(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const bankRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
  const files=[...bankRefs,'games/sudoku-generator.js','games/quadruple-runtime-hardening.js','games/little-killer-runtime-hardening.js'];
  const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  return ctx;
}

function topologyFingerprint(id,generated){
  const data=generated.data||{};
  if(id==='little-killer')return canonicalJson(data.clues||[]);
  if(id==='clone')return canonicalJson(data.clones||[]);
  if(id==='quadruple')return canonicalJson(data.quads||[]);
  throw new Error('missing topology adapter for '+id);
}

function exactCount(G,id,generated){
  if(id==='little-killer')return G.countLittleKillerSolutions(generated.puzzle,generated,2);
  if(id==='quadruple')return G.countQuadrupleSolutions(generated.puzzle,(generated.data||{}).quads||[],2);
  return G.countVariantSolutions(generated.puzzle,generated,2);
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  if(!variant){console.log(JSON.stringify({id,seed,status:'MISSING_VARIANT'}));process.exit(1);}
  try{
    const generated=G.make(variant,seed,'focused');
    const replay=G.make(variant,seed,'focused');
    const exact=exactCount(G,id,generated),classic=G.countSolutions(generated.puzzle,2);
    const replayOk=canonicalJson({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===canonicalJson({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const flags=generated.generation||{};
    const contractOk=exact===1&&classic>1&&replayOk&&flags.unique===true&&flags.variantEssential===true;
    const row={id,seed,status:contractOk?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,replayOk,solution:canonicalJson(generated.solution),structure:structuralSolutionFingerprint(generated.solution),topology:topologyFingerprint(id,generated),puzzle:canonicalJson(generated.puzzle),generation:flags};
    console.log(JSON.stringify(row));process.exit(contractOk?0:1);
  }catch(error){
    const message=String(error&&error.message||error),exhausted=/GENERATION_EXHAUSTED|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));process.exit(exhausted?0:1);
  }
}

const jobs=[];
for(let vi=0;vi<ids.length;vi++)for(let si=0;si<samplesPerVariant;si++)jobs.push({id:ids[vi],seed:(0x6b310000+vi*0x10000+si*0x1f3d)>>>0});
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id:job.id,seed:job.seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
  child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);let row;try{row=JSON.parse(lines.at(-1)||'');}catch{row={id:job.id,seed:job.seed,status:'WORKER_ERROR',stderr:err.trim().slice(0,240)};}resolve(row);});
});}
let next=0;
async function workerLoop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>workerLoop()));

const byVariant={},failures=[];
for(const id of ids){
  const vr=rows.filter(r=>r.id===id),exhausted=vr.filter(r=>r.status==='EXHAUSTED');
  const evaluated=vr.map(r=>r.status==='EXHAUSTED'?{...r,status:'FAIL'}:r);
  const result=summarizeProductionSamples(evaluated,{expectedSamples:samplesPerVariant,requireTopology:true,maxSampleMs:perSampleTimeoutMs});
  byVariant[id]={...result.summary,exhausted:exhausted.length,failureReasons:result.failures};
  if(!result.pass)failures.push(id);
}
const pass=failures.length===0;
console.log('RECONCILE_BATCH_1_PRODUCTION_GATE '+JSON.stringify({samplesPerVariant,perSampleTimeoutMs,concurrency,byVariant,failures}));
console.log('RECONCILE_BATCH_1_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
