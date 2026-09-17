'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const P=require('../games/classic-human/pool-persistence.js');
const G=require('../games/classic-human/human-guided-generator.js');
const S=require('../games/classic-human/expert-sculptor.js');

const MAX_CHUNK_ATTEMPTS=24;
const band=process.env.CLASSIC_POOL_BAND;
const checkpointPath=process.env.CLASSIC_POOL_CHECKPOINT_PATH;
const rawAttempts=process.env.CLASSIC_POOL_CHUNK_ATTEMPTS;
const rawStart=process.env.CLASSIC_POOL_START_SEED;
if(!['gentle','focused','expert'].includes(band))throw new RangeError('CLASSIC_POOL_BAND must be gentle, focused or expert');
if(!checkpointPath)throw new TypeError('CLASSIC_POOL_CHECKPOINT_PATH required');
const attempts=rawAttempts==null?6:Number(rawAttempts);
if(!Number.isInteger(attempts)||attempts<1||attempts>MAX_CHUNK_ATTEMPTS)throw new RangeError('CLASSIC_POOL_CHUNK_ATTEMPTS must be 1..'+MAX_CHUNK_ATTEMPTS);
const existing=P.loadCheckpoint(checkpointPath);
let startSeed;
if(existing)startSeed=existing.nextSeed;
else{
  startSeed=Number(rawStart);
  if(!Number.isSafeInteger(startSeed)||startSeed<0)throw new RangeError('CLASSIC_POOL_START_SEED must be a non-negative safe integer for a new checkpoint');
}
const profile=band==='expert'?S.PROFILE:G.PROFILE;
const makeCandidate=band==='expert'?(seed=>S.makeCandidate(seed)):(seed=>G.makeCandidate(seed,band));
const result=P.runCheckpointChunk({checkpointPath,startSeed,attemptBudget:attempts,acceptLimit:attempts,targetBand:band,generatorProfile:profile,makeCandidate});
const cp=result.checkpoint,b=result.batch;
console.log('CLASSIC_POOL_PERSIST '+JSON.stringify({band,profile,chunkStartSeed:b.startSeed,chunkNextSeed:b.nextSeed,chunkAttempted:b.attempted,chunkAccepted:b.acceptedCount,chunkRejected:b.rejectedCount,chunkDuplicates:b.duplicates,totalAttempted:cp.attempted,totalAccepted:cp.records.length,totalDuplicates:cp.duplicates,nextSeed:cp.nextSeed,rejections:cp.rejections}));
