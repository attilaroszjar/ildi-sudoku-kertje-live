import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const id='anti-queen-9';
const difficulties=['gentle','focused','expert'];
const samples=4;
const timeoutMs=15000;
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

function clueCount(puzzle){return puzzle.flat().filter(Boolean).length;}

if(process.argv[2]==='--worker'){
  const seed=Number(process.argv[3])>>>0,difficulty=process.argv[4];
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  if(!variant){console.log(JSON.stringify({id,seed,difficulty,status:'MISSING_VARIANT'}));process.exit(1);}
  try{
    const generated=G.make(variant,seed,difficulty);
    const flags=generated.generation||{};
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const pass=exact===1&&classic>1&&flags.unique===true&&flags.variantEssential===true;
    console.log(JSON.stringify({id,seed,difficulty,status:pass?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,clues:clueCount(generated.puzzle),score:Number(flags.difficultyScore)||0,exact,classic}));
    process.exit(pass?0:1);
  }catch(error){
    console.log(JSON.stringify({id,seed,difficulty,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)}));
    process.exit(1);
  }
}

function runWorker(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',String(job.seed),job.difficulty],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT'});},timeoutMs);
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({...job,status:'WORKER_ERROR',error:err.trim().slice(0,200)});}});
});}

async function runJobs(jobs){
  const rows=[];let next=0;
  async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runWorker(jobs[i]);}}
  await Promise.all(Array.from({length:concurrency},()=>loop()));
  return rows;
}

function median(xs){const a=xs.slice().sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

const jobs=[];
for(let i=0;i<samples;i++){
  const seed=(0x41513900+i*0x1f3d)>>>0;
  for(const difficulty of difficulties)jobs.push({seed,difficulty});
}
const rows=await runJobs(jobs);
const byDifficulty={};
for(const difficulty of difficulties){
  const rs=rows.filter(r=>r.difficulty===difficulty);
  const passRows=rs.filter(r=>r.status==='PASS');
  byDifficulty[difficulty]={samples:rs.length,passes:passRows.length,timeouts:rs.filter(r=>r.status==='TIMEOUT').length,failures:rs.filter(r=>!['PASS','TIMEOUT'].includes(r.status)).length,medianClues:median(passRows.map(r=>r.clues)),medianDifficultyScore:median(passRows.map(r=>r.score)),maxMs:passRows.length?Math.max(...passRows.map(r=>r.ms)):null};
}
const pairedClueOrder=Array.from({length:samples},(_,i)=>{
  const seed=(0x41513900+i*0x1f3d)>>>0;
  const g=rows.find(r=>r.seed===seed&&r.difficulty==='gentle');
  const f=rows.find(r=>r.seed===seed&&r.difficulty==='focused');
  const e=rows.find(r=>r.seed===seed&&r.difficulty==='expert');
  return g&&f&&e&&g.status==='PASS'&&f.status==='PASS'&&e.status==='PASS'&&g.clues>f.clues&&f.clues>e.clues;
}).every(Boolean);
const pass=pairedClueOrder&&difficulties.every(d=>byDifficulty[d].passes===samples&&byDifficulty[d].timeouts===0&&byDifficulty[d].failures===0);
const g=byDifficulty.gentle,f=byDifficulty.focused,e=byDifficulty.expert;
console.log(`ANTI_QUEEN_9_DIFFICULTY ${pass?'PASS':'FAIL'} clues=${g.medianClues}>${f.medianClues}>${e.medianClues} scores=${g.medianDifficultyScore}/${f.medianDifficultyScore}/${e.medianDifficultyScore} maxMs=${Math.max(g.maxMs||0,f.maxMs||0,e.maxMs||0)}`);
console.log('ANTI_QUEEN_9_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
