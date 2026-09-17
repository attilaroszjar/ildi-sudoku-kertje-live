import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['center-dot','frame','sukaku'];
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

function countSukakuSolutions(candidateGrid,limit=2){
  const n=9,full=(1<<n)-1,grid=Array.from({length:n},()=>Array(n).fill(0));
  const rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0);
  function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
  function maskFor(r,c){
    const allowed=(candidateGrid[r][c]||[]).reduce((m,d)=>m|(1<<(d-1)),0);
    return allowed&full&~(rows[r]|cols[c]|boxes[box(r,c)]);
  }
  let found=0;
  function visit(){
    if(found>=limit)return;
    let br=-1,bc=-1,bm=0,best=10;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const mask=maskFor(r,c);let count=0;for(let b=mask;b;b&=b-1)count++;
      if(!count)return;
      if(count<best){best=count;br=r;bc=c;bm=mask;if(count===1)break;}
    }
    if(br<0){found++;return;}
    const bx=box(br,bc);
    for(let bits=bm;bits;bits&=bits-1){
      const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
      grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[bx]|=one;
      visit();
      rows[br]^=one;cols[bc]^=one;boxes[bx]^=one;grid[br][bc]=0;
      if(found>=limit)return;
    }
  }
  visit();return found;
}

function clueCount(generated){
  if(Number.isFinite(Number(generated.generation&&generated.generation.clues)))return Number(generated.generation.clues);
  if(generated.id==='sukaku'&&generated.data&&generated.data.sourcePuzzle)return generated.data.sourcePuzzle.flat().filter(Boolean).length;
  return generated.puzzle.flat().filter(Boolean).length;
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0,difficulty=process.argv[5];
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  if(!variant){console.log(JSON.stringify({id,seed,difficulty,status:'MISSING_VARIANT'}));process.exit(1);}
  try{
    const generated=G.make(variant,seed,difficulty);
    const flags=generated.generation||{};
    let exact,classic;
    if(id==='sukaku'){
      exact=countSukakuSolutions(generated.data&&generated.data.candidates,2);
      classic=G.countSolutions((generated.data&&generated.data.sourcePuzzle)||generated.puzzle,2);
    }else{
      exact=G.countVariantSolutions(generated.puzzle,generated,2);
      classic=G.countSolutions(generated.puzzle,2);
    }
    const requiresEssential=id!=='sukaku';
    const pass=exact===1&&flags.unique===true&&(!requiresEssential||classic>1&&flags.variantEssential===true);
    console.log(JSON.stringify({id,seed,difficulty,status:pass?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,clues:clueCount(generated),score:Number(flags.difficultyScore)||0,exact,classic}));
    process.exit(pass?0:1);
  }catch(error){
    console.log(JSON.stringify({id,seed,difficulty,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)}));
    process.exit(1);
  }
}

function runWorker(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed),job.difficulty],{cwd:root,stdio:['ignore','pipe','pipe']});
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

const all=[];
for(const id of ids){
  const jobs=[];
  for(let i=0;i<samples;i++){
    const seed=(0x46340000+ids.indexOf(id)*0x10000+i*0x1f3d)>>>0;
    for(const difficulty of difficulties)jobs.push({id,seed,difficulty});
  }
  const rows=await runJobs(jobs);
  const byDifficulty={};
  for(const difficulty of difficulties){
    const rs=rows.filter(r=>r.difficulty===difficulty);
    const passed=rs.filter(r=>r.status==='PASS');
    byDifficulty[difficulty]={samples:rs.length,passes:passed.length,timeouts:rs.filter(r=>r.status==='TIMEOUT').length,failures:rs.filter(r=>!['PASS','TIMEOUT'].includes(r.status)).length,medianClues:passed.length?median(passed.map(r=>r.clues)):null,medianDifficultyScore:passed.length?median(passed.map(r=>r.score)):null,maxMs:passed.length?Math.max(...passed.map(r=>r.ms)):null};
  }
  const pairedClueOrder=Array.from({length:samples},(_,i)=>{
    const seed=(0x46340000+ids.indexOf(id)*0x10000+i*0x1f3d)>>>0;
    const g=rows.find(r=>r.seed===seed&&r.difficulty==='gentle');
    const f=rows.find(r=>r.seed===seed&&r.difficulty==='focused');
    const e=rows.find(r=>r.seed===seed&&r.difficulty==='expert');
    return g&&f&&e&&g.status==='PASS'&&f.status==='PASS'&&e.status==='PASS'&&g.clues>f.clues&&f.clues>e.clues;
  }).every(Boolean);
  const pass=pairedClueOrder&&difficulties.every(d=>byDifficulty[d].passes===samples&&byDifficulty[d].timeouts===0&&byDifficulty[d].failures===0);
  all.push({id,pass,byDifficulty,pairedClueOrder});
}

for(const r of all){
  const g=r.byDifficulty.gentle,f=r.byDifficulty.focused,e=r.byDifficulty.expert;
  console.log(`FINAL_THREE_DIFFICULTY ${r.id} ${r.pass?'PASS':'FAIL'} clues=${g.medianClues}>${f.medianClues}>${e.medianClues} scores=${g.medianDifficultyScore}/${f.medianDifficultyScore}/${e.medianDifficultyScore} maxMs=${Math.max(g.maxMs||0,f.maxMs||0,e.maxMs||0)}`);
}
const pass=all.every(r=>r.pass);
console.log('FINAL_THREE_DIFFICULTY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
