(function(root){'use strict';
  var A=root.ClassicHumanPoolAudit,R=root.ClassicHumanPoolRecord,C=root.ClassicHumanPoolCheckpoint;
  if(typeof require==='function'){
    if(!A)A=require('./pool-audit.js');
    if(!R)R=require('./pool-record.js');
    if(!C)C=require('./pool-checkpoint.js');
  }
  var TARGETS=Object.freeze({gentle:48,focused:48,expert:24});
  function freeze(value){if(value&&typeof value==='object'){Object.keys(value).forEach(function(k){freeze(value[k]);});Object.freeze(value);}return value;}
  function buildBundle(raw,expectedTarget){
    var cp=C.normalizeCheckpoint(raw),target=expectedTarget==null?TARGETS[cp.targetBand]:expectedTarget;
    if(!Number.isInteger(target)||target<1)throw new RangeError('expectedTarget must be a positive integer');
    if(cp.records.length!==target)throw new RangeError('checkpoint accepted count must equal promotion target');
    var audit=A.auditCheckpoint(cp);
    if(!audit.gate.pass)throw new Error('checkpoint audit gate failed: '+audit.gate.failures.join(','));
    var base={schemaVersion:1,poolVersion:'classic-human-production-v1',band:cp.targetBand,generatorProfile:cp.generatorProfile,solverVersion:cp.solverVersion,raterVersion:cp.raterVersion,accepted:cp.records.length,records:cp.records.slice()};
    return freeze(Object.assign({},base,{bundleHash:R.stableHash(base)}));
  }
  function buildManifest(bundles){
    if(!Array.isArray(bundles)||bundles.length!==3)throw new TypeError('exactly three production bundles required');
    var byBand={};bundles.forEach(function(b){if(!b||typeof b!=='object'||!TARGETS[b.band])throw new TypeError('invalid production bundle');if(byBand[b.band])throw new Error('duplicate production band');if(b.accepted!==TARGETS[b.band])throw new RangeError('production bundle target mismatch for '+b.band);byBand[b.band]=b;});
    Object.keys(TARGETS).forEach(function(b){if(!byBand[b])throw new Error('missing production band '+b);});
    var base={schemaVersion:1,poolVersion:'classic-human-production-v1',bands:{}};
    Object.keys(TARGETS).forEach(function(b){var x=byBand[b];base.bands[b]={accepted:x.accepted,bundleHash:x.bundleHash,generatorProfile:x.generatorProfile,solverVersion:x.solverVersion,raterVersion:x.raterVersion};});
    return freeze(Object.assign({},base,{manifestHash:R.stableHash(base)}));
  }
  var api={TARGETS:TARGETS,buildBundle:buildBundle,buildManifest:buildManifest};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanPoolPromotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
