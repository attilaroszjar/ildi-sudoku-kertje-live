import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const Calibration=require('../games/classic-human/calibration.js');

const started=Date.now();
const audit=Calibration.auditCorpus(corpus);
console.log('CLASSIC_CURATED_BRUTAL total='+audit.total+' unique='+audit.uniqueCount+' solved='+audit.solvedLogicallyCount+' expected_matches='+audit.expectedBandMatchCount+' wall_ms='+(Date.now()-started));
console.log('CLASSIC_CURATED_BRUTAL_BANDS '+JSON.stringify(audit.bandCounts));
console.log('CLASSIC_CURATED_BRUTAL_STATUS '+JSON.stringify(audit.statusCounts));
console.log('CLASSIC_CURATED_BRUTAL_RUNTIME '+JSON.stringify(audit.runtime));
for(const row of audit.rows){
  console.log('CLASSIC_CURATED_BRUTAL_ROW '+JSON.stringify({
    id:row.id,
    unique:row.unique,
    status:row.status,
    score:row.score,
    band:row.band,
    expectedBand:row.expectedBand,
    hardestTechnique:row.hardestTechnique,
    totalSteps:row.totalSteps,
    advancedSteps:row.advancedSteps,
    dependencyDepth:row.dependencyDepth,
    usesUniquenessAssumption:row.usesUniquenessAssumption,
    usesServerPreferred:row.usesServerPreferred,
    usesServerOnly:row.usesServerOnly,
    elapsedMs:row.elapsedMs
  }));
}
