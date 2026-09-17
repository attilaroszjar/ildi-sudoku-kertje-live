import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { structuralSolutionFingerprint } from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const sampleCount=6;
const minSuccessfulSamples=4;
const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const G=ctx.SudokuGenerator,C=ctx.CombinedKillerGenerator;
function round(x){return Math.round(x*10)/10;}
function percentile(sorted,p){if(!sorted.length)return null;const i=Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1);return sorted[i];}
function isExpectedExhaustion(error){return String(error&&error.message||error).startsWith('GENERATION_EXHAUSTED:');}
const rows={},failures=[];
for(let vi=0;vi<ids.length;vi++){
  const id=ids[vi],variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error('missing variant '+id);
  const solutions=new Set(),structures=new Set(),topologies=new Set(),puzzles=new Set(),times=[],samples=[],exhaustions=[];
  for(let si=0;si<sampleCount;si++){
    const seed=(0x735a0000+vi*0x10000+si*0x10f3)>>>0,t0=performance.now();
    try{
      const generated=C.makeVariantPilot(G,variant,seed,'focused',{maxAttempts:8});
      const ms=performance.now()-t0,g=generated.generation||{};
      times.push(ms);solutions.add(JSON.stringify(generated.solution));structures.add(structuralSolutionFingerprint(generated.solution));topologies.add(g.topologyFingerprint);puzzles.add(JSON.stringify(generated.puzzle));
      samples.push({seed,ms:round(ms),clues:g.clues,cages:g.cageCount,componentAttempts:g.componentSearchAttempts});
    }catch(error){
      const message=String(error&&error.message||error);
      if(isExpectedExhaustion(error))exhaustions.push({seed,message});
      else failures.push(id+':'+seed+':generation:'+message);
    }
  }
  const sorted=times.slice().sort((a,b)=>a-b),generated=samples.length;
  const r={attempted:sampleCount,generated,exhausted:exhaustions.length,solutionUnique:solutions.size,structuralSolutionUnique:structures.size,topologyUnique:topologies.size,puzzleUnique:puzzles.size,medianMs:round(percentile(sorted,.5)),p95Ms:round(percentile(sorted,.95)),maxMs:round(sorted.at(-1)||0),samples,exhaustions};
  rows[id]=r;
  if(generated<minSuccessfulSamples)failures.push(id+':generated='+generated+'<'+minSuccessfulSamples);
  if(r.solutionUnique!==generated)failures.push(id+':solutionUnique='+r.solutionUnique+' generated='+generated);
  if(r.structuralSolutionUnique!==generated)failures.push(id+':structuralSolutionUnique='+r.structuralSolutionUnique+' generated='+generated);
  if(r.topologyUnique!==generated)failures.push(id+':topologyUnique='+r.topologyUnique+' generated='+generated);
  if(r.puzzleUnique!==generated)failures.push(id+':puzzleUnique='+r.puzzleUnique+' generated='+generated);
  if(generated+r.exhausted!==sampleCount)failures.push(id+':unaccountedAttempts='+(sampleCount-generated-r.exhausted));
}
const pass=failures.length===0;
console.log('COMBINED_KILLER_PRODUCTION_AUDIT '+JSON.stringify({sampleCount,minSuccessfulSamples,variants:rows,failures}));
console.log('COMBINED_KILLER_PRODUCTION_AUDIT:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
