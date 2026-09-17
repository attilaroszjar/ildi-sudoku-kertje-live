(function(root){'use strict';
  var C=root.ClassicHumanContracts,H=root.ClassicHuman,R=root.ClassicHumanRating,P=root.ClassicHumanPoolRecord;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!H&&typeof require==='function')H=require('./index.js');
  if(!R&&typeof require==='function')R=require('./rating.js');
  if(!P&&typeof require==='function')P=require('./pool-record.js');

  var REASONS=Object.freeze({ACCEPTED:'ACCEPTED',NON_UNIQUE:'NON_UNIQUE',UNRATED_INCOMPLETE:'UNRATED_INCOMPLETE',BAND_MISMATCH:'BAND_MISMATCH',INVALID:'INVALID'});
  var DEFAULT_SOLVER_OPTIONS=Object.freeze({maxSteps:10000,allowUniqueness:true,allowServerPreferred:false,allowServerOnly:false});
  var SOLVER_VERSION='classic-human-v1',RATER_VERSION='classic-rating-v2';

  function reject(reason,extra){return Object.freeze(Object.assign({reason:reason,record:null},extra||{}));}
  function gridString(grid){var out='';for(var r=0;r<9;r++)for(var c=0;c<9;c++)out+=String(grid[r][c]||0);return out;}
  function solutionString(grid){var value=gridString(grid);return /^[1-9]{81}$/.test(value)?value:null;}
  function validBand(value){return P.BANDS.indexOf(value)>=0;}
  function validSeed(value){return typeof value==='string'||Number.isSafeInteger(value);}
  function validProfile(value){return typeof value==='string'&&value.length>0;}
  function normalizeCandidate(raw){
    if(!raw||typeof raw!=='object')return null;
    if(!validBand(raw.targetBand)||!validProfile(raw.generatorProfile)||!validSeed(raw.seed))return null;
    var puzzle;
    try{puzzle=P.normalizePuzzle(raw.puzzle);}catch(_){return null;}
    var state;
    try{state=new C.ClassicCandidateState(puzzle);}catch(_){return null;}
    if(!state.valid)return null;
    return {puzzle:puzzle,targetBand:raw.targetBand,generatorProfile:raw.generatorProfile,seed:raw.seed,generatedAt:raw.generatedAt,verifiedAt:raw.verifiedAt};
  }
  function solverOptions(raw){
    var source=raw&&raw.solverOptions||{},out=Object.assign({},DEFAULT_SOLVER_OPTIONS,source);
    if(!Number.isInteger(out.maxSteps)||out.maxSteps<1||out.maxSteps>10000)throw new RangeError('solverOptions.maxSteps must be 1..10000');
    out.allowUniqueness=out.allowUniqueness!==false;
    out.allowServerPreferred=out.allowServerPreferred===true;
    out.allowServerOnly=out.allowServerOnly===true;
    return out;
  }
  function evaluatePoolCandidate(raw){
    var candidate=normalizeCandidate(raw);if(!candidate)return reject(REASONS.INVALID);
    var uniqueness=C.countSolutions(candidate.puzzle,2);
    if(uniqueness!==1)return reject(REASONS.NON_UNIQUE,{solutionCount:uniqueness});
    var options;
    try{options=solverOptions(raw);}catch(_){return reject(REASONS.INVALID);}
    var solved;
    try{solved=H.solve(candidate.puzzle,options);}catch(_){return reject(REASONS.INVALID);}
    if(solved.status==='INVALID')return reject(REASONS.INVALID,{solveStatus:solved.status});
    var rating;
    try{rating=R.rateSolve(solved,raw&&raw.ratingOptions);}catch(_){return reject(REASONS.INVALID);}
    if(solved.status!=='SOLVED_LOGICALLY'||rating.scoreStatus==='UNRATED_INCOMPLETE'||rating.band==null)return reject(REASONS.UNRATED_INCOMPLETE,{solveStatus:solved.status,rating:rating});
    if(rating.band!==candidate.targetBand)return reject(REASONS.BAND_MISMATCH,{solveStatus:solved.status,rating:rating});
    var solution=solutionString(solved.finalState);if(!solution)return reject(REASONS.INVALID,{solveStatus:solved.status});
    var recordRaw={
      puzzle:candidate.puzzle,solution:solution,uniqueness:'UNIQUE',status:solved.status,targetBand:candidate.targetBand,
      score:rating.score,band:rating.band,scoreStatus:rating.scoreStatus,hardestTechnique:rating.hardestTechnique,
      techniqueCounts:rating.techniqueCounts,familyCounts:rating.familyCounts,totalSteps:rating.totalSteps,placements:rating.placements,
      eliminations:rating.eliminations,advancedSteps:rating.advancedSteps,workload:rating.workload,dependencyDepth:rating.dependencyDepth,
      usesUniquenessAssumption:rating.usesUniquenessAssumption,usesServerPreferred:rating.usesServerPreferred,usesServerOnly:rating.usesServerOnly,
      generatorProfile:candidate.generatorProfile,seed:candidate.seed,solverVersion:SOLVER_VERSION,raterVersion:RATER_VERSION,trace:rating.trace
    };
    if(candidate.generatedAt!=null)recordRaw.generatedAt=candidate.generatedAt;
    if(candidate.verifiedAt!=null)recordRaw.verifiedAt=candidate.verifiedAt;
    var record;
    try{record=P.normalizePoolRecord(recordRaw);}catch(_){return reject(REASONS.INVALID,{solveStatus:solved.status,rating:rating});}
    return Object.freeze({reason:REASONS.ACCEPTED,record:record,solutionCount:1,solveStatus:solved.status,rating:rating});
  }

  var api={REASONS:REASONS,DEFAULT_SOLVER_OPTIONS:DEFAULT_SOLVER_OPTIONS,SOLVER_VERSION:SOLVER_VERSION,RATER_VERSION:RATER_VERSION,evaluatePoolCandidate:evaluatePoolCandidate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanPoolEvaluator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
