import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||94001)>>>0;
const difficulty='expert';
const id='aquarium';

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs)await import(pathToFileURL(path.join(root,ref)).href);

const generator=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
if(!generator||!variant||typeof generator.countAquariumSolutions!=='function')throw new Error('Aquarium production runtime unavailable');

const clone=value=>JSON.parse(JSON.stringify(value));
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

function countWithOptionalClues(puzzle,limit=2){
  const n=puzzle.size,reg=puzzle.regions;
  const ids=[...new Set(reg.flat())];
  const grid=Array.from({length:n},()=>Array(n).fill(0));
  const states={};
  let found=0;

  for(const regionId of ids){
    const seen=new Set(),arr=[];
    for(let lev=0;lev<=n;lev++){
      const cells=[];
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(reg[r][c]===regionId)cells.push([r,c,(n-r)<=lev?1:0]);
      const key=cells.map(q=>q[2]).join('');
      if(!seen.has(key)){seen.add(key);arr.push(cells);}
    }
    states[regionId]=arr;
  }

  const known=value=>Number.isInteger(value);
  function feasible(){
    for(let r=0;r<n;r++)if(known(puzzle.rowClues[r])){
      const sum=grid[r].reduce((a,x)=>a+x,0);
      if(sum>puzzle.rowClues[r])return false;
    }
    for(let c=0;c<n;c++)if(known(puzzle.colClues[c])){
      let sum=0;for(let r=0;r<n;r++)sum+=grid[r][c];
      if(sum>puzzle.colClues[c])return false;
    }
    return true;
  }
  function finalValid(){
    for(let r=0;r<n;r++)if(known(puzzle.rowClues[r])&&grid[r].reduce((a,x)=>a+x,0)!==puzzle.rowClues[r])return false;
    for(let c=0;c<n;c++)if(known(puzzle.colClues[c])){
      let sum=0;for(let r=0;r<n;r++)sum+=grid[r][c];
      if(sum!==puzzle.colClues[c])return false;
    }
    return true;
  }
  function go(k){
    if(found>=limit)return;
    if(k===ids.length){if(finalValid())found++;return;}
    for(const cells of states[ids[k]]){
      cells.forEach(q=>{grid[q[0]][q[1]]=q[2];});
      if(feasible())go(k+1);
      cells.forEach(q=>{grid[q[0]][q[1]]=0;});
      if(found>=limit)return;
    }
  }
  go(0);
  return found;
}

const makeStart=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-makeStart;
const source=clone(out.puzzle);
const n=source.size;
const productionCount=generator.countAquariumSolutions(source,2,{});
const auditCount=countWithOptionalClues(source,2);
if(productionCount!==auditCount||auditCount!==1)throw new Error(`Aquarium full-clue parity/uniqueness failure: production=${productionCount} audit=${auditCount}`);

const atoms=[];
for(let i=0;i<n;i++)atoms.push({axis:'row',index:i});
for(let i=0;i<n;i++)atoms.push({axis:'col',index:i});
const random=mulberry32((seed^0x41514352)>>>0);
const order=shuffle(atoms.slice(),random);
const carved=clone(source);
let accepted=0,rejected=0,totalCarveMs=0,worstCarveMs=0,worstCarve='n/a';
for(const atom of order){
  const key=atom.axis==='row'?'rowClues':'colClues';
  const saved=carved[key][atom.index];
  carved[key][atom.index]=null;
  const t0=performance.now();
  const count=countWithOptionalClues(carved,2);
  const ms=performance.now()-t0;
  totalCarveMs+=ms;
  if(ms>worstCarveMs){worstCarveMs=ms;worstCarve=`${atom.axis}:${atom.index},count=${count}`;}
  if(count===1)accepted++;
  else{carved[key][atom.index]=saved;rejected++;}
}

const remaining=[];
for(let i=0;i<n;i++)if(Number.isInteger(carved.rowClues[i]))remaining.push({axis:'row',index:i});
for(let i=0;i<n;i++)if(Number.isInteger(carved.colClues[i]))remaining.push({axis:'col',index:i});
let removable=0,totalFrontierMs=0,worstFrontierMs=0,worstFrontier='n/a';
for(const atom of remaining){
  const candidate=clone(carved),key=atom.axis==='row'?'rowClues':'colClues';
  candidate[key][atom.index]=null;
  const t0=performance.now();
  const count=countWithOptionalClues(candidate,2);
  const ms=performance.now()-t0;
  totalFrontierMs+=ms;
  if(ms>worstFrontierMs){worstFrontierMs=ms;worstFrontier=`${atom.axis}:${atom.index},count=${count}`;}
  if(count===1)removable++;
}

const finalStart=performance.now();
const finalCount=countWithOptionalClues(carved,2);
const finalMs=performance.now()-finalStart;
const base=clone(source);
base.rowClues=Array(n).fill(null);
base.colClues=Array(n).fill(null);
const baseCount=countWithOptionalClues(base,2);
const variantEssential=finalCount===1&&baseCount!==1;
const visible=remaining.length;

console.log(`AQUARIUM_EXPERT_CARVE seed=${seed} size=${n}x${n} sourceMakeMs=${makeMs.toFixed(1)}`);
console.log(`AQUARIUM_EXPERT_CARVE_DIFFERENTIAL productionCount=${productionCount} auditCount=${auditCount} parity=${productionCount===auditCount}`);
console.log(`AQUARIUM_EXPERT_CARVE_RESULT sourceClues=${2*n} finalClues=${visible} accepted=${accepted} rejected=${rejected} finalCount=${finalCount} baseCount=${baseCount} variantEssential=${variantEssential}`);
console.log(`AQUARIUM_EXPERT_CARVE_RUNTIME totalCarveMs=${totalCarveMs.toFixed(1)} worstCarveMs=${worstCarveMs.toFixed(1)} worstCarve=${worstCarve} finalVerifyMs=${finalMs.toFixed(1)}`);
console.log(`AQUARIUM_EXPERT_CARVE_FRONTIER tested=${remaining.length} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalFrontierMs.toFixed(1)} worstMs=${worstFrontierMs.toFixed(1)} worst=${worstFrontier}`);
console.log(`AQUARIUM_EXPERT_CARVE_CLUES rows=${JSON.stringify(carved.rowClues)} cols=${JSON.stringify(carved.colClues)}`);

const failures=[];
if(finalCount!==1)failures.push(`final count ${finalCount}`);
if(!variantEssential)failures.push(`variant essential false; baseCount=${baseCount}`);
if(removable!==0)failures.push(`${removable} remaining clues still removable`);
if(visible>=2*n)failures.push('carving did not reduce visible clues');
if(failures.length){for(const failure of failures)console.error(`AQUARIUM_EXPERT_CARVE_FAILURE ${failure}`);console.log('AQUARIUM_EXPERT_CARVE:FAIL');process.exitCode=1;}
else console.log('AQUARIUM_EXPERT_CARVE:PASS');
