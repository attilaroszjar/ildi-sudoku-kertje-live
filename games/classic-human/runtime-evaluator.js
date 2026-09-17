(function(root){'use strict';
  var C=root.ClassicHumanContracts,S=root.ClassicHumanRuntimeSolver,R=root.ClassicHumanRating;
  if(typeof require==='function'){if(!C)C=require('./contracts.js');if(!S)S=require('./runtime-solver.js');if(!R)R=require('./rating.js');}
  function gridString(grid){var out='';for(var r=0;r<9;r++)for(var c=0;c<9;c++)out+=String(grid[r][c]||0);return out;}
  function invalid(status,unique){return Object.freeze({status:status,unique:!!unique,solution:null,rating:null});}
  function baseEvaluate(puzzle,expertSearch){
    var state;try{state=new C.ClassicCandidateState(puzzle);}catch(_){return invalid('INVALID',false);}
    if(!state.valid)return invalid('INVALID',false);
    var count=C.countSolutions(puzzle,2);if(count!==1)return invalid(count===0?'INVALID':'NON_UNIQUE',false);
    var solved=S.solve(puzzle,{maxSteps:10000,allowUniqueness:true,brutalLowerBoundMin:expertSearch?240:null});
    if(solved.status==='INVALID')return invalid('INVALID',true);
    if(solved.status==='BRUTAL_LOWER_BOUND')return Object.freeze({status:'BRUTAL_LOWER_BOUND',unique:true,solution:null,rating:Object.freeze({score:solved.brutalLowerBound,rawScore:solved.brutalLowerBound,band:'brutal',level:9,scoreStatus:'PROVEN_LOWER_BOUND',hardestTechnique:null,totalSteps:solved.steps.length,advancedSteps:null,dependencyDepth:null})});
    var rating=R.rateSolve(solved),solution=solved.status==='SOLVED_LOGICALLY'?gridString(solved.finalState):null;
    return Object.freeze({status:solved.status,unique:true,solution:solution,rating:Object.freeze({score:rating.score,rawScore:rating.rawScore,band:rating.band,level:rating.level,scoreStatus:rating.scoreStatus,hardestTechnique:rating.hardestTechnique,totalSteps:rating.totalSteps,advancedSteps:rating.advancedSteps,dependencyDepth:rating.dependencyDepth})});
  }
  function evaluate(puzzle){return baseEvaluate(puzzle,false);}
  function evaluateExpertSearch(puzzle){return baseEvaluate(puzzle,true);}
  var api={evaluate:evaluate,evaluateExpertSearch:evaluateExpertSearch};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanRuntimeEvaluator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
