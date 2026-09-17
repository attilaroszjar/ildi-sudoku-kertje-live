import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||95001)>>>0;
const difficulty='expert';
const id='battleships';

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs)await import(pathToFileURL(path.join(root,ref)).href);

const generator=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
if(!generator||!variant||typeof generator.countBattleshipSolutions!=='function')throw new Error('Battleships production runtime unavailable');
const clone=value=>JSON.parse(JSON.stringify(value));

function placements(n,len){
  const out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(c+len<=n)out.push(Array.from({length:len},(_,i)=>[r,c+i]));
    if(len>1&&r+len<=n)out.push(Array.from({length:len},(_,i)=>[r+i,c]));
  }
  return out;
}

// Exact audit counter matching the production fleet-placement model, extended so
// null row/column totals mean that the outside clue is intentionally omitted.
function countWithOptionalClues(puzzle,limit=2){
  const n=puzzle.size,fleet=puzzle.fleet.slice().sort((a,b)=>b-a);
  const rows=Array(n).fill(0),cols=Array(n).fill(0),occ={};
  const givens=puzzle.givens||[],all={};
  for(const len of fleet)if(!all[len])all[len]=placements(n,len);
  let found=0;
  const known=v=>Number.isInteger(v);

  function canPlace(cells){
    const own={};for(const p of cells)own[p.join(',')]=1;
    for(const [r,c] of cells){
      if(known(puzzle.rowClues[r])&&rows[r]>=puzzle.rowClues[r])return false;
      if(known(puzzle.colClues[c])&&cols[c]>=puzzle.colClues[c])return false;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        const z=`${r+dr},${c+dc}`;
        if(occ[z]&&!own[z])return false;
      }
    }
    return true;
  }
  function finalOk(){
    for(let i=0;i<n;i++){
      if(known(puzzle.rowClues[i])&&rows[i]!==puzzle.rowClues[i])return false;
      if(known(puzzle.colClues[i])&&cols[i]!==puzzle.colClues[i])return false;
    }
    for(const g of givens){
      const z=`${g.r},${g.c}`;
      if((g.state===1)!==!!occ[z])return false;
    }
    return true;
  }
  function go(k,start){
    if(found>=limit)return;
    if(k===fleet.length){if(finalOk())found++;return;}
    const len=fleet[k],list=all[len],same=k>0&&fleet[k-1]===len,from=same?start:0;
    for(let i=from;i<list.length;i++){
      const cells=list[i];if(!canPlace(cells))continue;
      for(const p of cells){occ[p.join(',')]=1;rows[p[0]]++;cols[p[1]]++;}
      go(k+1,(k+1<fleet.length&&fleet[k+1]===len)?i+1:0);
      for(const p of cells){delete occ[p.join(',')];rows[p[0]]--;cols[p[1]]--;}
      if(found>=limit)return;
    }
  }
  go(0,0);return found;
}

const tMake=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-tMake;
const puzzle=out.puzzle;
const n=puzzle.size;
const productionCount=generator.countBattleshipSolutions(puzzle,2,{});
const auditCount=countWithOptionalClues(puzzle,2);

let removableGivens=0,removableOutside=0,totalMs=0,worstMs=0,worst='n/a';
for(let i=0;i<(puzzle.givens||[]).length;i++){
  const candidate=clone(puzzle);candidate.givens.splice(i,1);
  const t0=performance.now(),count=countWithOptionalClues(candidate,2),ms=performance.now()-t0;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`given:${i},count=${count}`;}if(count===1)removableGivens++;
}
const outside=[];for(let i=0;i<n;i++)outside.push({axis:'row',index:i});for(let i=0;i<n;i++)outside.push({axis:'col',index:i});
for(const atom of outside){
  const candidate=clone(puzzle),key=atom.axis==='row'?'rowClues':'colClues';candidate[key][atom.index]=null;
  const t0=performance.now(),count=countWithOptionalClues(candidate,2),ms=performance.now()-t0;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`${atom.axis}:${atom.index},count=${count}`;}if(count===1)removableOutside++;
}

const noGivens=clone(puzzle);noGivens.givens=[];
const noGivensCount=countWithOptionalClues(noGivens,2);
const noOutside=clone(puzzle);noOutside.rowClues=Array(n).fill(null);noOutside.colClues=Array(n).fill(null);
const noOutsideCount=countWithOptionalClues(noOutside,2);
const bare=clone(noOutside);bare.givens=[];
const bareCount=countWithOptionalClues(bare,2);
const g=out.generation||{};

console.log(`BATTLESHIPS_EXPERT_BASELINE seed=${seed} size=${n}x${n} makeMs=${makeMs.toFixed(1)}`);
console.log(`BATTLESHIPS_EXPERT_DIFFERENTIAL productionCount=${productionCount} auditCount=${auditCount} parity=${productionCount===auditCount}`);
console.log(`BATTLESHIPS_EXPERT_INFORMATION outsideClues=${2*n} givens=${(puzzle.givens||[]).length} reportedClues=${g.clues??'n/a'} noGivensCount=${noGivensCount} noOutsideCount=${noOutsideCount} bareCount=${bareCount}`);
console.log(`BATTLESHIPS_EXPERT_FRONTIER givensTested=${(puzzle.givens||[]).length} removableGivens=${removableGivens} outsideTested=${outside.length} removableOutside=${removableOutside} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`BATTLESHIPS_EXPERT_METADATA verification=${g.verification||'n/a'} generatorFamily=${g.generatorFamily||'n/a'} variantEssential=${g.variantEssential===true}`);

const failures=[];
if(productionCount!==auditCount)failures.push(`production/audit mismatch ${productionCount} != ${auditCount}`);
if(auditCount!==1)failures.push(`solution count ${auditCount}, expected 1`);
if(failures.length){for(const failure of failures)console.error(`BATTLESHIPS_EXPERT_BASELINE_FAILURE ${failure}`);console.log('BATTLESHIPS_EXPERT_BASELINE:FAIL');process.exitCode=1;}
else if(removableGivens===0&&removableOutside===0)console.log('BATTLESHIPS_EXPERT_BASELINE:PASS_LOCAL_IRREDUCIBLE');
else console.log('BATTLESHIPS_EXPERT_BASELINE:PASS_FRONTIER_FOUND');
