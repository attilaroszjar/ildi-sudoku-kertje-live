(function(root){'use strict';
  var BANDS=Object.freeze(['gentle','focused','expert','brutal']);
  var HASH_ALGORITHM='fnv1a64-v1';

  function utf8Bytes(text){
    if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(text);
    var out=[];
    for(var i=0;i<text.length;i++){
      var cp=text.codePointAt(i);if(cp>0xffff)i++;
      if(cp<=0x7f)out.push(cp);
      else if(cp<=0x7ff)out.push(0xc0|(cp>>6),0x80|(cp&63));
      else if(cp<=0xffff)out.push(0xe0|(cp>>12),0x80|((cp>>6)&63),0x80|(cp&63));
      else out.push(0xf0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63));
    }
    return out;
  }
  function stableStringify(value){
    if(value===null||typeof value==='number'||typeof value==='boolean')return JSON.stringify(value);
    if(typeof value==='string')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
    if(typeof value==='object'){
      var keys=Object.keys(value).filter(function(k){return value[k]!==undefined;}).sort();
      return '{'+keys.map(function(k){return JSON.stringify(k)+':'+stableStringify(value[k]);}).join(',')+'}';
    }
    throw new TypeError('stableStringify only supports JSON values');
  }
  function stableHash(value){
    var bytes=utf8Bytes(typeof value==='string'?value:stableStringify(value));
    var h=0xcbf29ce484222325n,prime=0x100000001b3n,mask=0xffffffffffffffffn;
    for(var i=0;i<bytes.length;i++){h^=BigInt(bytes[i]);h=(h*prime)&mask;}
    return HASH_ALGORITHM+':'+h.toString(16).padStart(16,'0');
  }
  function freezeJson(value){
    if(value&&typeof value==='object'){
      Object.keys(value).forEach(function(k){freezeJson(value[k]);});
      Object.freeze(value);
    }
    return value;
  }
  function normalizePuzzle(value){
    if(typeof value!=='string'||value.length!==81||!/^[0-9.]+$/.test(value))throw new TypeError('pool puzzle must contain 81 digits/dots');
    return value.replace(/\./g,'0');
  }
  function normalizeSolution(value){
    if(typeof value!=='string'||value.length!==81||!/^[1-9]+$/.test(value))throw new TypeError('pool solution must contain 81 digits 1..9');
    return value;
  }
  function band(value,name){if(BANDS.indexOf(value)<0)throw new TypeError(name+' must be gentle/focused/expert/brutal');return value;}
  function finite(value,name){if(!Number.isFinite(value)||value<0)throw new TypeError(name+' must be finite and non-negative');return value;}
  function integer(value,name){if(!Number.isInteger(value)||value<0)throw new TypeError(name+' must be a non-negative integer');return value;}
  function stringValue(value,name){if(typeof value!=='string'||!value.length)throw new TypeError(name+' must be a non-empty string');return value;}
  function sortedCounts(value,name){
    value=value||{};if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(name+' must be an object');
    var out={};Object.keys(value).sort().forEach(function(k){out[k]=integer(value[k],name+'.'+k);});return out;
  }
  function normalizeTrace(trace){
    if(!Array.isArray(trace))throw new TypeError('pool trace must be an array');
    return JSON.parse(stableStringify(trace));
  }
  function normalizePoolRecord(raw){
    if(!raw||typeof raw!=='object')throw new TypeError('pool record must be an object');
    var schemaVersion=raw.schemaVersion==null?1:raw.schemaVersion;
    if(schemaVersion!==1)throw new RangeError('pool record schemaVersion must be 1');
    var puzzle=normalizePuzzle(raw.puzzle),solution=normalizeSolution(raw.solution);
    if(raw.uniqueness!=='UNIQUE')throw new TypeError('accepted pool record uniqueness must be UNIQUE');
    if(raw.status!=='SOLVED_LOGICALLY')throw new TypeError('accepted pool record status must be SOLVED_LOGICALLY');
    var targetBand=band(raw.targetBand,'targetBand'),measuredBand=band(raw.band,'band');
    if(targetBand!==measuredBand)throw new TypeError('accepted pool record measured band must match targetBand');
    if(raw.scoreStatus!=='PROVISIONAL_UNCALIBRATED')throw new TypeError('accepted pool record scoreStatus must be PROVISIONAL_UNCALIBRATED');
    var trace=normalizeTrace(raw.trace||[]);
    var stable={
      schemaVersion:1,
      puzzle:puzzle,
      solution:solution,
      uniqueness:'UNIQUE',
      status:'SOLVED_LOGICALLY',
      targetBand:targetBand,
      score:finite(raw.score,'score'),
      band:measuredBand,
      scoreStatus:'PROVISIONAL_UNCALIBRATED',
      hardestTechnique:raw.hardestTechnique==null?null:stringValue(raw.hardestTechnique,'hardestTechnique'),
      techniqueCounts:sortedCounts(raw.techniqueCounts,'techniqueCounts'),
      familyCounts:sortedCounts(raw.familyCounts,'familyCounts'),
      totalSteps:integer(raw.totalSteps,'totalSteps'),
      placements:integer(raw.placements,'placements'),
      eliminations:integer(raw.eliminations,'eliminations'),
      advancedSteps:integer(raw.advancedSteps,'advancedSteps'),
      workload:raw.workload&&typeof raw.workload==='object'?JSON.parse(stableStringify(raw.workload)):{},
      dependencyDepth:integer(raw.dependencyDepth||0,'dependencyDepth'),
      usesUniquenessAssumption:!!raw.usesUniquenessAssumption,
      usesServerPreferred:!!raw.usesServerPreferred,
      usesServerOnly:!!raw.usesServerOnly,
      generatorProfile:stringValue(raw.generatorProfile,'generatorProfile'),
      seed:raw.seed,
      solverVersion:stringValue(raw.solverVersion,'solverVersion'),
      raterVersion:stringValue(raw.raterVersion,'raterVersion'),
      trace:trace
    };
    if(!(typeof stable.seed==='string'||Number.isSafeInteger(stable.seed)))throw new TypeError('seed must be a string or safe integer');
    var puzzleHash=stableHash(puzzle),traceHash=stableHash(trace),recordHash=stableHash(stable);
    var out=Object.assign({},stable,{hashAlgorithm:HASH_ALGORITHM,puzzleHash:puzzleHash,traceHash:traceHash,recordHash:recordHash});
    if(raw.generatedAt!=null)out.generatedAt=stringValue(raw.generatedAt,'generatedAt');
    if(raw.verifiedAt!=null)out.verifiedAt=stringValue(raw.verifiedAt,'verifiedAt');
    return freezeJson(out);
  }

  var api={BANDS:BANDS,HASH_ALGORITHM:HASH_ALGORITHM,stableStringify:stableStringify,stableHash:stableHash,normalizePuzzle:normalizePuzzle,normalizeSolution:normalizeSolution,normalizePoolRecord:normalizePoolRecord};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanPoolRecord=api;
})(typeof globalThis!=='undefined'?globalThis:this);
