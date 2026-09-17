import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||95001)>>>0;
const size=Number(process.argv[3]||6);
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
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
if(!generator||!variant||typeof generator.countBattleshipSolutions!=='function')throw new Error('Battleships production runtime unavailable');
if(!variant.data)variant.data={};
variant.data.p3Size=size;
const clone=value=>JSON.parse(JSON.stringify(value));
const known=Number.isInteger;

const tMake=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-tMake;
const puzzle=out.puzzle;
if(!puzzle||puzzle.size!==size)throw new Error(`Unexpected Battleships size: ${puzzle&&puzzle.size}`);

const tFull=performance.now();
const fullCount=generator.countBattleshipSolutions(puzzle,2,{});
const fullMs=performance.now()-tFull;

const bare=clone(puzzle);
bare.givens=[];
bare.rowClues=Array(size).fill(null);
bare.colClues=Array(size).fill(null);
const tBare=performance.now();
const bareCount=generator.countBattleshipSolutions(bare,2,{});
const bareMs=performance.now()-tBare;

const atoms=[];
for(let i=0;i<puzzle.givens.length;i++)atoms.push({type:'given',index:i,key:`given:${i}`});
for(let i=0;i<size;i++)if(known(puzzle.rowClues[i]))atoms.push({type:'outside',axis:'row',index:i,key:`row:${i}`});
for(let i=0;i<size;i++)if(known(puzzle.colClues[i]))atoms.push({type:'outside',axis:'col',index:i,key:`col:${i}`});
let removable=0,removableGivens=0,removableOutside=0,totalMs=0,worstMs=0,worst='n/a';
for(const atom of atoms){
  const candidate=clone(puzzle);
  if(atom.type==='given')candidate.givens.splice(atom.index,1);
  else candidate[atom.axis==='row'?'rowClues':'colClues'][atom.index]=null;
  const t0=performance.now();
  const count=generator.countBattleshipSolutions(candidate,2,{});
  const ms=performance.now()-t0;
  totalMs+=ms;
  if(ms>worstMs){worstMs=ms;worst=`${atom.key},count=${count}`;}
  if(count===1){removable++;if(atom.type==='given')removableGivens++;else removableOutside++;}
}

const visibleOutside=puzzle.rowClues.filter(known).length+puzzle.colClues.filter(known).length;
const visibleGivens=puzzle.givens.length;
const g=out.generation||{};
console.log(`BATTLESHIPS_EXPERT_PRODUCTION seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)}`);
console.log(`BATTLESHIPS_EXPERT_PRODUCTION_RESULT atoms=${atoms.length} givens=${visibleGivens} outside=${visibleOutside} reportedClues=${g.clues??'n/a'} fullCount=${fullCount} fullMs=${fullMs.toFixed(1)} bareCount=${bareCount} bareMs=${bareMs.toFixed(1)}`);
console.log(`BATTLESHIPS_EXPERT_PRODUCTION_FRONTIER removable=${removable} removableGivens=${removableGivens} removableOutside=${removableOutside} locallyIrreducible=${removable===0} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`BATTLESHIPS_EXPERT_PRODUCTION_METADATA verification=${g.verification||'n/a'} policy=${g.policy||'n/a'} proof=${g.localIrreducibilityProof||'n/a'} accepted=${g.acceptedRemovals??'n/a'} rejected=${g.rejectedRemovals??'n/a'}`);
console.log(`BATTLESHIPS_EXPERT_PRODUCTION_CLUES rows=${JSON.stringify(puzzle.rowClues)} cols=${JSON.stringify(puzzle.colClues)} givens=${JSON.stringify(puzzle.givens)}`);

const failures=[];
if(fullCount!==1)failures.push(`final count ${fullCount}`);
if(bareCount===1)failures.push('bare fleet puzzle unexpectedly unique');
if(removable!==0)failures.push(`${removable} remaining atoms removable`);
if(g.locallyIrreducibleUnderProductionContract!==true)failures.push('local irreducibility metadata missing');
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(failures.length){for(const failure of failures)console.error(`BATTLESHIPS_EXPERT_PRODUCTION_FAILURE ${failure}`);console.log('BATTLESHIPS_EXPERT_PRODUCTION:FAIL');process.exitCode=1;}
else console.log('BATTLESHIPS_EXPERT_PRODUCTION:PASS');
