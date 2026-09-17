import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const self=fileURLToPath(import.meta.url);
const seed=92001;
const difficulty='expert';

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.reduce((sum,row)=>sum+row.filter(Boolean).length,0);}
function round1(value){return Math.round(value*10)/10;}
function lineCount(variant){return Array.isArray(variant&&variant.data&&variant.data.lines)?variant.data.lines.length:0;}
function statsText(stats){return `nodes=${stats.nodes||0} branches=${stats.branches||0} deadEnds=${stats.deadEnds||0}`;}
function stableSnapshot(generated){
  return {
    puzzle:generated.puzzle,
    solution:generated.solution,
    data:generated.data,
    generation:generated.generation
  };
}

async function loadProductionRuntime(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
  const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
  const lastGenerator=allRefs.indexOf('games/miracle-generator-hardening.js');
  if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator script range not found');

  const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1);
  const refs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

  globalThis.window=globalThis;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of refs){
    await import(pathToFileURL(path.join(root,ref)).href);
  }

  if(!globalThis.SudokuGenerator||!Array.isArray(globalThis.SudokuBank)){
    throw new Error('Lockout frontier probe failed to load production Sudoku runtime');
  }
  const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='lockout');
  if(!variant)throw new Error('production SudokuBank does not contain lockout');
  if(variant.kind!=='lockout')throw new Error(`unexpected Lockout kind: ${variant.kind}`);
  return {generator:globalThis.SudokuGenerator,variant};
}

async function generateFresh(){
  const {generator,variant}=await loadProductionRuntime();
  const t0=performance.now();
  const generated=generator.make(variant,seed,difficulty);
  return {generator,variant,generated,generationMs:performance.now()-t0};
}

if(process.argv.includes('--regen-json')){
  const {generated}=await generateFresh();
  console.log(`LOCKOUT_REGEN_JSON ${JSON.stringify(stableSnapshot(generated))}`);
  process.exit(0);
}

const {generator,variant,generated,generationMs}=await generateFresh();
if(!generated||!Array.isArray(generated.puzzle))throw new Error('Lockout production generator returned no puzzle');

const givens=countGivens(generated.puzzle);
const total=generated.puzzle.length*generated.puzzle.length;
const density=givens/total;

const generatedStats={};
const generatedVariantStart=performance.now();
const generatedVariantSolutions=generator.countVariantSolutions(generated.puzzle,generated,2,generatedStats);
const generatedVariantMs=performance.now()-generatedVariantStart;
const bankStats={};
const bankVariantStart=performance.now();
const bankVariantSolutions=generator.countVariantSolutions(generated.puzzle,variant,2,bankStats);
const bankVariantMs=performance.now()-bankVariantStart;
const baselineClassicStart=performance.now();
const classicSolutions=generator.countSolutions(generated.puzzle,2);
const baselineClassicMs=performance.now()-baselineClassicStart;
const variantEssential=generatedVariantSolutions===1&&classicSolutions!==1;
const topologySame=JSON.stringify((generated.data&&generated.data.lines)||[])===JSON.stringify((variant.data&&variant.data.lines)||[]);

const regen=spawnSync(process.execPath,[self,'--regen-json'],{
  cwd:root,
  encoding:'utf8',
  maxBuffer:16*1024*1024
});
if(regen.status!==0){
  throw new Error(`fresh-process deterministic regeneration failed with status ${regen.status}: ${regen.stderr||regen.stdout}`);
}
const regenLine=regen.stdout.split(/\r?\n/).find(line=>line.startsWith('LOCKOUT_REGEN_JSON '));
if(!regenLine)throw new Error('fresh-process regeneration did not emit snapshot');
const regenerated=JSON.parse(regenLine.slice('LOCKOUT_REGEN_JSON '.length));
const deterministic=JSON.stringify(stableSnapshot(generated))===JSON.stringify(regenerated);

const checks=[];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    const value=generated.puzzle[r][c];
    if(!value)continue;
    const candidate=cloneGrid(generated.puzzle);
    candidate[r][c]=0;
    const stats={};
    const t0=performance.now();
    const solutions=generator.countVariantSolutions(candidate,generated,2,stats);
    const elapsedMs=performance.now()-t0;
    checks.push({row:r+1,col:c+1,value,solutions,removable:solutions===1,elapsedMs,stats});
  }
}

const removable=checks.filter(check=>check.removable);
const rejected=checks.filter(check=>!check.removable);
const slowest=checks.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,10);
const widest=checks.slice().sort((a,b)=>(b.stats.nodes||0)-(a.stats.nodes||0)).slice(0,10);
const metadata=generated.generation||{};

console.log(`LOCKOUT_EXPERT_FRONTIER seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${givens}/${total} density=${density.toFixed(3)} generationMs=${round1(generationMs).toFixed(1)}`);
console.log(`BASELINE generatedVariantSolutions=${generatedVariantSolutions} bankVariantSolutions=${bankVariantSolutions} classicSolutions=${classicSolutions} variantEssential=${variantEssential} generatedVariantMs=${round1(generatedVariantMs).toFixed(1)} bankVariantMs=${round1(bankVariantMs).toFixed(1)} classicMs=${round1(baselineClassicMs).toFixed(1)}`);
console.log(`BASELINE_SEARCH generated ${statsText(generatedStats)} bank ${statsText(bankStats)}`);
console.log(`TOPOLOGY generatedVsBankSame=${topologySame} generatedLineCount=${lineCount(generated)} bankLineCount=${lineCount(variant)}`);
console.log(`DETERMINISTIC freshProcess=${deterministic} includesGeneratedTopology=true`);
console.log(`GENERATOR_METADATA ${JSON.stringify(metadata)}`);
for(const check of checks){
  console.log(`FRONTIER_CHECK r${check.row}c${check.col} value=${check.value} variantSolutions=${check.solutions} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)} ${statsText(check.stats)}`);
}
for(const check of slowest){
  console.log(`SLOWEST_CHECK r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)} ${statsText(check.stats)}`);
}
for(const check of widest){
  console.log(`WIDEST_SEARCH r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)} ${statsText(check.stats)}`);
}
console.log(`FRONTIER_SUMMARY startingGivens=${givens} removable=${removable.length} rejected=${rejected.length} locallyIrreducible=${generatedVariantSolutions===1&&removable.length===0} slowestMs=${round1(slowest[0]?.elapsedMs||0).toFixed(1)} maxNodes=${widest[0]?.stats.nodes||0}`);

const failures=[];
if(generatedVariantSolutions!==1)failures.push(`generated-topology baseline solution count is ${generatedVariantSolutions}, expected 1`);
if(classicSolutions===1)failures.push('baseline puzzle is Classic-unique, so Lockout is not essential');
if(!deterministic)failures.push('fresh-process deterministic regeneration mismatch including topology');
if(metadata.unique!==true)failures.push('generation.unique is not true');
if(metadata.variantEssential!==true)failures.push('generation.variantEssential is not true');
if(metadata.seed!==seed)failures.push(`generation.seed is ${metadata.seed}, expected ${seed}`);
if(lineCount(generated)!==metadata.lineCount)failures.push(`generated line count ${lineCount(generated)} does not match metadata ${metadata.lineCount}`);

if(failures.length){
  for(const failure of failures)console.error(`LOCKOUT_EXPERT_FRONTIER_FAILURE ${failure}`);
  console.log('LOCKOUT_EXPERT_FRONTIER_PROBE:FAIL');
  process.exitCode=1;
}else{
  console.log('LOCKOUT_EXPERT_FRONTIER_PROBE:PASS');
}
