import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const H=require('../games/classic-human/index.js');
const R=require('../games/classic-human/rating.js');

const profile={
  id:'server-preferred-max',
  options:{
    allowUniqueness:true,
    allowServerPreferred:true,
    allowServerOnly:false,
    finderOptions:{
      'aic':{maxEdges:15},
      'grouped-aic':{maxEdges:12},
      'als-xz':{maxCells:4},
      'als-xy-wing':{maxCells:4},
      'als-chain':{maxCells:4,maxAls:6},
      'forcing-chain':{candidateBudget:24,maxSteps:32},
      'forcing-net':{seedBudget:12,maxSteps:32}
    }
  }
};

const started=Date.now();
for(const rec of corpus){
  const t0=Date.now();
  const solve=H.solve(rec.puzzle,profile.options);
  const rating=R.rateSolve(solve);
  console.log('CLASSIC_CURATED_ESCALATION_ROW '+JSON.stringify({
    id:rec.id,
    profile:profile.id,
    status:solve.status,
    score:rating.score,
    band:rating.band,
    hardestTechnique:rating.hardestTechnique,
    totalSteps:rating.totalSteps,
    advancedSteps:rating.advancedSteps,
    usesUniquenessAssumption:rating.usesUniquenessAssumption,
    usesServerPreferred:rating.usesServerPreferred,
    usesServerOnly:rating.usesServerOnly,
    techniqueCounts:rating.techniqueCounts,
    elapsedMs:Date.now()-t0
  }));
}
console.log('CLASSIC_CURATED_ESCALATION wall_ms='+(Date.now()-started));
