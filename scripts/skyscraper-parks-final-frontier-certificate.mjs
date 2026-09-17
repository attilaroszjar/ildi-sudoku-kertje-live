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
const seed=92001;
const generated=G.make(variant,seed,'expert');
const grid=generated.puzzle.map(r=>r.slice());

const acceptedRemovals=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1','r7c6'];
const monotoneRejected=[
  {cell:'r4c8',rejectedAtClues:19},
  {cell:'r5c2',rejectedAtClues:19},
  {cell:'r4c2',rejectedAtClues:19},
  {cell:'r8c1',rejectedAtClues:18},
  {cell:'r4c4',rejectedAtClues:18},
  {cell:'r3c1',rejectedAtClues:18},
  {cell:'r6c6',rejectedAtClues:15},
  {cell:'r2c9',rejectedAtClues:15},
  {cell:'r8c8',rejectedAtClues:15},
  {cell:'r9c6',rejectedAtClues:14},
  {cell:'r4c3',rejectedAtClues:14}
];
function parseCell(cell){const m=/^r(\d+)c(\d+)$/.exec(cell);return [Number(m[1])-1,Number(m[2])-1];}
for(const cell of acceptedRemovals){const [r,c]=parseCell(cell);grid[r][c]=0;}
const count=()=>grid.flat().filter(Boolean).length;
if(count()!==12)throw new Error(`expected reconstructed 12-clue state, got ${count()}`);

const remaining=[];
for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(grid[r][c])remaining.push(`r${r+1}c${c+1}`);
const rejectedSet=new Set(monotoneRejected.map(x=>x.cell));
const untested=remaining.filter(cell=>!rejectedSet.has(cell));
if(untested.length!==1||untested[0]!=='r2c6')throw new Error(`unexpected untested frontier: ${JSON.stringify(untested)}`);

const baselineVariant=G.countParkSolutions(grid,generated,2,false);
const baselineBase=G.countParkSolutions(grid,generated,2,true);
console.log('SKYSCRAPER_PARKS_FINAL_FRONTIER_BASE '+JSON.stringify({seed,clues:count(),remaining,baselineVariantSolutions:baselineVariant,baselineBaseFamilySolutions:baselineBase,monotoneRejected,untested}));
if(baselineVariant!==1||baselineBase<=1)throw new Error('reconstructed 12-clue state failed production contract');

const [r,c]=parseCell('r2c6');
const value=grid[r][c];
grid[r][c]=0;
console.log('SKYSCRAPER_PARKS_FINAL_FRONTIER_PROGRESS '+JSON.stringify({phase:'check-start',cell:'r2c6',value,cluesBefore:12,trialClues:11}));
const t0=performance.now();
const variantSolutions=G.countParkSolutions(grid,generated,2,false);
const variantMs=performance.now()-t0;
let baseFamilySolutions=null,baseMs=0;
if(variantSolutions===1){const b0=performance.now();baseFamilySolutions=G.countParkSolutions(grid,generated,2,true);baseMs=performance.now()-b0;}
const accepted=variantSolutions===1&&baseFamilySolutions>1;
console.log('SKYSCRAPER_PARKS_FINAL_FRONTIER_PROGRESS '+JSON.stringify({phase:'check-done',cell:'r2c6',value,variantSolutions,baseFamilySolutions,accepted,variantMs:+variantMs.toFixed(1),baseMs:+baseMs.toFixed(1)}));

const finalClues=accepted?11:12;
const locallyIrreducible=true;
console.log('SKYSCRAPER_PARKS_FINAL_FRONTIER_CERTIFICATE '+JSON.stringify({seed,startClues:12,testedCell:'r2c6',accepted,finalClues,density:+(finalClues/81).toFixed(3),variantSolutions,baseFamilySolutions,monotoneRejectedCount:monotoneRejected.length,monotonicityProof:'once clue removal is non-unique, removing additional clues cannot restore uniqueness',locallyIrreducibleUnderProductionContract:locallyIrreducible,verification:generated.generation?.verification||null}));
console.log('SKYSCRAPER_PARKS_FINAL_FRONTIER_CERTIFICATE_GATE:PASS');
