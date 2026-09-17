'use strict';
const fs=require('node:fs');
const path=require('node:path');
const B=require('./pool-batch.js');
const C=require('./pool-checkpoint.js');

function loadCheckpoint(file){
  if(typeof file!=='string'||file.length<1)throw new TypeError('checkpoint path required');
  try{return C.parse(fs.readFileSync(file,'utf8'));}
  catch(error){if(error&&error.code==='ENOENT')return null;throw error;}
}
function saveCheckpointAtomic(file,checkpoint){
  if(typeof file!=='string'||file.length<1)throw new TypeError('checkpoint path required');
  const normalized=C.normalizeCheckpoint(checkpoint);
  const dir=path.dirname(file);fs.mkdirSync(dir,{recursive:true});
  const tmp=file+'.tmp-'+process.pid;
  try{fs.writeFileSync(tmp,C.serialize(normalized)+'\n',{encoding:'utf8',mode:0o644});fs.renameSync(tmp,file);}finally{try{fs.unlinkSync(tmp);}catch(error){if(!error||error.code!=='ENOENT')throw error;}}
  return normalized;
}
function runCheckpointChunk(config){
  if(!config||typeof config!=='object')throw new TypeError('config required');
  const file=config.checkpointPath;
  const previous=loadCheckpoint(file);
  const startSeed=previous?previous.nextSeed:config.startSeed;
  if(!Number.isSafeInteger(startSeed)||startSeed<0)throw new RangeError('startSeed required for new checkpoint');
  const batch=B.runPoolBatch({
    startSeed,
    attemptBudget:config.attemptBudget,
    acceptLimit:config.acceptLimit,
    targetBand:config.targetBand,
    generatorProfile:config.generatorProfile,
    makeCandidate:config.makeCandidate,
    existingRecords:previous?previous.records:[],
    onAttempt:config.onAttempt
  });
  const checkpoint=C.fromBatch(batch,previous);
  saveCheckpointAtomic(file,checkpoint);
  return Object.freeze({batch,checkpoint});
}
module.exports={loadCheckpoint,saveCheckpointAtomic,runCheckpointChunk};
