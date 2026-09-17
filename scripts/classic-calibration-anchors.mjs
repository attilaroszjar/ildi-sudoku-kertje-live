import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Anchors=require('../games/classic-human/calibration-anchors.js');

const audit=Anchors.auditAnchors({baselineSingles:40});
console.log('CLASSIC_CALIBRATION_ANCHORS monotonic='+audit.monotonicScore+' baseline_singles='+audit.baselineSingles+' evidence='+audit.evidenceType);
for(const row of audit.rows){
  console.log('CLASSIC_CALIBRATION_ANCHOR '+JSON.stringify(row));
}
