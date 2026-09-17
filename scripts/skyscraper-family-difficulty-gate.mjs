import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=[
  'skyscraper','diagonal-skyscrapers','inside-skyscrapers','killer-skyscrapers','product-skyscrapers',
  'skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','skyscraper-sums','sum-skyscraper-parks'
];
const difficulties=['gentle','focused','expert'];
const samplesPerDifficulty=4;
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
  for(const file of runtimeRefs()){
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

function auditCounts(G,variant,generated){
  if(variant.kind==='skyscraperparks'||variant.kind==='sumskyscraperparks'){
    if(typeof G.countParkSolutions!=='function')throw new Error('countParkSolutions missing for '+variant.id);
    return {exact:G.countParkSolutions(generated.puzzle,generated,2,false),baseline:G.countParkSolutions(generated.puzzle,generated,2,true)};
  }
  return {exact:G.countVariantSolutions(generated.puzzle,generated,2),baseline:G.countSolutions(generated.puzzle,2)};
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],difficulty=process.argv[4],seed=Number(process.argv[5])>>>0;
  const started=Date.now();
  try{
    const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id);
    const generated=G.make(variant,seed,difficulty),counts=auditCounts(G,variant,generated),g=generated.generation||{};
    const valid=counts.exact===1&&counts.baseline>1&&g.unique===true&&g.variantEssential===true;
    console.log(JSON.stringify({id,difficulty,seed,status:valid?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact:counts.exact,baseline:counts.baseline,clues:Number.isFinite(g.clues)?g.clues:null,difficultyScore:Number.isFinite(g.difficultyScore)?g.difficultyScore:null,generatorFamily:g.generatorFamily||null,difficultyCalibration:g.difficultyCalibration||null}));
    process.exit(valid?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,difficulty,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}

function median(values){
  const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(!sorted.length)return null;
  return sorted[Math.floor((sorted.length-1)/2)];
}

const jobs=[];
for(let vi=0;vi<ids.length;vi++)for(let si=0;si<samplesPerDifficulty;si++){
  const seed=(0x6c550000+vi*0x10000+si*0x1f3d)>>>0;
  for(const difficulty of difficulties)jobs.push({id:ids[vi],difficulty,seed});
}
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,job.difficulty,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
  child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);let row;try{row=JSON.parse(lines.at(-1)||'');}catch{row={...job,status:'WORKER_ERROR',stderr:err.trim().slice(0,400)};}resolve(row);});
});}
let next=0;
async function workerLoop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>workerLoop()));

const byVariant={},failures=[];
for(const id of ids){
  const summary={};
  let allValid=true;
  for(const difficulty of difficulties){
    const vr=rows.filter(r=>r.id===id&&r.difficulty===difficulty),passes=vr.filter(r=>r.status==='PASS');
    summary[difficulty]={samples:vr.length,passes:passes.length,timeouts:vr.filter(r=>r.status==='TIMEOUT').length,failures:vr.filter(r=>r.status!=='PASS').length,medianClues:median(passes.map(r=>r.clues)),medianDifficultyScore:median(passes.map(r=>r.difficultyScore)),maxMs:passes.length?Math.max(...passes.map(r=>r.ms)):null};
    if(passes.length!==samplesPerDifficulty)allValid=false;
  }
  const gc=summary.gentle.medianClues,fc=summary.focused.medianClues,ec=summary.expert.medianClues;
  const gs=summary.gentle.medianDifficultyScore,fs=summary.focused.medianDifficultyScore,es=summary.expert.medianDifficultyScore;
  const clueOrder=[gc,fc,ec].every(Number.isFinite)&&gc>fc&&fc>ec;
  const scoreOrder=[gs,fs,es].every(Number.isFinite)&&gs<fs&&fs<es;
  const seeds=[...new Set(rows.filter(r=>r.id===id).map(r=>r.seed))];
  const pairedClueOrder=seeds.length===samplesPerDifficulty&&seeds.every(seed=>{
    const trio=Object.fromEntries(difficulties.map(d=>[d,rows.find(r=>r.id===id&&r.difficulty===d&&r.seed===seed)]));
    return difficulties.every(d=>trio[d]&&trio[d].status==='PASS'&&Number.isFinite(trio[d].clues))&&trio.gentle.clues>trio.focused.clues&&trio.focused.clues>trio.expert.clues;
  });
  const pass=allValid&&clueOrder&&pairedClueOrder;
  byVariant[id]={...summary,orderingBasis:'paired-givens-pressure',clueOrder,pairedClueOrder,scoreOrderDiagnostic:scoreOrder,pass};
  if(!pass)failures.push(id);
}
const pass=failures.length===0;
console.log('SKYSCRAPER_FAMILY_DIFFICULTY_GATE '+JSON.stringify({samplesPerDifficulty,perSampleTimeoutMs,concurrency,byVariant,failures}));
console.log('SKYSCRAPER_FAMILY_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
