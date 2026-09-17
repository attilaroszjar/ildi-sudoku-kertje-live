'use strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';

const require=createRequire(import.meta.url);
const Runtime=require('../games/classic-human-runtime-generator.js');
const Evaluator=require('../games/classic-human/runtime-evaluator.js');

function classic(){
  return {
    id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},
    puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],
    solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]
  };
}
function loadGenerator(){
  const p=require.resolve('../games/sudoku-generator.js');
  delete require.cache[p];
  delete global.SudokuGenerator;
  require(p);
  return Runtime.install(global.SudokuGenerator);
}
function puzzleString(grid){return grid.flat().join('');}
function clueCount(text){let n=0;for(const ch of text)if(ch!=='0')n++;return n;}
function accepted(ev){const r=ev&&ev.rating;return !!(ev&&ev.unique===true&&ev.status==='SOLVED_LOGICALLY'&&r&&Number.isInteger(r.level)&&r.level>=6&&r.level<=8);}
function summary(ev){const r=ev&&ev.rating||{};return {status:ev&&ev.status||null,unique:ev&&ev.unique===true,level:Number.isInteger(r.level)?r.level:null,score:Number.isFinite(r.score)?r.score:null,band:r.band||null,hardest:r.hardestTechnique||null,advancedSteps:Number.isInteger(r.advancedSteps)?r.advancedSteps:null};}

const seed=Number(process.env.CLASSIC_PLAYABILITY_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('CLASSIC_PLAYABILITY_SEED invalid');

const generator=loadGenerator();
const t0=performance.now();
const generated=generator.make(classic(),seed,'expert');
const generationMs=performance.now()-t0;
const basePuzzle=puzzleString(generated.puzzle);
const baseEvaluation=Evaluator.evaluate(basePuzzle);
const children=[];
let evaluated=0,uniqueChildren=0,acceptedChildren=0;
const childStart=performance.now();
for(let i=0;i<81;i++){
  if(basePuzzle[i]==='0')continue;
  evaluated++;
  const puzzle=basePuzzle.slice(0,i)+'0'+basePuzzle.slice(i+1);
  const ev=Evaluator.evaluate(puzzle);
  if(ev.unique)uniqueChildren++;
  if(accepted(ev))acceptedChildren++;
  if(ev.unique)children.push({index:i,accepted:accepted(ev),...summary(ev)});
}
const childMs=performance.now()-childStart;
const g=generated.generation||{};
console.log('CLASSIC_EXPERT_PLAYABILITY_BASE '+JSON.stringify({seed,givens:clueCount(basePuzzle),generationMs:Number(generationMs.toFixed(1)),runtimeProfile:g.runtimeProfile||null,humanLevel:g.humanLevel??null,humanScore:g.humanScore??null,humanStatus:g.humanStatus||null,baseAttempts:g.baseAttempts??null,removalAttempts:g.removalAttempts??null,verification:g.verification||null,evaluation:summary(baseEvaluation)}));
console.log('CLASSIC_EXPERT_PLAYABILITY_FRONTIER '+JSON.stringify({seed,evaluated,uniqueChildren,acceptedChildren,locallyIrreducibleUnderProductionContract:acceptedChildren===0,childEvaluationMs:Number(childMs.toFixed(1)),accepted:children.filter(x=>x.accepted),uniqueRejected:children.filter(x=>!x.accepted)}));
console.log('CLASSIC_EXPERT_PLAYABILITY_PROBE PASS');
