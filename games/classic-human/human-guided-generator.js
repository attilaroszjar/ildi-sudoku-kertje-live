(function(root){'use strict';
  var G=root.ClassicHumanGeneratorAdapter,E=root.ClassicHumanPoolEvaluator;
  if(!G&&typeof require==='function')G=require('./generator-adapter.js');
  if(!E&&typeof require==='function')E=require('./pool-evaluator.js');
  var PROFILE='classic-human-guided-v2';
  var MAX_REMOVAL_ATTEMPTS=12;
  var BASE_DIFFICULTY=Object.freeze({gentle:'gentle',focused:'focused',expert:'expert'});
  function validBand(value){return ['gentle','focused','expert'].indexOf(value)>=0;}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function orderFor(seed,puzzle){var out=[];for(var i=0;i<81;i++)if(puzzle[i]!=='0')out.push(i);var random=mulberry32((seed^0x9E3779B9)>>>0);for(var j=out.length-1;j>0;j--){var k=Math.floor(random()*(j+1)),t=out[j];out[j]=out[k];out[k]=t;}return out;}
  function candidate(puzzle,seed,targetBand){return {puzzle:puzzle,seed:seed,targetBand:targetBand,generatorProfile:PROFILE};}
  function distance(targetBand,rating){if(!rating||rating.score==null)return Infinity;var score=rating.score;if(targetBand==='gentle')return score<=69?0:score-69;if(targetBand==='focused')return score<70?70-score:score<=129?0:score-129;return score<130?130-score:score<=239?0:score-239;}
  function makeCandidate(seed,targetBand,options){
    if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('seed must be a non-negative safe integer');
    if(!validBand(targetBand))throw new RangeError('targetBand invalid');
    options=options||{};
    var maxAttempts=options.maxRemovalAttempts==null?MAX_REMOVAL_ATTEMPTS:options.maxRemovalAttempts;
    if(!Number.isInteger(maxAttempts)||maxAttempts<0||maxAttempts>MAX_REMOVAL_ATTEMPTS)throw new RangeError('maxRemovalAttempts must be 0..'+MAX_REMOVAL_ATTEMPTS);
    var base=G.makeCandidate(seed,BASE_DIFFICULTY[targetBand]);
    var current=base.puzzle;
    var best=candidate(current,seed,targetBand),bestEval=E.evaluatePoolCandidate(best),bestDistance=distance(targetBand,bestEval.rating);
    if(bestEval.reason===E.REASONS.ACCEPTED||targetBand==='gentle')return best;
    var order=orderFor(seed,current),attempted=0;
    for(var i=0;i<order.length&&attempted<maxAttempts;i++){
      var idx=order[i];if(current[idx]==='0')continue;attempted++;
      var trial=current.slice(0,idx)+'0'+current.slice(idx+1);
      var trialCandidate=candidate(trial,seed,targetBand);
      var evaluated=E.evaluatePoolCandidate(trialCandidate);
      if(evaluated.reason===E.REASONS.NON_UNIQUE||evaluated.reason===E.REASONS.INVALID)continue;
      current=trial;
      var d=distance(targetBand,evaluated.rating);
      if(d<bestDistance){best=trialCandidate;bestEval=evaluated;bestDistance=d;}
      if(evaluated.reason===E.REASONS.ACCEPTED)return trialCandidate;
    }
    return best;
  }
  var api={PROFILE:PROFILE,MAX_REMOVAL_ATTEMPTS:MAX_REMOVAL_ATTEMPTS,makeCandidate:makeCandidate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanGuidedGenerator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
