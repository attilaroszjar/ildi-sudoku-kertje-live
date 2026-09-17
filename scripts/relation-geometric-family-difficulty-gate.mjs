import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['couples','reflection','slingshot','bishopsgate','axia'];
const difficulties=['gentle','focused','expert'];
const samplesPerDifficulty=4;
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

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0,difficulty=process.argv[5];
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  try{
    const generated=G.make(variant,seed,difficulty);
    const replay=G.make(variant,seed,difficulty);
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const replayOk=JSON.stringify({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===JSON.stringify({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const flags=generated.generation||{};
    const clues=generated.puzzle.flat().filter(Boolean).length;
    const pass=exact===1&&classic>1&&replayOk&&flags.unique===true&&flags.variantEssential===true;
    console.log(JSON.stringify({id,seed,difficulty,status:pass?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,clues,difficultyScore:Number(flags.difficultyScore)||0,exact,classic,replayOk}));
    process.exit(pass?0:1);
  }catch(error){
    console.log(JSON.stringify({id,seed,difficulty,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)}));
    process.exit(1);
  }
}

function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

async function runVariant(id){
  const jobs=[];
  const base=(0x52474400+ids.indexOf(id)*0x10000)>>>0;
  for(let i=0;i<samplesPerDifficulty;i++)for(const difficulty of difficulties)jobs.push({id,difficulty,seed:(base+i*0x1f3d)>>>0});
  const rows=[];let next=0;
  function runJob(job){return new Promise(resolve=>{
    const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed),job.difficulty],{cwd:root,stdio:['ignore','pipe','pipe']});
    let out='',done=false;
    const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT',ms:timeoutMs});},timeoutMs);
    child.stdout.on('data',d=>{out+=d;});
    child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({...job,status:'WORKER_ERROR'});}});
  });}
  async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
  await Promise.all(Array.from({length:concurrency},()=>loop()));
  const byDifficulty={};
  for(const difficulty of difficulties){
    const subset=rows.filter(r=>r.difficulty===difficulty);
    const passRows=subset.filter(r=>r.status==='PASS');
    byDifficulty[difficulty]={samples:subset.length,passes:passRows.length,timeouts:subset.filter(r=>r.status==='TIMEOUT').length,failures:subset.filter(r=>!['PASS','TIMEOUT'].includes(r.status)).length,medianClues:passRows.length?median(passRows.map(r=>r.clues)):null,medianDifficultyScore:passRows.length?median(passRows.map(r=>r.difficultyScore)):null,maxMs:passRows.length?Math.max(...passRows.map(r=>r.ms)):null};
  }
  const paired=[];
  for(let i=0;i<samplesPerDifficulty;i++){
    const seed=(base+i*0x1f3d)>>>0;
    const r={};
    for(const d of difficulties)r[d]=rows.find(x=>x.seed===seed&&x.difficulty===d);
    paired.push(r);
  }
  const pairedClueOrder=paired.every(r=>r.gentle?.status==='PASS'&&r.focused?.status==='PASS'&&r.expert?.status==='PASS'&&r.gentle.clues>r.focused.clues&&r.focused.clues>r.expert.clues);
  const pass=difficulties.every(d=>byDifficulty[d].passes===samplesPerDifficulty&&byDifficulty[d].timeouts===0&&byDifficulty[d].failures===0)&&pairedClueOrder;
  return {id,pass,byDifficulty,pairedClueOrder};
}

const results=[];
for(const id of ids)results.push(await runVariant(id));
const pass=results.every(r=>r.pass);
console.log('RELATION_GEOMETRIC_FAMILY_DIFFICULTY_GATE '+JSON.stringify({variants:ids.length,samplesPerDifficulty,timeoutMs,results}));
for(const r of results){
  const g=r.byDifficulty.gentle,f=r.byDifficulty.focused,e=r.byDifficulty.expert;
  console.log(`RELATION_GEOMETRIC_DIFFICULTY ${r.id} ${r.pass?'PASS':'FAIL'} clues=${g.medianClues}>${f.medianClues}>${e.medianClues} scores=${g.medianDifficultyScore}/${f.medianDifficultyScore}/${e.medianDifficultyScore} maxMs=${Math.max(g.maxMs||0,f.maxMs||0,e.maxMs||0)}`);
}
console.log('RELATION_GEOMETRIC_FAMILY_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
