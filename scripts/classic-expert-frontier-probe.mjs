'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const G=require('../games/classic-human/generator-adapter.js');
const E=require('../games/classic-human/pool-evaluator.js');

const START=3000,END=3005;
function removeAt(puzzle,index){return puzzle.slice(0,index)+'0'+puzzle.slice(index+1);}
function scoreOf(result){return result&&result.rating&&Number.isFinite(result.rating.score)?result.rating.score:-1;}
function summarize(result){const r=result&&result.rating||{};return {reason:result.reason,band:r.band||null,score:r.score??null,hardest:r.hardestTechnique||null,advancedSteps:r.advancedSteps??null};}

for(let seed=START;seed<=END;seed++){
  const base=G.makeCandidate(seed,'expert');
  const baseResult=E.evaluatePoolCandidate(base);
  let best={index:-1,result:baseResult,puzzle:base.puzzle};
  let evaluated=0,uniqueChildren=0,expertChildren=0,advancedChildren=0;
  for(let i=0;i<81;i++){
    if(base.puzzle[i]==='0')continue;
    evaluated++;
    const candidate={...base,puzzle:removeAt(base.puzzle,i)};
    const result=E.evaluatePoolCandidate(candidate);
    if(result.reason==='NON_UNIQUE'||result.reason==='INVALID')continue;
    uniqueChildren++;
    if(result.rating&&result.rating.band==='expert')expertChildren++;
    if(result.rating&&result.rating.advancedSteps>0)advancedChildren++;
    if(scoreOf(result)>scoreOf(best.result))best={index:i,result,puzzle:candidate.puzzle};
  }
  console.log('CLASSIC_EXPERT_FRONTIER '+JSON.stringify({seed,base:summarize(baseResult),evaluated,uniqueChildren,expertChildren,advancedChildren,bestRemovalIndex:best.index,best:summarize(best.result)}));
}
