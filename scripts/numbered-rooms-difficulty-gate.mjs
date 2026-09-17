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

function loadRuntime(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>/^games\/(?:sudoku-bank(?:-iteration\d+)?|sudoku-generator|iteration12-generator-hardening)\.js$/.test(x));
  const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of refs)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  const G=ctx.SudokuGenerator,variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id==='numbered-rooms');
  if(!G||typeof G.make!=='function')throw new Error('SudokuGenerator.make missing');
  if(!variant)throw new Error('Numbered Rooms missing');
  return {G,variant};
}

if(process.argv[2]==='--worker'){
  const difficulty=process.argv[3],seed=Number(process.argv[4])>>>0,started=Date.now();
  try{
    const {G,variant}=loadRuntime();
    const generated=G.make(variant,seed,difficulty),g=generated.generation||{};
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const valid=exact===1&&classic>1&&g.unique===true&&g.variantEssential===true;
    console.log(JSON.stringify({difficulty,seed,status:valid?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,clues:Number.isFinite(g.clues)?g.clues:null,difficultyScore:Number.isFinite(g.difficultyScore)?g.difficultyScore:null,generatorFamily:g.generatorFamily||null}));
    process.exit(valid?0:1);
  }catch(error){
    console.log(JSON.stringify({difficulty,seed,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)}));
    process.exit(1);
  }
}

function median(values){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)/2)]:null;}
const jobs=[];
for(let i=0;i<samplesPerDifficulty;i++){
  const seed=(0x6e720000+i*0x1f3d)>>>0;
  for(const difficulty of difficulties)jobs.push({difficulty,seed});
}
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.difficulty,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT',limitMs:timeoutMs});},timeoutMs);
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({...job,status:'WORKER_ERROR',stderr:err.trim().slice(0,240)});}});
});}
let next=0;
async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>loop()));

const byDifficulty={};let allValid=true;
for(const difficulty of difficulties){
  const vr=rows.filter(r=>r.difficulty===difficulty),passes=vr.filter(r=>r.status==='PASS');
  byDifficulty[difficulty]={samples:vr.length,passes:passes.length,timeouts:vr.filter(r=>r.status==='TIMEOUT').length,failures:vr.filter(r=>r.status!=='PASS').length,medianClues:median(passes.map(r=>r.clues)),medianDifficultyScore:median(passes.map(r=>r.difficultyScore)),maxMs:passes.length?Math.max(...passes.map(r=>r.ms)):null};
  if(passes.length!==samplesPerDifficulty)allValid=false;
}
const seeds=[...new Set(rows.map(r=>r.seed))];
const pairedClueOrder=seeds.length===samplesPerDifficulty&&seeds.every(seed=>{
  const trio=Object.fromEntries(difficulties.map(d=>[d,rows.find(r=>r.difficulty===d&&r.seed===seed)]));
  return difficulties.every(d=>trio[d]&&trio[d].status==='PASS'&&Number.isFinite(trio[d].clues))&&trio.gentle.clues>trio.focused.clues&&trio.focused.clues>trio.expert.clues;
});
const pass=allValid&&pairedClueOrder;
console.log('NUMBERED_ROOMS_DIFFICULTY_GATE '+JSON.stringify({samplesPerDifficulty,timeoutMs,concurrency,byDifficulty,orderingBasis:'paired-givens-pressure',pairedClueOrder,failures:rows.filter(r=>r.status!=='PASS')}));
console.log('NUMBERED_ROOMS_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
