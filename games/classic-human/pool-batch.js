(function(root){'use strict';
  var E=root.ClassicHumanPoolEvaluator;
  if(!E&&typeof require==='function')E=require('./pool-evaluator.js');

  var MAX_ATTEMPTS=100000;
  var BANDS=Object.freeze(['gentle','focused','expert']);
  function positiveInt(value,name,max){
    if(!Number.isInteger(value)||value<1||value>max)throw new RangeError(name+' must be 1..'+max);
    return value;
  }
  function nonNegativeSafeInt(value,name){
    if(!Number.isSafeInteger(value)||value<0)throw new RangeError(name+' must be a non-negative safe integer');
    return value;
  }
  function targetBand(value){
    if(BANDS.indexOf(value)<0)throw new RangeError('targetBand invalid');
    return value;
  }
  function generatorProfile(value){
    if(typeof value!=='string'||value.length<1)throw new TypeError('generatorProfile required');
    return value;
  }
  function recordKey(record){return record&&(record.puzzleHash||record.puzzle);}
  function nowMs(){return typeof performance!=='undefined'&&performance&&typeof performance.now==='function'?performance.now():Date.now();}
  function runPoolBatch(config){
    if(!config||typeof config!=='object')throw new TypeError('config required');
    if(typeof config.makeCandidate!=='function')throw new TypeError('makeCandidate required');
    if(config.onAttempt!=null&&typeof config.onAttempt!=='function')throw new TypeError('onAttempt must be a function');
    var startSeed=nonNegativeSafeInt(config.startSeed==null?0:config.startSeed,'startSeed');
    var attemptBudget=positiveInt(config.attemptBudget,'attemptBudget',MAX_ATTEMPTS);
    var acceptLimit=config.acceptLimit==null?attemptBudget:positiveInt(config.acceptLimit,'acceptLimit',attemptBudget);
    var band=targetBand(config.targetBand);
    var profile=generatorProfile(config.generatorProfile);
    if(startSeed>Number.MAX_SAFE_INTEGER-attemptBudget)throw new RangeError('seed range would make nextSeed unsafe');
    var accepted=[],rejections={},seen=new Set(),attempted=0,duplicates=0;
    var existing=config.existingRecords||[];
    if(!Array.isArray(existing))throw new TypeError('existingRecords must be an array');
    existing.forEach(function(record){var key=recordKey(record);if(!key)throw new TypeError('existing record identity required');seen.add(key);});
    for(var offset=0;offset<attemptBudget&&accepted.length<acceptLimit;offset++){
      var seed=startSeed+offset;
      var started=config.onAttempt?nowMs():0;
      var raw=config.makeCandidate(seed,offset);
      attempted++;
      if(!raw||typeof raw!=='object')raw={};
      raw=Object.assign({},raw,{seed:seed,targetBand:band,generatorProfile:profile});
      var result=E.evaluatePoolCandidate(raw);
      var duplicate=false;
      if(result.reason===E.REASONS.ACCEPTED){
        var key=recordKey(result.record);
        if(seen.has(key)){duplicates++;duplicate=true;}
        else{seen.add(key);accepted.push(result.record);}
      }else rejections[result.reason]=(rejections[result.reason]||0)+1;
      if(config.onAttempt)config.onAttempt(Object.freeze({seed:seed,offset:offset,result:result,duplicate:duplicate,elapsedMs:nowMs()-started}));
    }
    var nextSeed=startSeed+attempted;
    if(!Number.isSafeInteger(nextSeed))throw new RangeError('nextSeed must be a safe integer');
    return Object.freeze({
      startSeed:startSeed,nextSeed:nextSeed,attemptBudget:attemptBudget,acceptLimit:acceptLimit,targetBand:band,generatorProfile:profile,
      solverVersion:E.SOLVER_VERSION,raterVersion:E.RATER_VERSION,attempted:attempted,accepted:Object.freeze(accepted),acceptedCount:accepted.length,
      rejectedCount:attempted-accepted.length-duplicates,duplicates:duplicates,rejections:Object.freeze(rejections),
      exhausted:attempted===attemptBudget&&accepted.length<acceptLimit
    });
  }
  var api={MAX_ATTEMPTS:MAX_ATTEMPTS,BANDS:BANDS,runPoolBatch:runPoolBatch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanPoolBatch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
