import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93000);
function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function countGivens(grid){return grid.flat().filter(Boolean).length;}
function rounded(x){return +x.toFixed(3);}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

function count16KnownSolution(source,known,limit=2,stats){
  limit=Math.max(1,Number(limit)||2);
  if(!Array.isArray(source)||source.length!==16||!Array.isArray(known)||known.length!==16)return 0;
  const n=16,totalCols=1024,full=0xFFFF;
  const rowMask=new Uint32Array(n),colMask=new Uint32Array(n),boxMask=new Uint32Array(n);
  const active=new Uint8Array(totalCols);active.fill(1);
  const empties=[];
  function boxIndex(r,c){return ((r>>2)<<2)+(c>>2);}
  function cellCol(r,c){return r*n+c;}
  function rowDigitCol(r,d){return 256+r*n+(d-1);}
  function colDigitCol(c,d){return 512+c*n+(d-1);}
  function boxDigitCol(b,d){return 768+b*n+(d-1);}
  for(let r=0;r<n;r++){
    if(!Array.isArray(source[r])||source[r].length!==n||!Array.isArray(known[r])||known[r].length!==n)return 0;
    for(let c=0;c<n;c++){
      const d=Number(source[r][c])||0,kd=Number(known[r][c])||0;
      if(kd<1||kd>n)return 0;
      if(d&&d!==kd)return 0;
      if(!d){empties.push(r*n+c);continue;}
      const bit=1<<(d-1),b=boxIndex(r,c);
      if((rowMask[r]&bit)||(colMask[c]&bit)||(boxMask[b]&bit))return 0;
      rowMask[r]|=bit;colMask[c]|=bit;boxMask[b]|=bit;
      active[cellCol(r,c)]=0;active[rowDigitCol(r,d)]=0;active[colDigitCol(c,d)]=0;active[boxDigitCol(b,d)]=0;
    }
  }
  const rootNode={L:null,R:null};rootNode.L=rootNode;rootNode.R=rootNode;
  const cols=new Array(totalCols);
  for(let ci=0;ci<totalCols;ci++){
    const col={L:null,R:null,U:null,D:null,size:0,index:ci};col.U=col;col.D=col;cols[ci]=col;
    if(!active[ci]){col.L=col;col.R=col;continue;}
    col.L=rootNode.L;col.R=rootNode;rootNode.L.R=col;rootNode.L=col;
  }
  function addRow(indices,r,c,d){
    let first=null,last=null;
    for(const index of indices){
      const col=cols[index],node={L:null,R:null,U:col.U,D:col,C:col,r,c,d,known:d===known[r][c]};
      col.U.D=node;col.U=node;col.size++;
      if(!first){first=node;node.L=node;node.R=node;last=node;}
      else{node.L=last;node.R=first;last.R=node;first.L=node;last=node;}
    }
  }
  for(const idx of empties){
    const r=idx>>4,c=idx&15,b=boxIndex(r,c);
    let mask=full&~(rowMask[r]|colMask[c]|boxMask[b]);
    if(!mask){if(stats)Object.assign(stats,{nodes:0,branches:0,deadEnds:1,solutions:0,openCells:empties.length});return 0;}
    while(mask){const bit=mask&-mask;mask^=bit;const d=32-Math.clz32(bit);addRow([cellCol(r,c),rowDigitCol(r,d),colDigitCol(c,d),boxDigitCol(b,d)],r,c,d);}
  }
  function cover(c){c.R.L=c.L;c.L.R=c.R;for(let i=c.D;i!==c;i=i.D)for(let j=i.R;j!==i;j=j.R){j.D.U=j.U;j.U.D=j.D;j.C.size--;}}
  function uncover(c){for(let i=c.U;i!==c;i=i.U)for(let j=i.L;j!==i;j=j.L){j.C.size++;j.D.U=j;j.U.D=j;}c.R.L=c;c.L.R=c;}
  let alternative=false,nodes=0,branches=0,deadEnds=0;
  function search(diverged){
    if(alternative)return;
    nodes++;
    if(rootNode.R===rootNode){if(diverged)alternative=true;return;}
    let chosen=null,min=1e9;
    for(let c=rootNode.R;c!==rootNode;c=c.R){if(c.size<min){min=c.size;chosen=c;if(min<=1)break;}}
    if(!chosen||chosen.size===0){deadEnds++;return;}
    branches++;cover(chosen);
    let knownRow=null;
    for(let r=chosen.D;r!==chosen&&!alternative;r=r.D){
      if(r.known){knownRow=r;continue;}
      for(let j=r.R;j!==r;j=j.R)cover(j.C);
      search(true);
      for(let u=r.L;u!==r;u=u.L)uncover(u.C);
    }
    if(!alternative&&knownRow){
      for(let j=knownRow.R;j!==knownRow;j=j.R)cover(j.C);
      search(diverged);
      for(let u=knownRow.L;u!==knownRow;u=u.L)uncover(u.C);
    }
    uncover(chosen);
  }
  search(false);
  const solutions=alternative?2:1;
  if(stats)Object.assign(stats,{nodes,branches,deadEnds,solutions,openCells:empties.length,knownSolutionSeeded:true});
  return Math.min(limit,solutions);
}

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
if(!base||!Array.isArray(base.puzzle)||!Array.isArray(base.solution))throw new Error('base generation failed');
load('games/p3-size-control.js');
if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('production 16x16 DLX missing');
const initial=cloneGrid(base.puzzle),known=cloneGrid(base.solution),n=16;
const order=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(initial[r][c])order.push(r*n+c);
shuffle(order,mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));

function carve(counter){
  const grid=cloneGrid(initial),decisions=[],calls=[];
  let accepted=0,rejected=0;
  const t0=performance.now();
  for(let i=0;i<order.length;i++){
    const idx=order[i],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const stats={},c0=performance.now(),count=counter(grid,2,stats),ms=performance.now()-c0;
    const keep=count===1;
    decisions.push(keep?1:0);calls.push({index:i,cell:[r,c],givens:countGivens(grid),ms,count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,accepted:keep});
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={},v0=performance.now(),unique=counter(grid,2,finalStats)===1,verificationMs=performance.now()-v0;
  return {grid,decisions,calls,accepted,rejected,unique,finalStats,verificationMs,ms:performance.now()-t0};
}
const baseline=carve((grid,limit,stats)=>G.countLargeClassicSolutionsExact(grid,limit,stats));
const seeded=carve((grid,limit,stats)=>count16KnownSolution(grid,known,limit,stats));
const sameDecisions=baseline.decisions.length===seeded.decisions.length&&baseline.decisions.every((x,i)=>x===seeded.decisions[i]);
const samePuzzle=JSON.stringify(baseline.grid)===JSON.stringify(seeded.grid);
const worstSeeded=seeded.calls.slice().sort((a,b)=>b.ms-a.ms).slice(0,10);
emit('SUDOKU16_KNOWN_SOLUTION_DIFFERENTIAL',{
  seed,initialGivens:countGivens(initial),
  baseline:{ms:rounded(baseline.ms),finalGivens:countGivens(baseline.grid),accepted:baseline.accepted,rejected:baseline.rejected,verificationMs:rounded(baseline.verificationMs),finalStats:baseline.finalStats},
  knownSolution:{ms:rounded(seeded.ms),finalGivens:countGivens(seeded.grid),accepted:seeded.accepted,rejected:seeded.rejected,verificationMs:rounded(seeded.verificationMs),finalStats:seeded.finalStats,worstCalls:worstSeeded.map(x=>({...x,ms:rounded(x.ms)}))},
  sameDecisions,samePuzzle,speedup:rounded(baseline.ms/seeded.ms)
});
if(!baseline.unique||!seeded.unique||!sameDecisions||!samePuzzle)throw new Error('known-solution differential mismatch');
console.log('SUDOKU16_KNOWN_SOLUTION_DIFFERENTIAL:PASS');
