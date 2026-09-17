'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const P=require('../games/classic-human/pool-persistence.js');
const G=require('../games/classic-human/human-guided-generator.js');
const S=require('../games/classic-human/expert-sculptor.js');

const HARD_CHUNK_CAP=24;
const band=process.env.CLASSIC_POOL_BAND;
const checkpointPath=process.env.CLASSIC_POOL_CHECKPOINT_PATH;
const target=Number(process.env.CLASSIC_POOL_TARGET_ACCEPTED);
const rawStart=process.env.CLASSIC_POOL_START_SEED;
const chunkSize=process.env.CLASSIC_POOL_CHUNK_ATTEMPTS==null?12:Number(process.env.CLASSIC_POOL_CHUNK_ATTEMPTS);
const maxTotalAttempts=Number(process.env.CLASSIC_POOL_MAX_TOTAL_ATTEMPTS);

if(!['gentle','focused','expert'].includes(band))throw new RangeError('CLASSIC_POOL_BAND must be gentle, focused or expert');
if(!checkpointPath)throw new TypeError('CLASSIC_POOL_CHECKPOINT_PATH required');
if(!Number.isInteger(target)||target<1)throw new RangeError('CLASSIC_POOL_TARGET_ACCEPTED must be a positive integer');
if(!Number.isInteger(chunkSize)||chunkSize<1||chunkSize>HARD_CHUNK_CAP)throw new RangeError('CLASSIC_POOL_CHUNK_ATTEMPTS must be 1..'+HARD_CHUNK_CAP);
if(!Number.isInteger(maxTotalAttempts)||maxTotalAttempts<1)throw new RangeError('CLASSIC_POOL_MAX_TOTAL_ATTEMPTS must be a positive integer');

const existing=P.loadCheckpoint(checkpointPath);
let startSeed;
if(existing)startSeed=existing.nextSeed;
else{
  startSeed=Number(rawStart);
  if(!Number.isSafeInteger(startSeed)||startSeed<0)throw new RangeError('CLASSIC_POOL_START_SEED must be a non-negative safe integer for a new checkpoint');
}
const initialAttempted=existing?existing.attempted:0;
const initialAccepted=existing?existing.records.length:0;
if(initialAccepted>=target){
  console.log('CLASSIC_POOL_FILL '+JSON.stringify({band,target,status:'TARGET_ALREADY_MET',attempted:initialAttempted,accepted:initialAccepted,nextSeed:existing.nextSeed}));
  process.exitCode=0;
}else{
  const profile=band==='expert'?S.PROFILE:G.PROFILE;
  const makeCandidate=band==='expert'?(seed=>S.makeCandidate(seed)):(seed=>G.makeCandidate(seed,band));
  let cp=existing;
  while((cp?cp.records.length:0)<target){
    const attempted=cp?cp.attempted:0;
    const spent=attempted-initialAttempted;
    const remainingBudget=maxTotalAttempts-spent;
    if(remainingBudget<=0)break;
    const accepted=cp?cp.records.length:0;
    const acceptRemaining=target-accepted;
    const attemptBudget=Math.min(chunkSize,remainingBudget);
    const acceptLimit=Math.min(attemptBudget,acceptRemaining);
    const result=P.runCheckpointChunk({checkpointPath,startSeed,attemptBudget,acceptLimit,targetBand:band,generatorProfile:profile,makeCandidate});
    cp=result.checkpoint;
  }
  cp=P.loadCheckpoint(checkpointPath);
  const reached=cp&&cp.records.length>=target;
  console.log('CLASSIC_POOL_FILL '+JSON.stringify({band,target,status:reached?'TARGET_MET':'ATTEMPT_BUDGET_EXHAUSTED',runAttempted:cp.attempted-initialAttempted,totalAttempted:cp.attempted,totalAccepted:cp.records.length,totalDuplicates:cp.duplicates,nextSeed:cp.nextSeed,rejections:cp.rejections}));
  if(!reached)process.exitCode=2;
}
