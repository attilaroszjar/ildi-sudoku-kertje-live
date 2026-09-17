import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalJson,structuralSolutionFingerprint} from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const id='miracle';
const samples=4;
const timeoutMs=15000;
const concurrency=2;
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
  for(const file of runtimeRefs()){
    const full=path.join(root,file);
    if(!fs.existsSync(full))throw new Error('runtime ref missing: '+file);
    vm.runInContext(fs.readFileSync(full,'utf8'),ctx,{filename:file});
  }
  if(!ctx.MiracleGeneratorHardening)throw new Error('Miracle production hardening missing from index.html runtime order');
  if(!ctx.SudokuGenerator||typeof ctx.SudokuGenerator.make!=='function')throw new Error('SudokuGenerator.make missing');
  const variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error('Miracle Sudoku missing from production bank');
  const kinds=[...(variant.kinds||[])].sort();
  const expected=['anti-king','anti-knight','nonconsecutive'].sort();
  if(canonicalJson(kinds)!==canonicalJson(expected))throw new Error('Miracle rule-set drift: '+canonicalJson(kinds));
  return {ctx,variant};
}
if(process.argv[2]==='--worker'){
  const seed=Number(process.argv[3])>>>0,started=Date.now();
  try{
    const {ctx,variant}=loadRuntime(),G=ctx.SudokuGenerator;
    const generated=G.make(variant,seed,'focused');
    const replay=G.make(variant,seed,'focused');
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const flags=generated.generation||{};
    const replayOk=canonicalJson({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===canonicalJson({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const markerOk=flags.generatorFamily==='miracle-seeded-full-solution-exact-verified';
    const contractOk=exact===1&&classic>1&&replayOk&&flags.unique===true&&flags.variantEssential===true&&markerOk;
    console.log(JSON.stringify({id,seed,status:contractOk?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,replayOk,markerOk,solution:canonicalJson(generated.solution),structure:structuralSolutionFingerprint(generated.solution),puzzle:canonicalJson(generated.puzzle),generation:flags}));
    process.exit(contractOk?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}
const jobs=Array.from({length:samples},(_,i)=>({seed:(0x6d690000+i*0x1f3d)>>>0})),rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id,seed:job.seed,status:'TIMEOUT',limitMs:timeoutMs});},timeoutMs);
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({id,seed:job.seed,status:'WORKER_ERROR',stderr:err.trim().slice(0,400)});}});
});}
let next=0;async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}await Promise.all(Array.from({length:concurrency},()=>loop()));
const passes=rows.filter(r=>r.status==='PASS');
const summary={samples:rows.length,passes:passes.length,timeouts:rows.filter(r=>r.status==='TIMEOUT').length,failures:rows.filter(r=>!['PASS','TIMEOUT'].includes(r.status)).length,solutionUnique:new Set(passes.map(r=>r.solution)).size,structuralSolutionUnique:new Set(passes.map(r=>r.structure)).size,topologyUnique:0,puzzleUnique:new Set(passes.map(r=>r.puzzle)).size,maxMs:passes.length?Math.max(...passes.map(r=>Number(r.ms)||0)):null,exhausted:rows.filter(r=>r.status==='EXHAUSTED').length};
const failureReasons=[];
if(summary.samples!==samples)failureReasons.push(`samples=${summary.samples}/${samples}`);
if(summary.passes!==samples)failureReasons.push(`passes=${summary.passes}/${samples}`);
if(summary.timeouts)failureReasons.push(`timeouts=${summary.timeouts}`);
if(summary.failures)failureReasons.push(`failures=${summary.failures}`);
if(summary.solutionUnique!==samples)failureReasons.push(`solutionUnique=${summary.solutionUnique}/${samples}`);
if(summary.structuralSolutionUnique!==1)failureReasons.push(`structuralSolutionUnique=${summary.structuralSolutionUnique}/1-certified-orbit`);
if(summary.puzzleUnique!==samples)failureReasons.push(`puzzleUnique=${summary.puzzleUnique}/${samples}`);
if(summary.maxMs!==null&&summary.maxMs>timeoutMs)failureReasons.push(`runtime>${timeoutMs}ms`);
const failureSamples=rows.filter(r=>r.status!=='PASS').map(r=>({seed:r.seed,status:r.status,error:r.error,exact:r.exact,classic:r.classic,replayOk:r.replayOk,markerOk:r.markerOk,generation:r.generation}));
const output={samples,timeoutMs,concurrency,structuralContract:'single certified Miracle solution orbit; see miracle-solution-space-audit.mjs',summary,failureReasons,failureSamples};
const pass=failureReasons.length===0;
console.log('MIRACLE_PRODUCTION_GATE '+JSON.stringify(output));
console.log('MIRACLE_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
