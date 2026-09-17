import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const self=fileURLToPath(import.meta.url);
const worker=process.argv[2]==='--worker';
const seeds=[93000,93001,93002,93003,93004];
const policies=['balanced-seeded','balanced-rotating','balanced-seeded-boxes'];
const timeoutMs=8000;

function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function countGivens(grid){return grid.flat().filter(Boolean).length;}
function rounded(x){return +x.toFixed(3);}
function boxIndex(idx){const r=Math.floor(idx/16),c=idx%16;return ((r>>2)<<2)+(c>>2);}

function makeOrder(givens,seed,policy){
  const random=mulberry32(((seed>>>0)^0x16E4A7C5)>>>0);
  const global=shuffle(givens.slice(),random);
  const groups=Array.from({length:16},()=>[]);
  for(const idx of global)groups[boxIndex(idx)].push(idx);
  let boxOrder=Array.from({length:16},(_,i)=>i);
  if(policy==='balanced-seeded-boxes')boxOrder=shuffle(boxOrder,mulberry32(((seed>>>0)^0xB0A5EED)>>>0));
  if(policy==='balanced-rotating'){
    const start=(seed>>>0)%16;
    boxOrder=boxOrder.map((_,i)=>(start+i)%16);
  }
  const out=[];let pos=0,remaining=true;
  while(remaining){
    remaining=false;
    for(const b of boxOrder){if(pos<groups[b].length){out.push(groups[b][pos]);remaining=true;}}
    pos++;
  }
  return out;
}

function runWorker(seed,policy){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of banks)load(ref);
  load('games/sudoku-generator.js');
  const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
  const variant=B.find(v=>v.id==='sudoku-16x16');
  if(!G||!variant)throw new Error('16x16 runtime missing');
  const base=G.make(variant,seed,'expert');
  if(!base||!Array.isArray(base.puzzle))throw new Error('base generation failed');
  load('games/p3-size-control.js');
  if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('production 16x16 DLX missing');
  const initial=cloneGrid(base.puzzle),givens=[];
  for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(initial[r][c])givens.push(r*16+c);
  const order=makeOrder(givens,seed,policy),grid=cloneGrid(initial);
  let accepted=0,rejected=0,worst=null;
  const t0=performance.now();
  for(let i=0;i<order.length;i++){
    const idx=order[i],r=Math.floor(idx/16),c=idx%16,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const stats={},c0=performance.now(),count=G.countLargeClassicSolutionsExact(grid,2,stats),ms=performance.now()-c0;
    const keep=count===1;
    const call={index:i,cell:[r,c],givens:countGivens(grid),ms:rounded(ms),count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,accepted:keep};
    if(!worst||ms>worst.ms)worst=call;
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={},v0=performance.now(),unique=G.countLargeClassicSolutionsExact(grid,2,finalStats)===1,verificationMs=performance.now()-v0;
  const result={seed,policy,generationMs:rounded(performance.now()-t0),finalGivens:countGivens(grid),accepted,rejected,unique,verificationMs:rounded(verificationMs),finalStats,worstCall:worst};
  console.log('SUDOKU16_BALANCED_ORDER_SAMPLE '+JSON.stringify(result));
  if(!unique)process.exitCode=2;
}

if(worker){
  runWorker(Number(process.argv[3]),String(process.argv[4]));
}else{
  const rows=[];
  for(const policy of policies){
    for(const seed of seeds){
      const child=spawnSync(process.execPath,[self,'--worker',String(seed),policy],{encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024});
      const timedOut=child.error&&child.error.code==='ETIMEDOUT';
      if(timedOut){
        const row={seed,policy,timeout:true,timeoutMs};rows.push(row);console.log('SUDOKU16_BALANCED_ORDER_TIMEOUT '+JSON.stringify(row));continue;
      }
      if(child.stdout)process.stdout.write(child.stdout);
      if(child.stderr)process.stderr.write(child.stderr);
      const line=(child.stdout||'').split(/\r?\n/).find(x=>x.startsWith('SUDOKU16_BALANCED_ORDER_SAMPLE '));
      if(child.status!==0||!line)throw new Error(`worker failed seed=${seed} policy=${policy} status=${child.status}`);
      rows.push(JSON.parse(line.slice('SUDOKU16_BALANCED_ORDER_SAMPLE '.length)));
    }
  }
  const summary=policies.map(policy=>{
    const xs=rows.filter(x=>x.policy===policy),ok=xs.filter(x=>!x.timeout),times=ok.map(x=>x.generationMs).sort((a,b)=>a-b);
    return {policy,completed:ok.length,timeouts:xs.length-ok.length,minMs:times[0]??null,medianMs:times.length?times[Math.floor(times.length/2)]:null,maxMs:times.length?times[times.length-1]:null,givens:ok.length?{min:Math.min(...ok.map(x=>x.finalGivens)),max:Math.max(...ok.map(x=>x.finalGivens))}:null,allUnique:ok.every(x=>x.unique===true)};
  });
  console.log('SUDOKU16_BALANCED_ORDER_MULTI_SEED '+JSON.stringify({seeds,timeoutMs,summary}));
  console.log('SUDOKU16_BALANCED_ORDER_MULTI_SEED:PASS');
}
