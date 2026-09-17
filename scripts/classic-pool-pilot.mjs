'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const B=require('../games/classic-human/pool-batch.js');
const A=require('../games/classic-human/pool-audit.js');
const G=require('../games/classic-human/human-guided-generator.js');
const S=require('../games/classic-human/expert-sculptor.js');

const MAX_PILOT_ATTEMPTS=24;
const raw=process.env.CLASSIC_POOL_PILOT_ATTEMPTS;
const attempts=raw==null?6:Number(raw);
if(!Number.isInteger(attempts)||attempts<1||attempts>MAX_PILOT_ATTEMPTS)throw new RangeError('CLASSIC_POOL_PILOT_ATTEMPTS must be 1..'+MAX_PILOT_ATTEMPTS);
const requestedBand=process.env.CLASSIC_POOL_PILOT_BAND||null;
if(requestedBand!=null&&!B.BANDS.includes(requestedBand))throw new RangeError('CLASSIC_POOL_PILOT_BAND must be one of '+B.BANDS.join(','));
const bands=requestedBand?[requestedBand]:B.BANDS;

const starts={gentle:1000,focused:2000,expert:3000};
function round(value){return value==null?null:Math.round(value*10)/10;}
function orderedReasons(rawReasons){
  const out={};
  ['INVALID','NON_UNIQUE','UNRATED_INCOMPLETE','BAND_MISMATCH'].forEach(key=>{if(rawReasons[key])out[key]=rawReasons[key];});
  Object.keys(rawReasons).sort().forEach(key=>{if(!(key in out))out[key]=rawReasons[key];});
  return out;
}
function observedBands(items){
  const out={};
  for(const item of items){
    const rating=item&&item.result&&item.result.rating;
    const band=rating&&rating.band;
    if(band!=null)out[band]=(out[band]||0)+1;
  }
  return Object.fromEntries(Object.keys(out).sort().map(key=>[key,out[key]]));
}
function scoreRange(items){
  const scores=items.map(item=>item&&item.result&&item.result.rating&&item.result.rating.score).filter(Number.isFinite).sort((a,b)=>a-b);
  return scores.length?[scores[0],scores[scores.length-1]]:null;
}

for(const band of bands){
  const observed=[];
  const profile=band==='expert'?S.PROFILE:G.PROFILE;
  const makeCandidate=band==='expert'?(seed=>S.makeCandidate(seed)):(seed=>G.makeCandidate(seed,band));
  const batch=B.runPoolBatch({
    startSeed:starts[band],attemptBudget:attempts,acceptLimit:attempts,
    targetBand:band,generatorProfile:profile,
    makeCandidate,
    onAttempt:item=>observed.push({result:item.result,elapsedMs:item.elapsedMs})
  });
  const audit=A.auditPoolResults(observed);
  const summary={
    profile,
    band,
    seedRange:[batch.startSeed,batch.nextSeed-1],
    attempted:batch.attempted,
    accepted:batch.acceptedCount,
    acceptanceRate:Number((batch.acceptedCount/batch.attempted).toFixed(4)),
    rejections:orderedReasons(batch.rejections),
    observedHumanBands:observedBands(observed),
    scoreRange:scoreRange(observed),
    duplicates:batch.duplicates,
    runtimeMs:{p50:round(audit.runtime.p50),p95:round(audit.runtime.p95),max:round(audit.runtime.max)}
  };
  console.log('CLASSIC_POOL_PILOT '+JSON.stringify(summary));
}
