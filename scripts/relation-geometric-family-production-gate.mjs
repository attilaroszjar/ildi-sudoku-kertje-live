import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalJson,structuralSolutionFingerprint,summarizeProductionSamples} from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['couples','reflection','slingshot','bishopsgate','axia'];
const samples=4;
const perSampleTimeoutMs=15000;
const concurrency=2;
const self=fileURLToPath(import.meta.url);

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  return [...index.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m=>m[1])
    .filter(x=>x==='games/sudoku-generator.js'||/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||/^games\/[^/]*(?:generator-core|generator-hardening)\.js$/.test(x));
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,Date,JSON,Array,Object,Number,String,Boolean,RegExp,Error,TypeError,Uint8Array,Uint16Array,Uint32Array,Int32Array};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of runtimeRefs())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  return ctx;
}

function topology(generated){
  if(generated.id==='bishopsgate'||generated.kind==='bishopsgate')return canonicalJson({fixedRule:'checkerboard-bishop-diagonal',parity:(generated.data&&generated.data.parity)??0});
  return canonicalJson(generated.data||{});
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  if(!variant){console.log(JSON.stringify({id,seed,status:'MISSING_VARIANT'}));process.exit(1);}
  try{
    const generated=G.make(variant,seed,'focused');
    const replay=G.make(variant,seed,'focused');
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const replayOk=canonicalJson({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===canonicalJson({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const flags=generated.generation||{};
    const contractOk=exact===1&&classic>1&&replayOk&&flags.unique===true&&flags.variantEssential===true;
    console.log(JSON.stringify({id,seed,status:contractOk?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,replayOk,solution:canonicalJson(generated.solution),structure:structuralSolutionFingerprint(generated.solution),topology:topology(generated),puzzle:canonicalJson(generated.puzzle),generation:flags}));
    process.exit(contractOk?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}

async function runVariant(id){
  const jobs=Array.from({length:samples},(_,i)=>({id,seed:(0x52470000+ids.indexOf(id)*0x10000+i*0x1f3d)>>>0}));
  const rows=[];let next=0;
  function runJob(job){return new Promise(resolve=>{
    const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
    let out='',err='',done=false;
    const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id:job.id,seed:job.seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
    child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});
    child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);let row;try{row=JSON.parse(lines.at(-1)||'');}catch{row={id:job.id,seed:job.seed,status:'WORKER_ERROR',stderr:err.trim().slice(0,240)};}resolve(row);});
  });}
  async function workerLoop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
  await Promise.all(Array.from({length:concurrency},()=>workerLoop()));
  const exhausted=rows.filter(r=>r.status==='EXHAUSTED');
  const evaluated=rows.map(r=>r.status==='EXHAUSTED'?{...r,status:'FAIL'}:r);
  const fixedTopology=id==='bishopsgate';
  const result=summarizeProductionSamples(evaluated,{expectedSamples:samples,requireTopology:!fixedTopology,maxSampleMs:perSampleTimeoutMs});
  const fixedRuleCertificate=!fixedTopology||(result.summary.topologyUnique===1&&evaluated.filter(r=>r.status==='PASS').length===samples);
  const pass=result.pass&&fixedRuleCertificate;
  const failures=[...result.failures];
  if(!fixedRuleCertificate)failures.push('bishopsgate fixed-rule topology certificate failed');
  return {id,pass,report:{...result.summary,fixedRuleCertificate:fixedTopology?fixedRuleCertificate:null,exhausted:exhausted.length,failureReasons:failures,failureSamples:rows.filter(r=>r.status!=='PASS').map(r=>({seed:r.seed,status:r.status,exact:r.exact,classic:r.classic,replayOk:r.replayOk,error:r.error}))}};
}

const results=[];
for(const id of ids)results.push(await runVariant(id));
const pass=results.every(r=>r.pass);
console.log('RELATION_GEOMETRIC_FAMILY_PRODUCTION_GATE '+JSON.stringify({variants:ids.length,samplesPerVariant:samples,perSampleTimeoutMs,results}));
for(const r of results){
  const certificate=r.id==='bishopsgate'?` fixedRule=${r.report.fixedRuleCertificate?'PASS':'FAIL'}`:'';
  console.log(`RELATION_GEOMETRIC ${r.id} ${r.pass?'PASS':'FAIL'} solution=${r.report.solutionUnique}/${samples} structural=${r.report.structuralSolutionUnique}/${samples} topology=${r.report.topologyUnique}/${samples} puzzle=${r.report.puzzleUnique}/${samples} maxMs=${r.report.maxMs}${certificate}`);
}
console.log('RELATION_GEOMETRIC_FAMILY_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
