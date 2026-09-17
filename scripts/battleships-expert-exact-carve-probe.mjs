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
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
function placements(n,len){const out=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(c+len<=n)out.push(Array.from({length:len},(_,i)=>[r,c+i]));if(len>1&&r+len<=n)out.push(Array.from({length:len},(_,i)=>[r+i,c]));}return out;}
function countWithOptionalClues(puzzle,limit=2){
  const n=puzzle.size,fleet=puzzle.fleet.slice().sort((a,b)=>b-a),rows=Array(n).fill(0),cols=Array(n).fill(0),occ={},givens=puzzle.givens||[],all={};
  for(const len of fleet)if(!all[len])all[len]=placements(n,len);
  let found=0;const known=v=>Number.isInteger(v);
  function canPlace(cells){const own={};for(const p of cells)own[p.join(',')]=1;for(const [r,c] of cells){if(known(puzzle.rowClues[r])&&rows[r]>=puzzle.rowClues[r])return false;if(known(puzzle.colClues[c])&&cols[c]>=puzzle.colClues[c])return false;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const z=`${r+dr},${c+dc}`;if(occ[z]&&!own[z])return false;}}return true;}
  function finalOk(){for(let i=0;i<n;i++){if(known(puzzle.rowClues[i])&&rows[i]!==puzzle.rowClues[i])return false;if(known(puzzle.colClues[i])&&cols[i]!==puzzle.colClues[i])return false;}for(const g of givens){const z=`${g.r},${g.c}`;if((g.state===1)!==!!occ[z])return false;}return true;}
  function go(k,start){if(found>=limit)return;if(k===fleet.length){if(finalOk())found++;return;}const len=fleet[k],list=all[len],same=k>0&&fleet[k-1]===len,from=same?start:0;for(let i=from;i<list.length;i++){const cells=list[i];if(!canPlace(cells))continue;for(const p of cells){occ[p.join(',')]=1;rows[p[0]]++;cols[p[1]]++;}go(k+1,(k+1<fleet.length&&fleet[k+1]===len)?i+1:0);for(const p of cells){delete occ[p.join(',')];rows[p[0]]--;cols[p[1]]--;}if(found>=limit)return;}}
  go(0,0);return found;
}

const makeStart=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-makeStart;
const source=clone(out.puzzle),n=source.size;
const productionCount=generator.countBattleshipSolutions(source,2,{});
const auditCount=countWithOptionalClues(source,2);
if(productionCount!==auditCount||auditCount!==1)throw new Error(`Battleships full-clue parity/uniqueness failure: production=${productionCount} audit=${auditCount}`);

const atoms=[];
for(let i=0;i<(source.givens||[]).length;i++)atoms.push({type:'given',key:`given:${i}`,given:clone(source.givens[i])});
for(let i=0;i<n;i++)atoms.push({type:'outside',axis:'row',index:i,key:`row:${i}`});
for(let i=0;i<n;i++)atoms.push({type:'outside',axis:'col',index:i,key:`col:${i}`});
shuffle(atoms,mulberry32((seed^0x42544352)>>>0));

const carved=clone(source);
let accepted=0,rejected=0,acceptedGiven=0,acceptedOutside=0,totalCarveMs=0,worstCarveMs=0,worstCarve='n/a';
for(const atom of atoms){
  let restore;
  if(atom.type==='given'){
    const idx=carved.givens.findIndex(g=>g.r===atom.given.r&&g.c===atom.given.c&&g.state===atom.given.state);
    if(idx<0)continue;
    restore={idx,value:carved.givens[idx]};carved.givens.splice(idx,1);
  }else{
    const key=atom.axis==='row'?'rowClues':'colClues';restore={key,value:carved[key][atom.index]};carved[key][atom.index]=null;
  }
  const t0=performance.now(),count=countWithOptionalClues(carved,2),ms=performance.now()-t0;
  totalCarveMs+=ms;if(ms>worstCarveMs){worstCarveMs=ms;worstCarve=`${atom.key},count=${count}`;}
  if(count===1){accepted++;if(atom.type==='given')acceptedGiven++;else acceptedOutside++;}
  else{
    rejected++;
    if(atom.type==='given')carved.givens.splice(restore.idx,0,restore.value);
    else carved[restore.key][atom.index]=restore.value;
  }
}

const remaining=[];
for(let i=0;i<carved.givens.length;i++)remaining.push({type:'given',index:i,key:`given:${i}`});
for(let i=0;i<n;i++)if(Number.isInteger(carved.rowClues[i]))remaining.push({type:'outside',axis:'row',index:i,key:`row:${i}`});
for(let i=0;i<n;i++)if(Number.isInteger(carved.colClues[i]))remaining.push({type:'outside',axis:'col',index:i,key:`col:${i}`});
let removable=0,removableGivens=0,removableOutside=0,totalFrontierMs=0,worstFrontierMs=0,worstFrontier='n/a';
for(const atom of remaining){
  const candidate=clone(carved);
  if(atom.type==='given')candidate.givens.splice(atom.index,1);
  else candidate[atom.axis==='row'?'rowClues':'colClues'][atom.index]=null;
  const t0=performance.now(),count=countWithOptionalClues(candidate,2),ms=performance.now()-t0;
  totalFrontierMs+=ms;if(ms>worstFrontierMs){worstFrontierMs=ms;worstFrontier=`${atom.key},count=${count}`;}
  if(count===1){removable++;if(atom.type==='given')removableGivens++;else removableOutside++;}
}

const finalStart=performance.now();const finalCount=countWithOptionalClues(carved,2);const finalMs=performance.now()-finalStart;
const bare=clone(carved);bare.givens=[];bare.rowClues=Array(n).fill(null);bare.colClues=Array(n).fill(null);const bareCount=countWithOptionalClues(bare,2);
const visibleOutside=carved.rowClues.filter(Number.isInteger).length+carved.colClues.filter(Number.isInteger).length;
const visibleGivens=carved.givens.length;

console.log(`BATTLESHIPS_EXPERT_CARVE seed=${seed} size=${n}x${n} sourceMakeMs=${makeMs.toFixed(1)}`);
console.log(`BATTLESHIPS_EXPERT_CARVE_DIFFERENTIAL productionCount=${productionCount} auditCount=${auditCount} parity=${productionCount===auditCount}`);
console.log(`BATTLESHIPS_EXPERT_CARVE_RESULT sourceAtoms=${atoms.length} sourceGivens=${source.givens.length} sourceOutside=${2*n} finalAtoms=${remaining.length} finalGivens=${visibleGivens} finalOutside=${visibleOutside} accepted=${accepted} acceptedGivens=${acceptedGiven} acceptedOutside=${acceptedOutside} rejected=${rejected} finalCount=${finalCount} bareCount=${bareCount}`);
console.log(`BATTLESHIPS_EXPERT_CARVE_RUNTIME totalCarveMs=${totalCarveMs.toFixed(1)} worstCarveMs=${worstCarveMs.toFixed(1)} worstCarve=${worstCarve} finalVerifyMs=${finalMs.toFixed(1)}`);
console.log(`BATTLESHIPS_EXPERT_CARVE_FRONTIER tested=${remaining.length} removable=${removable} removableGivens=${removableGivens} removableOutside=${removableOutside} locallyIrreducible=${removable===0} totalMs=${totalFrontierMs.toFixed(1)} worstMs=${worstFrontierMs.toFixed(1)} worst=${worstFrontier}`);
console.log(`BATTLESHIPS_EXPERT_CARVE_CLUES rows=${JSON.stringify(carved.rowClues)} cols=${JSON.stringify(carved.colClues)} givens=${JSON.stringify(carved.givens)}`);
const failures=[];if(finalCount!==1)failures.push(`final count ${finalCount}`);if(bareCount===1)failures.push('bare fleet puzzle unexpectedly unique');if(removable!==0)failures.push(`${removable} remaining atoms still removable`);if(accepted===0)failures.push('carving accepted no removals');
if(failures.length){for(const failure of failures)console.error(`BATTLESHIPS_EXPERT_CARVE_FAILURE ${failure}`);console.log('BATTLESHIPS_EXPERT_CARVE:FAIL');process.exitCode=1;}else console.log('BATTLESHIPS_EXPERT_CARVE:PASS');
