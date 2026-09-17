import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const D=require('../games/classic-human/death-blossom.js');

function exactCheck(state,step){
  const grid=state.cloneGrid();
  for(const p of step.placements||[]){
    const [r,c]=C.rowCol(p.cell),probe=grid.map(row=>row.slice());
    probe[r][c]=p.digit;
    if(C.countSolutions(probe,1)!==1)return {ok:false,reason:'UNSOUND_PLACEMENT',action:`${p.cell}=${p.digit}`};
  }
  for(const e of step.eliminations||[]){
    const [r,c]=C.rowCol(e.cell),probe=grid.map(row=>row.slice());
    probe[r][c]=e.digit;
    if(C.countSolutions(probe,1)!==0)return {ok:false,reason:'UNSOUND_ELIMINATION',action:`${e.cell}!=${e.digit}`};
  }
  return {ok:true};
}

for(const rec of corpus){
  const baseline=H.solve(rec.puzzle,{allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true});
  const state=new H.ClassicHumanState(rec.puzzle);
  for(const step of baseline.steps)state.apply(step);
  const t0=Date.now();
  let found=[],error=null;
  try{
    found=D.findDeathBlossom(state,{maxStemCandidates:3,maxCells:4,maxPetalsPerDigit:24,combinationBudget:2048});
  }catch(err){error=String(err&&err.message||err);}
  const first=found[0]||null;
  console.log('CLASSIC_CURATED_DEATH_BLOSSOM_ROW '+JSON.stringify({
    id:rec.id,
    baselineStatus:baseline.status,
    baselineSteps:baseline.steps.length,
    found:found.length,
    first:first?{
      eliminations:first.eliminations.map(x=>`${x.cell}!=${x.digit}`),
      complexity:first.complexity,
      explanationData:first.explanationData,
      exact:exactCheck(state,first)
    }:null,
    elapsedMs:Date.now()-t0,
    error
  }));
}
