import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93001)>>>0;
const size=Number(process.argv[3]||6);
const difficulty='expert';
const id='akari';

if(!Number.isInteger(size)||size<1)throw new Error(`Invalid Akari size: ${process.argv[3]}`);

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
if(!generator||!variant||typeof generator.countAkariSolutions!=='function')throw new Error('Akari production runtime unavailable');
if(!variant.data)variant.data={};
variant.data.p3Size=size;

const clone=value=>JSON.parse(JSON.stringify(value));
const countNumbered=puzzle=>puzzle.flat().filter(cell=>typeof cell==='number').length;
const countWalls=puzzle=>puzzle.flat().filter(cell=>cell!==false).length;
const stripNumbers=puzzle=>puzzle.map(row=>row.map(cell=>typeof cell==='number'?null:cell));

const makeStart=performance.now();
const out=generator.make(variant,seed,difficulty);
const makeMs=performance.now()-makeStart;
if(!out||!Array.isArray(out.puzzle))throw new Error('Akari generator returned no puzzle');

const puzzle=out.puzzle;
const numbered=[];
for(let r=0;r<puzzle.length;r++)for(let c=0;c<puzzle[r].length;c++)if(typeof puzzle[r][c]==='number')numbered.push([r,c]);

const uniqueStart=performance.now();
const fullCount=generator.countAkariSolutions(puzzle,2);
const fullCountMs=performance.now()-uniqueStart;

const basePuzzle=stripNumbers(puzzle);
const baseStart=performance.now();
const baseCount=generator.countAkariSolutions(basePuzzle,2);
const baseCountMs=performance.now()-baseStart;

let removable=0,worstRemovalMs=0,worstRemoval=null,totalRemovalMs=0;
for(const [r,c] of numbered){
  const candidate=clone(puzzle);
  candidate[r][c]=null;
  const t0=performance.now();
  const count=generator.countAkariSolutions(candidate,2);
  const ms=performance.now()-t0;
  totalRemovalMs+=ms;
  if(ms>worstRemovalMs){worstRemovalMs=ms;worstRemoval={r,c,count};}
  if(count===1)removable++;
}

const clues=countNumbered(puzzle);
const walls=countWalls(puzzle);
const locallyIrreducible=removable===0;
const variantEssential=fullCount===1&&baseCount!==1;
const g=out.generation||{};

console.log(`AKARI_EXPERT_BASELINE seed=${seed} size=${size}x${size}`);
console.log(`AKARI_EXPERT_GENERATION makeMs=${makeMs.toFixed(1)} walls=${walls} numberedClues=${clues} reportedClues=${g.clues??'n/a'} difficultyScore=${g.difficultyScore??'n/a'}`);
console.log(`AKARI_EXPERT_EXACT fullCount=${fullCount} fullCountMs=${fullCountMs.toFixed(1)} baseCount=${baseCount} baseCountMs=${baseCountMs.toFixed(1)} variantEssential=${variantEssential}`);
console.log(`AKARI_EXPERT_FRONTIER tested=${numbered.length} removable=${removable} locallyIrreducible=${locallyIrreducible} totalRemovalMs=${totalRemovalMs.toFixed(1)} worstRemovalMs=${worstRemovalMs.toFixed(1)} worstRemoval=${worstRemoval?`${worstRemoval.r},${worstRemoval.c},count=${worstRemoval.count}`:'n/a'}`);
console.log(`AKARI_EXPERT_METADATA verification=${g.verification||'n/a'} mode=${g.mode||'n/a'} variantEssential=${g.variantEssential===true}`);

const failures=[];
if(fullCount!==1)failures.push(`production puzzle solution count is ${fullCount}, expected 1`);
if(!variantEssential)failures.push(`numberless base solution count is ${baseCount}, expected non-unique`);
if(failures.length){
  for(const failure of failures)console.error(`AKARI_EXPERT_BASELINE_FAILURE ${failure}`);
  console.log('AKARI_EXPERT_BASELINE:FAIL');
  process.exitCode=1;
}else{
  console.log(`AKARI_EXPERT_BASELINE:${locallyIrreducible?'PASS_LOCAL_IRREDUCIBLE':'PASS_FRONTIER_FOUND'}`);
}
