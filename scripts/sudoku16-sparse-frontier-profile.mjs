import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';
const checkpoints=new Set([180,170,160,150,140,130,120,110,100,90,80,70,60,50,40,30]);

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.reduce((sum,row)=>sum+row.filter(Boolean).length,0);}
function round1(value){return Math.round(value*10)/10;}
function mulberry32(seedValue){
  let x=seedValue>>>0;
  return function(){
    x=(x+0x6D2B79F5)>>>0;
    let t=x;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function shuffle(list,random){
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const preP3End=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstGenerator<0||preP3End<firstGenerator)throw new Error('pre-P3 production generator range not found');
const preRefs=[...bankRefs,...allRefs.slice(firstGenerator,preP3End+1).filter(ref=>ref.startsWith('games/')&&!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of preRefs)await import(pathToFileURL(path.join(root,ref)).href);

const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='sudoku-16x16');
if(!variant)throw new Error('sudoku-16x16 not found');
const baseGenerated=globalThis.SudokuGenerator.make(variant,seed,difficulty);
if(!baseGenerated||!Array.isArray(baseGenerated.puzzle))throw new Error('base 16x16 generation failed');

await import(pathToFileURL(path.join(root,'games/p3-size-control.js')).href);
const exact=globalThis.SudokuGenerator.countLargeClassicSolutionsExact;
if(typeof exact!=='function')throw new Error('specialized 16x16 exact counter not installed');

const grid=cloneGrid(baseGenerated.puzzle);
const order=[];
for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(grid[r][c])order.push(r*16+c);
shuffle(order,mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));

let accepted=0,rejected=0,maxMs=0,maxNodes=0,maxBranches=0;
console.log(`SUDOKU16_SPARSE_FRONTIER_PROFILE seed=${seed} difficulty=${difficulty} startingGivens=${countGivens(grid)} hostRealm=true engine=classic16-precovered-dlx-exact-v2`);

for(let i=0;i<order.length;i++){
  const idx=order[i],r=Math.floor(idx/16),c=idx%16,old=grid[r][c];
  if(!old)continue;
  grid[r][c]=0;
  const stats={};
  const t0=performance.now();
  const solutions=exact(grid,2,stats);
  const elapsedMs=performance.now()-t0;
  maxMs=Math.max(maxMs,elapsedMs);
  maxNodes=Math.max(maxNodes,stats.nodes||0);
  maxBranches=Math.max(maxBranches,stats.branches||0);
  if(solutions===1)accepted++;
  else{grid[r][c]=old;rejected++;}
  const givens=countGivens(grid);
  const shouldReport=elapsedMs>=100||checkpoints.has(givens)||i===order.length-1;
  if(shouldReport){
    console.log(`SPARSE_STEP step=${i+1}/${order.length} r${r+1}c${c+1} solutions=${solutions} accepted=${solutions===1} givens=${givens} runtimeMs=${round1(elapsedMs).toFixed(1)} nodes=${stats.nodes||0} branches=${stats.branches||0} deadEnds=${stats.deadEnds||0}`);
  }
}

const finalStats={};
const finalStart=performance.now();
const finalSolutions=exact(grid,2,finalStats);
const finalMs=performance.now()-finalStart;
console.log(`SPARSE_SUMMARY finalGivens=${countGivens(grid)} accepted=${accepted} rejected=${rejected} finalSolutions=${finalSolutions} finalRuntimeMs=${round1(finalMs).toFixed(1)} finalNodes=${finalStats.nodes||0} finalBranches=${finalStats.branches||0} maxRuntimeMs=${round1(maxMs).toFixed(1)} maxNodes=${maxNodes} maxBranches=${maxBranches}`);
if(finalSolutions!==1){console.log('SUDOKU16_SPARSE_FRONTIER_PROFILE:FAIL');process.exitCode=1;}
else console.log('SUDOKU16_SPARSE_FRONTIER_PROFILE:PASS');
