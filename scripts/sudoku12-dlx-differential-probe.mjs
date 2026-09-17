import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93004);

function load(ref){
  const f=path.join(root,ref);
  (0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);
}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function countGivens(grid){return grid.flat().filter(Boolean).length;}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}
function rounded(x){return +x.toFixed(3);}

function count12SolutionsDlx(source,limit=2,stats){
  limit=Math.max(1,Number(limit)||2);
  if(!Array.isArray(source)||source.length!==12)return 0;
  const n=12,totalCols=4*n*n,full=(1<<n)-1;
  const rowMask=new Uint16Array(n),colMask=new Uint16Array(n),boxMask=new Uint16Array(n);
  const active=new Uint8Array(totalCols);active.fill(1);
  const empties=[];
  function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/4);}
  function cellCol(r,c){return r*n+c;}
  function rowDigitCol(r,d){return n*n+r*n+(d-1);}
  function colDigitCol(c,d){return 2*n*n+c*n+(d-1);}
  function boxDigitCol(b,d){return 3*n*n+b*n+(d-1);}
  for(let r=0;r<n;r++){
    if(!Array.isArray(source[r])||source[r].length!==n)return 0;
    for(let c=0;c<n;c++){
      const d=Number(source[r][c])||0;
      if(!d){empties.push(r*n+c);continue;}
      if(d<1||d>n)return 0;
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
  function addRow(indices){
    let first=null,last=null;
    for(const index of indices){
      const col=cols[index],node={L:null,R:null,U:col.U,D:col,C:col};
      col.U.D=node;col.U=node;col.size++;
      if(!first){first=node;node.L=node;node.R=node;last=node;}
      else{node.L=last;node.R=first;last.R=node;first.L=node;last=node;}
    }
  }
  for(const idx of empties){
    const r=Math.floor(idx/n),c=idx%n,b=boxIndex(r,c);
    let mask=full&~(rowMask[r]|colMask[c]|boxMask[b]);
    if(!mask){if(stats)Object.assign(stats,{nodes:0,branches:0,deadEnds:1,solutions:0,openCells:empties.length});return 0;}
    while(mask){const bit=mask&-mask;mask^=bit;const d=32-Math.clz32(bit);addRow([cellCol(r,c),rowDigitCol(r,d),colDigitCol(c,d),boxDigitCol(b,d)]);}
  }
  function cover(c){c.R.L=c.L;c.L.R=c.R;for(let i=c.D;i!==c;i=i.D)for(let j=i.R;j!==i;j=j.R){j.D.U=j.U;j.U.D=j.D;j.C.size--;}}
  function uncover(c){for(let i=c.U;i!==c;i=i.U)for(let j=i.L;j!==i;j=j.L){j.C.size++;j.D.U=j;j.U.D=j;}c.R.L=c;c.L.R=c;}
  let solutions=0,nodes=0,branches=0,deadEnds=0;
  function search(){
    if(solutions>=limit)return;nodes++;
    if(rootNode.R===rootNode){solutions++;return;}
    let chosen=null,min=1e9;
    for(let c=rootNode.R;c!==rootNode;c=c.R){if(c.size<min){min=c.size;chosen=c;if(min<=1)break;}}
    if(!chosen||chosen.size===0){deadEnds++;return;}
    branches++;cover(chosen);
    for(let r=chosen.D;r!==chosen&&solutions<limit;r=r.D){for(let j=r.R;j!==r;j=j.R)cover(j.C);search();for(let u=r.L;u!==r;u=u.L)uncover(u.C);}
    uncover(chosen);
  }
  search();
  if(stats)Object.assign(stats,{nodes,branches,deadEnds,solutions,openCells:empties.length});
  return solutions;
}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of banks)load(ref);
load('games/sudoku-generator.js');
const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
const variant=B.find(v=>v.id==='sudoku-12x12');
if(!G||!variant)throw new Error('12x12 runtime missing');

const base=G.make(variant,seed,'expert');
if(!base||!Array.isArray(base.puzzle))throw new Error('base generation failed');
const initial=cloneGrid(base.puzzle),n=12;
const order=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(initial[r][c])order.push(r*n+c);
shuffle(order,mulberry32(((seed>>>0)^0x12E4A7C5)>>>0));

function carve(counter){
  const grid=cloneGrid(initial),decisions=[];
  let accepted=0,rejected=0;
  const t0=performance.now();
  for(const idx of order){
    const r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const count=counter(grid,2);
    const keep=count===1;
    decisions.push(keep?1:0);
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={};
  const unique=counter(grid,2,finalStats)===1;
  return {grid,decisions,accepted,rejected,unique,finalStats,ms:performance.now()-t0};
}

const generic=carve((grid,limit,stats)=>{
  const result=G.countSolutions(grid,limit);
  if(stats)Object.assign(stats,{available:false});
  return result;
});
const dlx=carve(count12SolutionsDlx);
const sameDecisions=generic.decisions.length===dlx.decisions.length&&generic.decisions.every((x,i)=>x===dlx.decisions[i]);
const samePuzzle=JSON.stringify(generic.grid)===JSON.stringify(dlx.grid);

emit('SUDOKU12_DLX_DIFFERENTIAL',{
  seed,
  initialGivens:countGivens(initial),
  generic:{ms:rounded(generic.ms),finalGivens:countGivens(generic.grid),accepted:generic.accepted,rejected:generic.rejected,unique:generic.unique},
  dlx:{ms:rounded(dlx.ms),finalGivens:countGivens(dlx.grid),accepted:dlx.accepted,rejected:dlx.rejected,unique:dlx.unique,finalStats:dlx.finalStats},
  sameDecisions,
  samePuzzle,
  speedup:rounded(generic.ms/dlx.ms)
});
if(!generic.unique||!dlx.unique||!sameDecisions||!samePuzzle)throw new Error('DLX differential mismatch');
console.log('SUDOKU12_DLX_DIFFERENTIAL:PASS');
