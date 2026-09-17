(function(root){'use strict';
  var P=root.ClassicHumanPoolRecord,E=root.ClassicHumanPoolEvaluator;
  if(!P&&typeof require==='function')P=require('./pool-record.js');
  if(!E&&typeof require==='function')E=require('./pool-evaluator.js');
  var SCHEMA_VERSION=2;
  function int(value,name,min){if(!Number.isSafeInteger(value)||value<min)throw new RangeError(name+' invalid');return value;}
  function text(value,name){if(typeof value!=='string'||value.length<1)throw new TypeError(name+' invalid');return value;}
  function band(value){if(P.BANDS.indexOf(value)<0)throw new RangeError('targetBand invalid');return value;}
  function normalizeCounts(raw){var out={};if(raw==null)return out;if(typeof raw!=='object'||Array.isArray(raw))throw new TypeError('rejections invalid');Object.keys(raw).sort().forEach(function(k){out[k]=int(raw[k],'rejections.'+k,0);});return out;}
  function normalizeCheckpoint(raw){
    if(!raw||typeof raw!=='object')throw new TypeError('checkpoint required');
    if(raw.schemaVersion!=null&&raw.schemaVersion!==SCHEMA_VERSION)throw new Error('checkpoint schemaVersion mismatch');
    var records=(raw.records||[]).map(function(record){return P.normalizePoolRecord(record);});
    var hashes=new Set();records.forEach(function(record){var key=record.puzzleHash||record.puzzle;if(hashes.has(key))throw new Error('duplicate checkpoint puzzle');hashes.add(key);});
    var out={schemaVersion:SCHEMA_VERSION,targetBand:band(raw.targetBand),generatorProfile:text(raw.generatorProfile,'generatorProfile'),solverVersion:text(raw.solverVersion,'solverVersion'),raterVersion:text(raw.raterVersion,'raterVersion'),startSeed:int(raw.startSeed,'startSeed',0),nextSeed:int(raw.nextSeed,'nextSeed',0),attempted:int(raw.attempted,'attempted',0),duplicates:int(raw.duplicates||0,'duplicates',0),rejections:normalizeCounts(raw.rejections),records:records};
    if(out.startSeed>Number.MAX_SAFE_INTEGER-out.attempted||out.nextSeed!==out.startSeed+out.attempted)throw new Error('nextSeed mismatch');
    return out;
  }
  function batchIdentity(batch){return {targetBand:band(batch.targetBand),generatorProfile:text(batch.generatorProfile,'generatorProfile'),solverVersion:text(batch.solverVersion,'solverVersion'),raterVersion:text(batch.raterVersion,'raterVersion')};}
  function assertIdentity(base,current){['targetBand','generatorProfile','solverVersion','raterVersion'].forEach(function(k){if(base[k]!==current[k])throw new Error('checkpoint identity mismatch: '+k);});}
  function fromBatch(batch,previous){
    if(!batch||typeof batch!=='object')throw new TypeError('batch required');
    var identity=batchIdentity(batch);
    var base=previous?normalizeCheckpoint(previous):{schemaVersion:SCHEMA_VERSION,targetBand:identity.targetBand,generatorProfile:identity.generatorProfile,solverVersion:identity.solverVersion,raterVersion:identity.raterVersion,startSeed:batch.startSeed,nextSeed:batch.startSeed,attempted:0,duplicates:0,rejections:{},records:[]};
    assertIdentity(base,identity);
    if(batch.startSeed!==base.nextSeed)throw new Error('batch is not contiguous with checkpoint');
    var rejections=Object.assign({},base.rejections);Object.keys(batch.rejections||{}).forEach(function(k){rejections[k]=(rejections[k]||0)+batch.rejections[k];});
    return normalizeCheckpoint({schemaVersion:SCHEMA_VERSION,targetBand:identity.targetBand,generatorProfile:identity.generatorProfile,solverVersion:identity.solverVersion,raterVersion:identity.raterVersion,startSeed:base.startSeed,nextSeed:batch.nextSeed,attempted:base.attempted+batch.attempted,duplicates:base.duplicates+batch.duplicates,rejections:rejections,records:base.records.concat(batch.accepted)});
  }
  function serialize(checkpoint){return JSON.stringify(normalizeCheckpoint(checkpoint));}
  function parse(textValue){if(typeof textValue!=='string')throw new TypeError('checkpoint text required');return normalizeCheckpoint(JSON.parse(textValue));}
  var api={SCHEMA_VERSION:SCHEMA_VERSION,normalizeCheckpoint:normalizeCheckpoint,fromBatch:fromBatch,serialize:serialize,parse:parse};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanPoolCheckpoint=api;
})(typeof globalThis!=='undefined'?globalThis:this);
