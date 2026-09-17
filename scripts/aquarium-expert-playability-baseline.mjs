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

// Exact audit counter with the same region water-level state space as production,
// extended so null row/column clues mean "constraint omitted". This lets the
// playability audit test each visible clue atom independently without changing
// production semantics.
function countWithOptionalClues(puzzle,limit=2){
  const n=puzzle.size,reg=puzzle.regions;
  const ids=[...new Set(reg.flat())];
  const grid=Array.from({length:n},()=>Array(n).fill(0));
  const states={};
  let found=0;

  for(const id of ids){
    const seen=new Set(),arr=[];
    for(let lev=0;lev<=n;lev++){
      const cells=[];
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(reg[r][c]===id)cells.push([r,c,(n-r)<=lev?1:0]);
      const key=cells.map(q=>q[2]).join('');
      if(!seen.has(key)){seen.add(key);arr.push(cells);}
    }
    states[id]=arr;
  }

  function known(value){return Number.isInteger(value);}
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
    const cellsOptions=states[ids[k]];
    for(const cells of cellsOptions){
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
if(!out||!out.puzzle||!Array.isArray(out.puzzle.rowClues)||!Array.isArray(out.puzzle.colClues))throw new Error('Aquarium generator returned invalid puzzle');
const puzzle=out.puzzle;
const n=puzzle.size;

const productionStart=performance.now();
const productionCount=generator.countAquariumSolutions(puzzle,2,{});
const productionMs=performance.now()-productionStart;
const auditStart=performance.now();
const auditCount=countWithOptionalClues(puzzle,2);
const auditMs=performance.now()-auditStart;

const base=clone(puzzle);
base.rowClues=Array(n).fill(null);
base.colClues=Array(n).fill(null);
const baseStart=performance.now();
const baseCount=countWithOptionalClues(base,2);
const baseMs=performance.now()-baseStart;

const atoms=[];
for(let i=0;i<n;i++)atoms.push({axis:'row',index:i});
for(let i=0;i<n;i++)atoms.push({axis:'col',index:i});
let removable=0,totalRemovalMs=0,worstRemovalMs=0,worstRemoval=null;
for(const atom of atoms){
  const candidate=clone(puzzle);
  const key=atom.axis==='row'?'rowClues':'colClues';
  candidate[key][atom.index]=null;
  const t0=performance.now();
  const count=countWithOptionalClues(candidate,2);
  const ms=performance.now()-t0;
  totalRemovalMs+=ms;
  if(ms>worstRemovalMs){worstRemovalMs=ms;worstRemoval={...atom,count};}
  if(count===1)removable++;
}

const variantEssential=productionCount===1&&baseCount!==1;
const locallyIrreducible=removable===0;
const g=out.generation||{};
console.log(`AQUARIUM_EXPERT_BASELINE seed=${seed} size=${n}x${n}`);
console.log(`AQUARIUM_EXPERT_GENERATION makeMs=${makeMs.toFixed(1)} visibleClues=${2*n} reportedClues=${g.clues??'n/a'} difficultyScore=${g.difficultyScore??'n/a'}`);
console.log(`AQUARIUM_EXPERT_DIFFERENTIAL productionCount=${productionCount} auditCount=${auditCount} productionMs=${productionMs.toFixed(1)} auditMs=${auditMs.toFixed(1)} parity=${productionCount===auditCount}`);
console.log(`AQUARIUM_EXPERT_EXACT fullCount=${auditCount} baseCount=${baseCount} baseMs=${baseMs.toFixed(1)} variantEssential=${variantEssential}`);
console.log(`AQUARIUM_EXPERT_FRONTIER tested=${atoms.length} removable=${removable} locallyIrreducible=${locallyIrreducible} totalRemovalMs=${totalRemovalMs.toFixed(1)} worstRemovalMs=${worstRemovalMs.toFixed(1)} worstRemoval=${worstRemoval?`${worstRemoval.axis}:${worstRemoval.index},count=${worstRemoval.count}`:'n/a'}`);
console.log(`AQUARIUM_EXPERT_METADATA verification=${g.verification||'n/a'} mode=${g.mode||'n/a'} variantEssential=${g.variantEssential===true}`);

const failures=[];
if(productionCount!==auditCount)failures.push(`production/audit differential mismatch ${productionCount} != ${auditCount}`);
if(productionCount!==1)failures.push(`production solution count is ${productionCount}, expected 1`);
if(!variantEssential)failures.push(`clueless base solution count is ${baseCount}, expected non-unique`);
if(failures.length){
  for(const failure of failures)console.error(`AQUARIUM_EXPERT_BASELINE_FAILURE ${failure}`);
  console.log('AQUARIUM_EXPERT_BASELINE:FAIL');
  process.exitCode=1;
}else{
  console.log(`AQUARIUM_EXPERT_BASELINE:${locallyIrreducible?'PASS_LOCAL_IRREDUCIBLE':'PASS_FRONTIER_FOUND'}`);
}
