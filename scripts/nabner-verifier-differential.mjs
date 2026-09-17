import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const coreRefs=['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js'];

function load(extra=[]){
  const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const ref of [...bankRefs,...coreRefs,...extra])vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}

const seed=Number(process.env.NABNER_DIFF_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_DIFF_SEED invalid');

const base=load();
const optimized=load(['games/line-generator-proven-siblings-hardening.js']);
const variant=optimized.SudokuBank.find(v=>v.id==='nabner');
if(!variant)throw new Error('missing nabner');

const generated=optimized.LineGeneratorProvenSiblings.makeVariantPilot(optimized.SudokuGenerator,variant,seed,'expert');
const cases=[{name:'baseline',puzzle:clone(generated.puzzle)}];
for(let i=0;i<81;i++){
  const r=Math.floor(i/9),c=i%9;
  if(!generated.puzzle[r][c])continue;
  const puzzle=clone(generated.puzzle);puzzle[r][c]=0;
  cases.push({name:`remove-r${r+1}c${c+1}`,puzzle});
}

let mismatches=0,baseMs=0,optimizedMs=0;
const rows=[];
for(const testCase of cases){
  const baseVariant=clone(generated),optimizedVariant=clone(generated);
  let t=performance.now();
  const expected=base.SudokuGenerator.countVariantSolutions(testCase.puzzle,baseVariant,2);
  const baseElapsed=performance.now()-t;baseMs+=baseElapsed;
  const stats={};t=performance.now();
  const actual=optimized.SudokuGenerator.countVariantSolutions(testCase.puzzle,optimizedVariant,2,stats);
  const optimizedElapsed=performance.now()-t;optimizedMs+=optimizedElapsed;
  if(expected!==actual)mismatches++;
  rows.push({name:testCase.name,givens:countClues(testCase.puzzle),expected,actual,baseMs:+baseElapsed.toFixed(2),optimizedMs:+optimizedElapsed.toFixed(2),nodes:stats.nodes,branches:stats.branches,deadEnds:stats.deadEnds});
}
const speedup=optimizedMs>0?baseMs/optimizedMs:null;
const solverProfile='nabner-pressure-mrv-reference-last-exact';
console.log('NABNER_VERIFIER_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,baselineGivens:countClues(generated.puzzle),mismatches,baseMs:+baseMs.toFixed(1),optimizedMs:+optimizedMs.toFixed(1),speedup:speedup===null?null:+speedup.toFixed(2),solverProfile,rows}));
const pass=mismatches===0&&countClues(generated.puzzle)===30;
console.log('NABNER_VERIFIER_DIFFERENTIAL_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
