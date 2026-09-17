import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';
const id='classic-skyscrapers';

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.reduce((sum,row)=>sum+row.filter(Boolean).length,0);}
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

const generator=globalThis.SudokuGenerator;
if(!generator||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime failed to load');
if(typeof generator.countDominoSkyscraperSolutions!=='function')throw new Error('countDominoSkyscraperSolutions is unavailable');
const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id===id);
if(!variant)throw new Error(`${id} not found in production SudokuBank`);

const generationStart=performance.now();
const generated=generator.make(variant,seed,difficulty);
const generationMs=performance.now()-generationStart;
if(!generated||!Array.isArray(generated.puzzle))throw new Error('Classic Skyscraper production generator returned no puzzle');

function countVariant(grid,ignoreSpecial=false){
  return generator.countDominoSkyscraperSolutions(grid,generated,2,ignoreSpecial);
}

const givens=countGivens(generated.puzzle);
const total=generated.puzzle.reduce((sum,row)=>sum+row.length,0);
const baselineStart=performance.now();
const baseline=countVariant(generated.puzzle,false);
const baselineMs=performance.now()-baselineStart;
const baseWithoutOutside=countVariant(generated.puzzle,true);

console.log(`CLASSIC_SKYSCRAPER_EXPERT_FRONTIER seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${givens}/${total} density=${(givens/total).toFixed(3)} generationMs=${round1(generationMs).toFixed(1)}`);
console.log(`BASELINE variantSolutions=${baseline} baseSolutions=${baseWithoutOutside} variantEssential=${baseline===1&&baseWithoutOutside!==1} runtimeMs=${round1(baselineMs).toFixed(1)} counter=countDominoSkyscraperSolutions`);
console.log(`STRUCTURE outsideClues=${Array.isArray(generated.data?.clues)?generated.data.clues.length:0} dominoes=${Array.isArray(generated.data?.dominoes)?generated.data.dominoes.length:0}`);
console.log(`GENERATOR_METADATA ${JSON.stringify(generated.generation||{})}`);

const checks=[];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    const value=generated.puzzle[r][c];
    if(!value)continue;
    const candidate=cloneGrid(generated.puzzle);
    candidate[r][c]=0;
    const t0=performance.now();
    const variantSolutions=countVariant(candidate,false);
    const elapsedMs=performance.now()-t0;
    const removable=variantSolutions===1;
    let baseSolutions=null;
    let variantEssential=null;
    if(removable){
      baseSolutions=countVariant(candidate,true);
      variantEssential=baseSolutions!==1;
    }
    checks.push({row:r+1,col:c+1,value,variantSolutions,baseSolutions,variantEssential,removable:removable&&variantEssential!==false,elapsedMs});
  }
}

const removable=checks.filter(check=>check.removable);
const rejected=checks.filter(check=>!check.removable);
const slowest=checks.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,10);
for(const check of checks){
  console.log(`FRONTIER_CHECK r${check.row}c${check.col} value=${check.value} variantSolutions=${check.variantSolutions} baseSolutions=${check.baseSolutions===null?'n/a':check.baseSolutions} variantEssential=${check.variantEssential===null?'n/a':check.variantEssential} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
for(const check of slowest){
  console.log(`SLOWEST_CHECK r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
console.log(`FRONTIER_SUMMARY startingGivens=${givens} removable=${removable.length} rejected=${rejected.length} locallyIrreducible=${baseline===1&&baseWithoutOutside!==1&&removable.length===0} slowestMs=${round1(slowest[0]?.elapsedMs||0).toFixed(1)}`);

const failures=[];
if(baseline!==1)failures.push(`baseline variant solutions=${baseline}, expected 1`);
if(baseWithoutOutside===1)failures.push('baseline is not variant-essential without outside clues');
if(givens!==0)failures.push(`canonical production givens=${givens}, expected 0`);
if(generated.generation?.unique!==true)failures.push('generation.unique is not true');
if(generated.generation?.seed!==seed)failures.push(`generation.seed=${generated.generation?.seed}, expected ${seed}`);
if(generated.generation?.variantEssential!==true)failures.push('generation.variantEssential is not true');
if(generated.generation?.verification!=='solver-verified-local-irreducible')failures.push(`generation.verification=${generated.generation?.verification}, expected solver-verified-local-irreducible`);
if(generated.generation?.policy!=='contract-driven-local-irreducibility')failures.push(`generation.policy=${generated.generation?.policy}, expected contract-driven-local-irreducibility`);
if(generated.generation?.localIrreducibilityProof!=='monotone-nonuniqueness-from-single-pass')failures.push(`generation.localIrreducibilityProof=${generated.generation?.localIrreducibilityProof}, expected monotone-nonuniqueness-from-single-pass`);
if(generated.generation?.locallyIrreducibleUnderProductionContract!==true)failures.push('generation.locallyIrreducibleUnderProductionContract is not true');
if(generated.generation?.acceptedRemovals!==14)failures.push(`generation.acceptedRemovals=${generated.generation?.acceptedRemovals}, expected 14`);
if(generated.generation?.rejectedRemovals!==0)failures.push(`generation.rejectedRemovals=${generated.generation?.rejectedRemovals}, expected 0`);
if(removable.length!==0)failures.push(`${removable.length} clues remain removable under the production contract`);

if(failures.length){
  for(const failure of failures)console.error(`CLASSIC_SKYSCRAPER_EXPERT_FRONTIER_FAILURE ${failure}`);
  console.log('CLASSIC_SKYSCRAPER_EXPERT_FRONTIER:FAIL');
  process.exitCode=1;
}else{
  console.log('CLASSIC_SKYSCRAPER_EXPERT_FRONTIER:PASS');
}
