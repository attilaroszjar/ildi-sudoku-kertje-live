import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const requested=process.argv[2];
const id=ids.includes(requested)?requested:null;
if(!id){process.stderr.write('UNKNOWN_VARIANT\n');process.exit(2);}
const i=ids.indexOf(id);
const c={console,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
const v=c.SudokuBank.find(x=>x.id===id);
if(!v){process.stderr.write('MISSING_VARIANT\n');process.exit(3);}
function clues(grid){let n=0;for(const row of grid)for(const x of row)if(x)n++;return n;}
function cages(variant){return variant&&variant.data&&Array.isArray(variant.data.cages)?variant.data.cages.length:0;}
function write(line){process.stdout.write(line+'\n');}
let seq=0;
const originalVariant=c.SudokuGenerator.countVariantSolutions.bind(c.SudokuGenerator);
const originalClassic=c.SudokuGenerator.countSolutions.bind(c.SudokuGenerator);
const originalBuildCages=c.KillerGenerator.buildCages.bind(c.KillerGenerator);
const originalBuildRenban=c.LineGeneratorWholeSet.buildRenbanPath.bind(c.LineGeneratorWholeSet);

c.KillerGenerator.buildCages=function(solution,seed,options){
  const n=++seq,t=performance.now();
  write(`TRACE STAGE BEGIN n=${n} stage=buildCages seed=${seed>>>0} maxSize=${options&&options.maxSize} minCages=${options&&options.minCages} maxCages=${options&&options.maxCages}`);
  try{
    const result=originalBuildCages(solution,seed,options);
    write(`TRACE STAGE END n=${n} stage=buildCages cages=${result.length} ms=${(performance.now()-t).toFixed(1)}`);
    return result;
  }catch(error){
    write(`TRACE STAGE FAIL n=${n} stage=buildCages ms=${(performance.now()-t).toFixed(1)} error=${String(error&&error.message||error)}`);
    throw error;
  }
};

c.LineGeneratorWholeSet.buildRenbanPath=function(solution,seed,options){
  const n=++seq,t=performance.now();
  write(`TRACE STAGE BEGIN n=${n} stage=buildRenban seed=${seed>>>0} minLength=${options&&options.minLength} maxLength=${options&&options.maxLength} maxNodes=${options&&options.maxNodes}`);
  try{
    const result=originalBuildRenban(solution,seed,options);
    write(`TRACE STAGE END n=${n} stage=buildRenban length=${result.path.length} range=${result.low}-${result.high} nodes=${result.nodes} ms=${(performance.now()-t).toFixed(1)}`);
    return result;
  }catch(error){
    write(`TRACE STAGE FAIL n=${n} stage=buildRenban ms=${(performance.now()-t).toFixed(1)} error=${String(error&&error.message||error)}`);
    throw error;
  }
};

c.SudokuGenerator.countVariantSolutions=function(grid,variant,limit,stats){
  const n=++seq,kinds=variant&&variant.kinds?variant.kinds.join('+'):(variant&&variant.kind||'?'),given=clues(grid),cageCount=cages(variant),t=performance.now();
  write(`TRACE BEGIN n=${n} solver=variant kinds=${kinds} clues=${given} cages=${cageCount} limit=${limit||2}`);
  const result=originalVariant(grid,variant,limit,stats);
  write(`TRACE END n=${n} solver=variant kinds=${kinds} clues=${given} cages=${cageCount} result=${result} ms=${(performance.now()-t).toFixed(1)}`);
  return result;
};
c.SudokuGenerator.countSolutions=function(grid,limit){
  const n=++seq,given=clues(grid),t=performance.now();
  write(`TRACE BEGIN n=${n} solver=classic kinds=classic clues=${given} cages=0 limit=${limit||2}`);
  const result=originalClassic(grid,limit);
  write(`TRACE END n=${n} solver=classic kinds=classic clues=${given} cages=0 result=${result} ms=${(performance.now()-t).toFixed(1)}`);
  return result;
};
const seed=(0x4b430100+i*53)>>>0;
const t0=performance.now();
write(`TRACE START id=${id} seed=${seed} maxAttempts=1 difficulty=focused`);
try{
  const p=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,seed,'focused',{maxAttempts:1});
  write(`TRACE PASS id=${id} totalMs=${(performance.now()-t0).toFixed(1)} clues=${p.generation.clues} cages=${p.generation.cageCount} componentAttempts=${p.generation.componentSearchAttempts}`);
}catch(error){
  write(`TRACE FAIL id=${id} totalMs=${(performance.now()-t0).toFixed(1)} error=${String(error&&error.message||error)}`);
  process.exit(1);
}
