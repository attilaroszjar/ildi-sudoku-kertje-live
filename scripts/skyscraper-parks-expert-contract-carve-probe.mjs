import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const banks=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const refs=[...banks,...allRefs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
const generated=G.make(variant,seed,'expert');
const grid=generated.puzzle.map(row=>row.slice());
const n=grid.length;
function count(){return grid.flat().filter(Boolean).length;}
function contract(){
  const variantSolutions=G.countParkSolutions(grid,generated,2,false);
  if(variantSolutions!==1)return {pass:false,variantSolutions,baseFamilySolutions:null};
  const baseFamilySolutions=G.countParkSolutions(grid,generated,2,true);
  return {pass:baseFamilySolutions>1,variantSolutions,baseFamilySolutions};
}
function mulberry32(x){x>>>=0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function fmt(ms){return +ms.toFixed(1);}
const order=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
shuffle(order,mulberry32(((generated.generation?.actualSeed??seed)^0x4C4F4341)>>>0));
const startClues=count(),events=[];let accepted=0,step=0;
const carveStart=performance.now();
console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'start',seed,startClues,verification:generated.generation?.verification||null}));
for(const idx of order){
  const r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
  step++;
  const cell=`r${r+1}c${c+1}`;
  console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'check-start',step,total:order.length,cell,value:old,cluesBefore:count(),elapsedMs:fmt(performance.now()-carveStart)}));
  grid[r][c]=0;const t0=performance.now();const result=contract();const ms=performance.now()-t0;
  let event;
  if(result.pass){accepted++;event={cell,value:old,accepted:true,cluesAfter:count(),variantSolutions:result.variantSolutions,baseFamilySolutions:result.baseFamilySolutions,runtimeMs:fmt(ms)};}
  else{grid[r][c]=old;event={cell,value:old,accepted:false,cluesAfter:count(),variantSolutions:result.variantSolutions,baseFamilySolutions:result.baseFamilySolutions,runtimeMs:fmt(ms)};}
  events.push(event);
  console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'check-done',step,total:order.length,...event,elapsedMs:fmt(performance.now()-carveStart)}));
}
const carveMs=performance.now()-carveStart;
console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'carve-complete',clues:count(),acceptedRemovals:accepted,rejectedRemovals:events.length-accepted,carveMs:fmt(carveMs)}));
const finalContract=contract();
console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'frontier-start',clues:count(),finalContract}));
const frontier=[];let removable=0,frontierStep=0;
const frontierStart=performance.now();
for(let idx=0;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
  frontierStep++;
  const cell=`r${r+1}c${c+1}`;
  console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'frontier-check-start',step:frontierStep,total:count(),cell,value:old,elapsedMs:fmt(performance.now()-frontierStart)}));
  grid[r][c]=0;const t0=performance.now();const result=contract();const ms=performance.now()-t0;grid[r][c]=old;
  if(result.pass)removable++;
  const item={cell,value:old,removable:result.pass,variantSolutions:result.variantSolutions,baseFamilySolutions:result.baseFamilySolutions,runtimeMs:fmt(ms)};
  frontier.push(item);
  console.log('SKYSCRAPER_PARKS_CARVE_PROGRESS '+JSON.stringify({phase:'frontier-check-done',step:frontierStep,...item,elapsedMs:fmt(performance.now()-frontierStart)}));
}
const frontierMs=performance.now()-frontierStart;
console.log('SKYSCRAPER_PARKS_CONTRACT_CARVE '+JSON.stringify({seed,runtimeRealm:'host',startClues,finalClues:count(),density:+(count()/(n*n)).toFixed(3),acceptedRemovals:accepted,rejectedRemovals:events.length-accepted,carveMs:fmt(carveMs),finalContract,locallyIrreducibleUnderProductionContract:removable===0,frontierRemovable:removable,frontierMs:fmt(frontierMs),verification:generated.generation?.verification||null,events,finalFrontier:frontier,finalPuzzle:grid}));
const pass=finalContract.pass&&removable===0&&count()<startClues;
console.log('SKYSCRAPER_PARKS_CONTRACT_CARVE_PROBE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
