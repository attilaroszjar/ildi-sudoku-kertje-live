import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||97001)>>>0;
const size=Number(process.argv[3]||6);
const difficulty='expert',id='fillomino';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const bankRefs=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-size-control.js');
if(a<0||b<a)throw new Error('production runtime range not found');
const load=[...bankRefs,...refs.slice(a,b+1).filter(x=>!bankRefs.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant||typeof generator.countFillominoSolutions!=='function')throw new Error('Fillomino production runtime unavailable');
variant.data=variant.data||{};variant.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));
const countClues=grid=>grid.flat().filter(Boolean).length;

const tm=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-tm;
const puzzle=out.puzzle,g=out.generation||{};
const tf=performance.now(),fullCount=generator.countFillominoSolutions(puzzle,2),fullMs=performance.now()-tf;
let removable=0,totalMs=0,worstMs=0,worst='n/a';
for(let r=0;r<puzzle.length;r++)for(let c=0;c<puzzle[r].length;c++)if(puzzle[r][c]){
  const candidate=clone(puzzle),saved=candidate[r][c];candidate[r][c]=0;
  const t=performance.now(),count=generator.countFillominoSolutions(candidate,2),ms=performance.now()-t;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`${r},${c},value=${saved},count=${count}`;}if(count===1)removable++;
}
const bare=Array.from({length:size},()=>Array(size).fill(0));
const tb=performance.now(),bareCount=generator.countFillominoSolutions(bare,2),bareMs=performance.now()-tb;
const clues=countClues(puzzle);
console.log(`FILLOMINO_EXPERT_BASELINE seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)} clues=${clues} reportedClues=${g.clues??'n/a'} targetDensity=${(clues/(size*size)).toFixed(3)}`);
console.log(`FILLOMINO_EXPERT_EXACT fullCount=${fullCount} fullMs=${fullMs.toFixed(1)} bareCount=${bareCount} bareMs=${bareMs.toFixed(1)} variantEssential=${fullCount===1&&bareCount!==1}`);
console.log(`FILLOMINO_EXPERT_FRONTIER tested=${clues} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`FILLOMINO_EXPERT_METADATA verification=${g.verification||'n/a'} generatorFamily=${g.generatorFamily||'n/a'} variantEssential=${g.variantEssential===true}`);
const failures=[];if(fullCount!==1)failures.push(`full count ${fullCount}`);if(bareCount===1)failures.push('bare puzzle unexpectedly unique');
if(failures.length){for(const f of failures)console.error(`FILLOMINO_EXPERT_BASELINE_FAILURE ${f}`);console.log('FILLOMINO_EXPERT_BASELINE:FAIL');process.exitCode=1;}
else console.log(`FILLOMINO_EXPERT_BASELINE:${removable?'PASS_FRONTIER_FOUND':'PASS_LOCAL_IRREDUCIBLE'}`);
