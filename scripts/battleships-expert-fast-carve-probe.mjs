import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||95001)>>>0;
const id='battleships';
const difficulty='expert';

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
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant||typeof generator.countBattleshipSolutions!=='function')throw new Error('Battleships runtime unavailable');
const clone=x=>JSON.parse(JSON.stringify(x));
function mulberry32(s){let x=s>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function placements(n,len){
  const out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(c+len<=n)out.push(Array.from({length:len},(_,i)=>[r,c+i]));
    if(len>1&&r+len<=n)out.push(Array.from({length:len},(_,i)=>[r+i,c]));
  }
  return out;
}

// Enumerate the clue-independent legal fleet universe once. Each board is stored as
// a 36-bit BigInt occupancy mask plus row/column totals, so later exact counts are
// only predicate scans. Same-size ships use increasing placement indexes to avoid
// permutation duplicates, matching production semantics.
function buildFleetUniverse(n,fleet){
  const sorted=fleet.slice().sort((a,b)=>b-a),all={};
  for(const len of sorted)if(!all[len])all[len]=placements(n,len);
  const boards=[];
  let occ=0n;
  const rows=Array(n).fill(0),cols=Array(n).fill(0);
  const bit=(r,c)=>1n<<BigInt(r*n+c);
  const haloMask=cells=>{
    let m=0n;
    for(const [r,c] of cells)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      const rr=r+dr,cc=c+dc;if(rr>=0&&cc>=0&&rr<n&&cc<n)m|=bit(rr,cc);
    }
    return m;
  };
  const prepared={};
  for(const len of Object.keys(all).map(Number))prepared[len]=all[len].map(cells=>({cells,mask:cells.reduce((m,[r,c])=>m|bit(r,c),0n),halo:haloMask(cells)}));
  function go(k,start){
    if(k===sorted.length){boards.push({mask:occ,rows:rows.slice(),cols:cols.slice()});return;}
    const len=sorted[k],list=prepared[len],same=k>0&&sorted[k-1]===len,from=same?start:0;
    for(let i=from;i<list.length;i++){
      const p=list[i];
      if((occ&p.halo)!==0n)continue;
      occ|=p.mask;
      for(const [r,c] of p.cells){rows[r]++;cols[c]++;}
      go(k+1,(k+1<sorted.length&&sorted[k+1]===len)?i+1:0);
      for(const [r,c] of p.cells){rows[r]--;cols[c]--;}
      occ^=p.mask;
    }
  }
  go(0,0);
  return boards;
}

function makeCounter(n,boards){
  const bit=(r,c)=>1n<<BigInt(r*n+c);
  return function count(puzzle,limit=2){
    let found=0;
    outer:for(const board of boards){
      for(let i=0;i<n;i++){
        const rv=puzzle.rowClues[i],cv=puzzle.colClues[i];
        if(Number.isInteger(rv)&&board.rows[i]!==rv)continue outer;
        if(Number.isInteger(cv)&&board.cols[i]!==cv)continue outer;
      }
      for(const g of puzzle.givens||[]){
        const on=(board.mask&bit(g.r,g.c))!==0n;
        if((g.state===1)!==on)continue outer;
      }
      found++;if(found>=limit)return found;
    }
    return found;
  };
}

const makeStart=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-makeStart;
const source=clone(out.puzzle),n=source.size;

const universeStart=performance.now();
const boards=buildFleetUniverse(n,source.fleet);
const universeMs=performance.now()-universeStart;
const fastCount=makeCounter(n,boards);

const prodStart=performance.now();
const productionCount=generator.countBattleshipSolutions(source,2,{});
const productionMs=performance.now()-prodStart;
const fastStart=performance.now();
const fastSourceCount=fastCount(source,2);
const fastSourceMs=performance.now()-fastStart;
if(productionCount!==fastSourceCount||fastSourceCount!==1)throw new Error(`full-clue differential mismatch production=${productionCount} fast=${fastSourceCount}`);

const atoms=[];
for(const g of source.givens||[])atoms.push({type:'given',given:clone(g),key:`given:${g.r},${g.c},${g.state}`});
for(let i=0;i<n;i++)atoms.push({type:'outside',axis:'row',index:i,key:`row:${i}`});
for(let i=0;i<n;i++)atoms.push({type:'outside',axis:'col',index:i,key:`col:${i}`});
shuffle(atoms,mulberry32((seed^0x42544352)>>>0));

const carved=clone(source);
let accepted=0,acceptedGivens=0,acceptedOutside=0,rejected=0,totalCarveMs=0,worstCarveMs=0,worstCarve='n/a';
for(const atom of atoms){
  let restore;
  if(atom.type==='given'){
    const idx=carved.givens.findIndex(g=>g.r===atom.given.r&&g.c===atom.given.c&&g.state===atom.given.state);
    if(idx<0)continue;
    restore={idx,value:carved.givens[idx]};carved.givens.splice(idx,1);
  }else{
    const key=atom.axis==='row'?'rowClues':'colClues';restore={key,value:carved[key][atom.index]};carved[key][atom.index]=null;
  }
  const t0=performance.now(),count=fastCount(carved,2),ms=performance.now()-t0;
  totalCarveMs+=ms;if(ms>worstCarveMs){worstCarveMs=ms;worstCarve=`${atom.key},count=${count}`;}
  if(count===1){accepted++;if(atom.type==='given')acceptedGivens++;else acceptedOutside++;}
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
let removable=0,totalFrontierMs=0,worstFrontierMs=0,worstFrontier='n/a';
for(const atom of remaining){
  const candidate=clone(carved);
  if(atom.type==='given')candidate.givens.splice(atom.index,1);
  else candidate[atom.axis==='row'?'rowClues':'colClues'][atom.index]=null;
  const t0=performance.now(),count=fastCount(candidate,2),ms=performance.now()-t0;
  totalFrontierMs+=ms;if(ms>worstFrontierMs){worstFrontierMs=ms;worstFrontier=`${atom.key},count=${count}`;}
  if(count===1)removable++;
}

const finalCount=fastCount(carved,2);
const bare=clone(carved);bare.givens=[];bare.rowClues=Array(n).fill(null);bare.colClues=Array(n).fill(null);
const bareCount=fastCount(bare,2);
const visibleOutside=carved.rowClues.filter(Number.isInteger).length+carved.colClues.filter(Number.isInteger).length;

console.log(`BATTLESHIPS_FAST_CARVE seed=${seed} size=${n}x${n} sourceMakeMs=${makeMs.toFixed(1)}`);
console.log(`BATTLESHIPS_FAST_UNIVERSE boards=${boards.length} buildMs=${universeMs.toFixed(1)}`);
console.log(`BATTLESHIPS_FAST_DIFFERENTIAL productionCount=${productionCount} fastCount=${fastSourceCount} productionMs=${productionMs.toFixed(1)} fastMs=${fastSourceMs.toFixed(1)} parity=${productionCount===fastSourceCount}`);
console.log(`BATTLESHIPS_FAST_RESULT sourceAtoms=${atoms.length} finalAtoms=${remaining.length} finalGivens=${carved.givens.length} finalOutside=${visibleOutside} accepted=${accepted} acceptedGivens=${acceptedGivens} acceptedOutside=${acceptedOutside} rejected=${rejected} finalCount=${finalCount} bareCount=${bareCount}`);
console.log(`BATTLESHIPS_FAST_RUNTIME totalCarveMs=${totalCarveMs.toFixed(1)} worstCarveMs=${worstCarveMs.toFixed(1)} worstCarve=${worstCarve}`);
console.log(`BATTLESHIPS_FAST_FRONTIER tested=${remaining.length} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalFrontierMs.toFixed(1)} worstMs=${worstFrontierMs.toFixed(1)} worst=${worstFrontier}`);
console.log(`BATTLESHIPS_FAST_CLUES rows=${JSON.stringify(carved.rowClues)} cols=${JSON.stringify(carved.colClues)} givens=${JSON.stringify(carved.givens)}`);
const failures=[];
if(finalCount!==1)failures.push(`final count ${finalCount}`);
if(bareCount===1)failures.push('bare fleet unexpectedly unique');
if(removable!==0)failures.push(`${removable} remaining atoms removable`);
if(accepted===0)failures.push('no removals accepted');
if(failures.length){for(const failure of failures)console.error(`BATTLESHIPS_FAST_FAILURE ${failure}`);console.log('BATTLESHIPS_FAST_CARVE:FAIL');process.exitCode=1;}
else console.log('BATTLESHIPS_FAST_CARVE:PASS');
