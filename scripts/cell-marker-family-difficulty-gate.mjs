import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['battenburg','minmax','quad-sums','top-heavy-parity'];
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
  if(!ctx.SudokuGenerator||typeof ctx.SudokuGenerator.make!=='function')throw new Error('SudokuGenerator.make missing');
  return ctx;
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],difficulty=process.argv[4],seed=Number(process.argv[5])>>>0,started=Date.now();
  try{
    const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id===id);
    if(!variant)throw new Error(id+' missing');
    const generated=G.make(variant,seed,difficulty),g=generated.generation||{};
    const exact=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const valid=exact===1&&classic>1&&g.unique===true&&g.variantEssential===true;
    console.log(JSON.stringify({id,difficulty,seed,status:valid?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,clues:Number.isFinite(g.clues)?g.clues:null,difficultyScore:Number.isFinite(g.difficultyScore)?g.difficultyScore:null,generatorFamily:g.generatorFamily||null}));
    process.exit(valid?0:1);
  }catch(error){
    console.log(JSON.stringify({id,difficulty,seed,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)}));
    process.exit(1);
  }
}

function median(values){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)/2)]:null;}
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,job.difficulty,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({...job,status:'TIMEOUT',limitMs:timeoutMs});},timeoutMs);
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({...job,status:'WORKER_ERROR',stderr:err.trim().slice(0,240)});}});
});}

async function runVariant(id){
  const jobs=[];
  const base=(0x434d4400+ids.indexOf(id)*0x10000)>>>0;
  for(let i=0;i<samplesPerDifficulty;i++){
    const seed=(base+i*0x1f3d)>>>0;
    for(const difficulty of difficulties)jobs.push({id,difficulty,seed});
  }
  const rows=[];let next=0;
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
  return {id,pass:allValid&&pairedClueOrder,byDifficulty,pairedClueOrder,failures:rows.filter(r=>r.status!=='PASS')};
}

const results=[];
for(const id of ids)results.push(await runVariant(id));
const pass=results.every(r=>r.pass);
console.log('CELL_MARKER_FAMILY_DIFFICULTY_GATE '+JSON.stringify({variants:ids.length,samplesPerDifficulty,timeoutMs,concurrency,orderingBasis:'paired-givens-pressure',results}));
for(const r of results){
  const g=r.byDifficulty.gentle,f=r.byDifficulty.focused,e=r.byDifficulty.expert;
  console.log(`CELL_MARKER_DIFFICULTY ${r.id} ${r.pass?'PASS':'FAIL'} clues=${g.medianClues}>${f.medianClues}>${e.medianClues} scores=${g.medianDifficultyScore}/${f.medianDifficultyScore}/${e.medianDifficultyScore} maxMs=${Math.max(g.maxMs||0,f.maxMs||0,e.maxMs||0)}`);
}
console.log('CELL_MARKER_FAMILY_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
