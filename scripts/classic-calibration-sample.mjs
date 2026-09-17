import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const require=createRequire(import.meta.url);
const execFileAsync=promisify(execFile);
const Ingestion=require('../games/classic-human/corpus-ingestion.js');
const Calibration=require('../games/classic-human/calibration.js');

const SEED=101;
const BANDS=['gentle','focused','expert'];
const WORKER_FLAG='--worker-band';

if(process.argv[2]===WORKER_FLAG){
  const band=process.argv[3];
  if(!BANDS.includes(band))throw new Error('unsupported calibration worker band');
  const records=Ingestion.ingestLegacyClassic({seeds:[SEED],sourceBands:[band]});
  process.stdout.write(JSON.stringify(records[0]));
}else{
  const started=Date.now();
  const jobs=BANDS.map(async band=>{
    const {stdout}=await execFileAsync(process.execPath,[new URL(import.meta.url).pathname,WORKER_FLAG,band],{
      timeout:60000,
      maxBuffer:1024*1024,
      env:Object.assign({},process.env)
    });
    return JSON.parse(stdout);
  });
  const records=await Promise.all(jobs);
  const built={records,coverage:Ingestion.coverage(records)};
  const audit=Calibration.auditCorpus(records);

  console.log('CLASSIC_CALIBRATION_SAMPLE total='+audit.total+' unique='+audit.uniqueCount+' solved='+audit.solvedLogicallyCount+' wall_ms='+(Date.now()-started));
  console.log('CLASSIC_CALIBRATION_COVERAGE '+JSON.stringify(built.coverage));
  console.log('CLASSIC_CALIBRATION_SOURCE_MATRIX '+JSON.stringify(audit.sourceBandRatingMatrix));
  console.log('CLASSIC_CALIBRATION_BANDS '+JSON.stringify(audit.bandCounts));
  console.log('CLASSIC_CALIBRATION_STATUS '+JSON.stringify(audit.statusCounts));
  console.log('CLASSIC_CALIBRATION_RUNTIME '+JSON.stringify(audit.runtime));
  for(const row of audit.rows){
    console.log('CLASSIC_CALIBRATION_ROW '+JSON.stringify({id:row.id,sourceBand:row.sourceBand,clueCount:row.clueCount,score:row.score,band:row.band,status:row.status,hardestTechnique:row.hardestTechnique,totalSteps:row.totalSteps,advancedSteps:row.advancedSteps,dependencyDepth:row.dependencyDepth,elapsedMs:row.elapsedMs}));
  }
}
