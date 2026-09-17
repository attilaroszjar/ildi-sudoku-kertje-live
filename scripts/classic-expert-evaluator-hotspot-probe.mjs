'use strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const Runtime=require('../games/classic-human-runtime-generator.js');
const Evaluator=require('../games/classic-human/runtime-evaluator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function clueCount(text){let n=0;for(const ch of text)if(ch!=='0')n++;return n;}
function loadGenerator(){const p=require.resolve('../games/sudoku-generator.js');delete require.cache[p];delete global.SudokuGenerator;require(p);return global.SudokuGenerator;}
function accepted(ev){const r=ev&&ev.rating;return !!(ev&&ev.unique===true&&ev.status==='SOLVED_LOGICALLY'&&r&&Number.isInteger(r.level)&&r.level>=6&&r.level<=8);}

const seed=Number(process.env.CLASSIC_HOTSPOT_SEED||92002);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('CLASSIC_HOTSPOT_SEED invalid');

const original=Evaluator.evaluateExpertSearch;
if(typeof original!=='function')throw new Error('evaluateExpertSearch unavailable');
const calls=[];
Evaluator.evaluateExpertSearch=function(puzzle){
  const t0=performance.now();
  const out=original(puzzle);
  const ms=performance.now()-t0;
  const r=out&&out.rating||{};
  calls.push({
    ms:Number(ms.toFixed(2)),
    givens:clueCount(puzzle),
    status:out&&out.status||null,
    unique:out&&out.unique===true,
    accepted:accepted(out),
    brutalPruned:out&&out.status==='BRUTAL_LOWER_BOUND',
    level:Number.isInteger(r.level)?r.level:null,
    score:Number.isFinite(r.score)?r.score:null,
    hardest:r.hardestTechnique||null,
    advancedSteps:Number.isInteger(r.advancedSteps)?r.advancedSteps:null
  });
  return out;
};

const generator=loadGenerator();Runtime.install(generator);
const t0=performance.now();
const out=generator.make(classic(),seed,'expert');
const totalMs=performance.now()-t0;
Evaluator.evaluateExpertSearch=original;

const sorted=calls.slice().sort((a,b)=>b.ms-a.ms);
const buckets={lt10:0,ms10_49:0,ms50_199:0,ms200_999:0,ge1000:0};
const statusCounts={};
let measuredMs=0,brutalPrunedCalls=0,brutalPrunedMs=0;
for(const call of calls){
  measuredMs+=call.ms;
  if(call.brutalPruned){brutalPrunedCalls++;brutalPrunedMs+=call.ms;}
  if(call.ms<10)buckets.lt10++;else if(call.ms<50)buckets.ms10_49++;else if(call.ms<200)buckets.ms50_199++;else if(call.ms<1000)buckets.ms200_999++;else buckets.ge1000++;
  const key=[call.status,call.unique?'U':'NU',call.accepted?'A':'R',call.brutalPruned?'P':'NP',call.level??'null'].join('/');
  statusCounts[key]=(statusCounts[key]||0)+1;
}
const g=out.generation||{};
console.log('CLASSIC_EXPERT_HOTSPOT_SUMMARY '+JSON.stringify({seed,totalMs:Number(totalMs.toFixed(1)),calls:calls.length,measuredEvaluatorMs:Number(measuredMs.toFixed(1)),brutalPrunedCalls,brutalPrunedMs:Number(brutalPrunedMs.toFixed(1)),finalGivens:g.clues??null,level:g.humanLevel??null,multistartEvaluations:g.multistartEvaluations??null,buckets,statusCounts}));
console.log('CLASSIC_EXPERT_HOTSPOT_TOP '+JSON.stringify(sorted.slice(0,20)));
console.log('CLASSIC_EXPERT_HOTSPOT_PROBE PASS');
