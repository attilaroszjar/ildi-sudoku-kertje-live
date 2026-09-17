import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';
const targetIds=[
  'double-skyscrapers',
  'skyscraper-parks2',
  'toroidal-skyscrapers',
  'classic-skyscrapers',
  'domino-skyscrapers',
  'evenodd-skyscrapers'
];

function countFilled(grid){
  if(!Array.isArray(grid))return null;
  let total=0,cells=0;
  for(const row of grid){
    if(!Array.isArray(row))return null;
    cells+=row.length;
    for(const value of row)if(value!==0&&value!==null&&value!==undefined&&value!=='')total++;
  }
  return {filled:total,cells,density:cells?total/cells:0};
}
function countLeafClues(value){
  if(value===null||value===undefined||value===''||value===0||value===false)return 0;
  if(Array.isArray(value))return value.reduce((sum,item)=>sum+countLeafClues(item),0);
  if(typeof value==='object')return Object.values(value).reduce((sum,item)=>sum+countLeafClues(item),0);
  return 1;
}
function round1(value){return Math.round(value*10)/10;}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs)await import(pathToFileURL(path.join(root,ref)).href);
if(!globalThis.SudokuGenerator||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime failed to load');

console.log(`NONSTANDARD_GRID_OUTSIDE_EXPERT_INVENTORY seed=${seed} difficulty=${difficulty} hostRealm=true`);
const rows=[];
for(const id of targetIds){
  const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
  if(!variant){
    console.log(`INVENTORY_MISSING id=${id}`);
    rows.push({id,missing:true});
    continue;
  }
  const started=performance.now();
  const generated=globalThis.SudokuGenerator.make(variant,seed,difficulty);
  const generationMs=performance.now()-started;
  if(!generated){
    console.log(`INVENTORY_NO_OUTPUT id=${id}`);
    rows.push({id,noOutput:true});
    continue;
  }
  const grid=countFilled(generated.puzzle);
  const data=generated.data||{};
  const structural={};
  for(const key of ['clues','toroidalClues','parityCells','dominoes']){
    if(data[key]!==undefined)structural[key]=countLeafClues(data[key]);
  }
  const metadata=generated.generation||{};
  const record={
    id,
    grid,
    structural,
    generationMs:round1(generationMs),
    verification:metadata.verification||null,
    policy:metadata.policy||null,
    locallyIrreducible:metadata.locallyIrreducibleUnderProductionContract===true,
    metadataClues:metadata.clues??null,
    generatorFamily:metadata.generatorFamily||null,
    dataKeys:Object.keys(data).sort()
  };
  rows.push(record);
  console.log(`INVENTORY id=${id} givens=${grid?`${grid.filled}/${grid.cells}`:'n/a'} density=${grid?grid.density.toFixed(3):'n/a'} structural=${JSON.stringify(structural)} generationMs=${record.generationMs.toFixed(1)} verification=${record.verification||'n/a'} policy=${record.policy||'n/a'} locallyIrreducible=${record.locallyIrreducible}`);
  console.log(`INVENTORY_DATA_KEYS id=${id} keys=${record.dataKeys.join(',')}`);
}

const usable=rows.filter(row=>!row.missing&&!row.noOutput);
const ranked=usable.slice().sort((a,b)=>{
  const ad=a.grid?.density??-1,bd=b.grid?.density??-1;
  if(bd!==ad)return bd-ad;
  const as=Object.values(a.structural||{}).reduce((s,n)=>s+n,0);
  const bs=Object.values(b.structural||{}).reduce((s,n)=>s+n,0);
  return bs-as;
});
console.log('RANKING_BY_CELL_DENSITY');
for(const row of ranked){
  const structuralTotal=Object.values(row.structural||{}).reduce((sum,n)=>sum+n,0);
  console.log(`RANK id=${row.id} density=${row.grid?row.grid.density.toFixed(3):'n/a'} givens=${row.grid?row.grid.filled:'n/a'} structuralLeafCount=${structuralTotal} generationMs=${row.generationMs.toFixed(1)}`);
}

const failures=[];
if(rows.some(row=>row.missing))failures.push('one or more target variants are missing');
if(rows.some(row=>row.noOutput))failures.push('one or more target variants returned no output');
if(usable.length!==targetIds.length)failures.push(`usable=${usable.length}, expected=${targetIds.length}`);
if(failures.length){
  for(const failure of failures)console.error(`NONSTANDARD_GRID_OUTSIDE_EXPERT_INVENTORY_FAILURE ${failure}`);
  console.log('NONSTANDARD_GRID_OUTSIDE_EXPERT_INVENTORY:FAIL');
  process.exitCode=1;
}else{
  console.log('NONSTANDARD_GRID_OUTSIDE_EXPERT_INVENTORY:PASS');
}
