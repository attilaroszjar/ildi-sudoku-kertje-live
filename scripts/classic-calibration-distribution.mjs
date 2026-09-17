import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Ingestion=require('../games/classic-human/corpus-ingestion.js');
const Calibration=require('../games/classic-human/calibration.js');

const SEEDS=Object.freeze([101,202,303,404,505,606,707,808]);
const BANDS=Object.freeze(['gentle','focused','expert']);

function median(values){
  if(!values.length)return 0;
  const sorted=values.slice().sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}
function counts(values){
  const out={};
  for(const value of values)out[value]=(out[value]||0)+1;
  return out;
}
function summarize(rows){
  const scores=rows.map(r=>r.score);
  return {
    total:rows.length,
    scoreMin:Math.min(...scores),
    scoreMedian:median(scores),
    scoreMax:Math.max(...scores),
    ratedBands:counts(rows.map(r=>r.band)),
    statuses:counts(rows.map(r=>r.status)),
    hardestTechniques:counts(rows.map(r=>r.hardestTechnique||'none')),
    advancedPuzzleCount:rows.filter(r=>r.advancedSteps>0).length,
    serverPreferredCount:rows.filter(r=>r.usesServerPreferred).length,
    serverOnlyCount:rows.filter(r=>r.usesServerOnly).length,
    uniquenessCount:rows.filter(r=>r.usesUniquenessAssumption).length,
    medianSteps:median(rows.map(r=>r.totalSteps)),
    medianDependencyDepth:median(rows.map(r=>r.dependencyDepth||0)),
    medianElapsedMs:median(rows.map(r=>r.elapsedMs))
  };
}

const started=Date.now();
const built=Ingestion.buildRepresentativeCorpus({seeds:SEEDS});
const audit=Calibration.auditCorpus(built.records);
const bySource={};
for(const band of BANDS)bySource[band]=summarize(audit.rows.filter(row=>row.sourceBand===band));

console.log('CLASSIC_CALIBRATION_DISTRIBUTION total='+audit.total+' unique='+audit.uniqueCount+' solved='+audit.solvedLogicallyCount+' wall_ms='+(Date.now()-started));
console.log('CLASSIC_CALIBRATION_DISTRIBUTION_COVERAGE '+JSON.stringify(built.coverage));
console.log('CLASSIC_CALIBRATION_DISTRIBUTION_MATRIX '+JSON.stringify(audit.sourceBandRatingMatrix));
console.log('CLASSIC_CALIBRATION_DISTRIBUTION_BANDS '+JSON.stringify(audit.bandCounts));
console.log('CLASSIC_CALIBRATION_DISTRIBUTION_BY_SOURCE '+JSON.stringify(bySource));
console.log('CLASSIC_CALIBRATION_DISTRIBUTION_RUNTIME '+JSON.stringify(audit.runtime));
