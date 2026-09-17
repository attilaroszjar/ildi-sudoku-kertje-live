import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const difficulties=['gentle','focused','expert'];
const samplesPerDifficulty=4;
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
  const G=ctx.SudokuGenerator,variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id==='miracle');
  if(!G||typeof G.make!=='function')throw new Error('SudokuGenerator.make missing');
  if(!variant)throw new Error('Miracle Sudoku missing');
  return {G,variant};
}

if(process.argv[2]==='--worker'){
  const difficulty=process.argv[3],seed=Number(process.argv[4])>>>0,started=Date.now();
  try{
    const {G,variant}=loadRuntime();
    const generated=G.make(variant,seed,difficulty),g=generated.generation||{};
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const markerOk=g.generatorFamily==='miracle-seeded-full-solution-exact-verified';
    const valid=exact===1&&classic>1&&g.unique===true&&g.variantEssential===true&&markerOk;
    console.log(JSON.stringify({difficulty,seed,status:valid?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,markerOk,clues:Number.isFinite(g.clues)?g.clues:null,difficultyScore:Number.isFinite(g.difficultyScore)?g.difficultyScore:null,solutionAttempt:g.solutionAttempt,solutionNodes:g.solutionNodes,generatorFamily:g.generatorFamily||null}));
    process.exit(valid?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({difficulty,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}

function median(values){
  const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(!sorted.length)return null;
  return sorted[Math.floor((sorted.length-1)/2)];
}

const jobs=[];
for(let i=0;i<samplesPerDifficulty;i++){
  const seed=(0x6d640000+i*0x1f3d)>>>0;
  for(const difficulty of difficulties)jobs.push({difficulty,seed});
}
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.difficulty,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT',limitMs:timeoutMs});},timeoutMs);
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({...job,status:'WORKER_ERROR',stderr:err.trim().slice(0,400)});}});
});}
let next=0;
async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>loop()));

const byDifficulty={};let allValid=true;
for(const difficulty of difficulties){
  const vr=rows.filter(r=>r.difficulty===difficulty),passes=vr.filter(r=>r.status==='PASS');
  byDifficulty[difficulty]={samples:vr.length,passes:passes.length,timeouts:vr.filter(r=>r.status==='TIMEOUT').length,failures:vr.filter(r=>r.status!=='PASS').length,medianClues:median(passes.map(r=>r.clues)),medianDifficultyScore:median(passes.map(r=>r.difficultyScore)),maxMs:passes.length?Math.max(...passes.map(r=>r.ms)):null,maxSolutionNodes:passes.length?Math.max(...passes.map(r=>Number(r.solutionNodes)||0)):null};
  if(passes.length!==samplesPerDifficulty)allValid=false;
}
const gc=byDifficulty.gentle.medianClues,fc=byDifficulty.focused.medianClues,ec=byDifficulty.expert.medianClues;
const gentleScore=byDifficulty.gentle.medianDifficultyScore,focusedScore=byDifficulty.focused.medianDifficultyScore,expertScore=byDifficulty.expert.medianDifficultyScore;
const clueOrder=[gc,fc,ec].every(Number.isFinite)&&gc>fc&&fc>ec;
const scoreOrderDiagnostic=[gentleScore,focusedScore,expertScore].every(Number.isFinite)&&gentleScore<focusedScore&&focusedScore<expertScore;
const seeds=[...new Set(rows.map(r=>r.seed))];
const pairedClueOrder=seeds.length===samplesPerDifficulty&&seeds.every(seed=>{
  const trio=Object.fromEntries(difficulties.map(d=>[d,rows.find(r=>r.difficulty===d&&r.seed===seed)]));
  return difficulties.every(d=>trio[d]&&trio[d].status==='PASS'&&Number.isFinite(trio[d].clues))&&trio.gentle.clues>trio.focused.clues&&trio.focused.clues>trio.expert.clues;
});
const pass=allValid&&clueOrder&&pairedClueOrder;
const output={samplesPerDifficulty,timeoutMs,concurrency,byDifficulty,orderingBasis:'paired-givens-pressure',clueOrder,pairedClueOrder,scoreOrderDiagnostic,failures:rows.filter(r=>r.status!=='PASS')};
console.log('MIRACLE_DIFFICULTY_GATE '+JSON.stringify(output));
console.log('MIRACLE_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
