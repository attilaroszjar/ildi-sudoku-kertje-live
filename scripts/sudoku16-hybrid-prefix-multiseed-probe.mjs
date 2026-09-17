import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workerFlag='--worker';
const seeds=[93000,93001,93002,93003,93004];
const prefixes=[32,64,96];
const timeoutMs=8000;

function rounded(x){return +x.toFixed(3);}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

if(process.argv[2]===workerFlag){
  const seed=Number(process.argv[3]);
  const prefixLength=Number(process.argv[4]);
  function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
  function cloneGrid(grid){return grid.map(row=>row.slice());}
  function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
  function countGivens(grid){return grid.flat().filter(Boolean).length;}

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
  load('games/p3-size-control.js');
  if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('production 16x16 DLX missing');
  const initial=cloneGrid(base.puzzle),n=16;
  const givens=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(initial[r][c])givens.push(r*n+c);

  const seeded=shuffle(givens.slice(),mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));
  const groups=Array.from({length:16},()=>[]);
  for(const idx of seeded){const r=Math.floor(idx/n),c=idx%n,b=((r>>2)<<2)+(c>>2);groups[b].push(idx);}
  const balanced=[];let pos=0,remaining=true;
  while(remaining){remaining=false;for(let b=0;b<16;b++){if(pos<groups[b].length){balanced.push(groups[b][pos]);remaining=true;}}pos++;}
  const prefix=balanced.slice(0,Math.min(prefixLength,balanced.length));
  const used=new Set(prefix);
  const order=prefix.concat(seeded.filter(idx=>!used.has(idx)));

  const grid=cloneGrid(initial);let accepted=0,rejected=0;const calls=[];
  const t0=performance.now();
  for(let i=0;i<order.length;i++){
    const idx=order[i],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const stats={},c0=performance.now(),count=G.countLargeClassicSolutionsExact(grid,2,stats),ms=performance.now()-c0;
    const keep=count===1;
    calls.push({index:i,cell:[r,c],givens:countGivens(grid),ms,count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,accepted:keep});
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={},v0=performance.now(),unique=G.countLargeClassicSolutionsExact(grid,2,finalStats)===1,verificationMs=performance.now()-v0;
  const worstCall=calls.slice().sort((a,b)=>b.ms-a.ms)[0]||null;
  emit('SUDOKU16_HYBRID_PREFIX_SAMPLE',{seed,prefixLength,generationMs:rounded(performance.now()-t0),finalGivens:countGivens(grid),accepted,rejected,unique,verificationMs:rounded(verificationMs),finalStats,worstCall:worstCall?{...worstCall,ms:rounded(worstCall.ms)}:null});
  process.exit(unique?0:2);
}

const results=[];
for(const prefixLength of prefixes){
  for(const seed of seeds){
    const p=spawnSync(process.execPath,[fileURLToPath(import.meta.url),workerFlag,String(seed),String(prefixLength)],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024*4});
    if(p.error&&p.error.code==='ETIMEDOUT'){
      emit('SUDOKU16_HYBRID_PREFIX_TIMEOUT',{seed,prefixLength,timeout:true,timeoutMs});
      results.push({seed,prefixLength,timeout:true});
      continue;
    }
    const lines=(p.stdout||'').trim().split(/\r?\n/).filter(Boolean);
    const line=lines.find(x=>x.startsWith('SUDOKU16_HYBRID_PREFIX_SAMPLE '));
    if(!line){
      emit('SUDOKU16_HYBRID_PREFIX_ERROR',{seed,prefixLength,status:p.status,stderr:(p.stderr||'').slice(0,500)});
      results.push({seed,prefixLength,error:true});
      continue;
    }
    console.log(line);
    const data=JSON.parse(line.slice('SUDOKU16_HYBRID_PREFIX_SAMPLE '.length));
    results.push(data);
  }
}
const summary=prefixes.map(prefixLength=>{
  const rows=results.filter(x=>x.prefixLength===prefixLength),done=rows.filter(x=>!x.timeout&&!x.error),times=done.map(x=>x.generationMs).sort((a,b)=>a-b);
  return {prefixLength,completed:done.length,timeouts:rows.filter(x=>x.timeout).length,errors:rows.filter(x=>x.error).length,minMs:times.length?times[0]:null,medianMs:times.length?times[Math.floor(times.length/2)]:null,maxMs:times.length?times[times.length-1]:null,givens:done.length?{min:Math.min(...done.map(x=>x.finalGivens)),max:Math.max(...done.map(x=>x.finalGivens))}:null,allUnique:done.every(x=>x.unique===true)};
});
emit('SUDOKU16_HYBRID_PREFIX_MULTI_SEED',{seeds,prefixes,timeoutMs,summary});
console.log('SUDOKU16_HYBRID_PREFIX_MULTI_SEED:PASS');
