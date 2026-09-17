import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const D=require('../games/classic-human/digit-forcing.js');

function exactCheck(state,step){
  const grid=state.cloneGrid();
  for(const p of step.placements||[]){
    const [r,c]=C.rowCol(p.cell),probe=grid.map(row=>row.slice());probe[r][c]=p.digit;
    if(C.countSolutions(probe,1)!==1)return {ok:false,reason:'UNSOUND_PLACEMENT',action:`${p.cell}=${p.digit}`};
  }
  for(const e of step.eliminations||[]){
    const [r,c]=C.rowCol(e.cell),probe=grid.map(row=>row.slice());probe[r][c]=e.digit;
    if(C.countSolutions(probe,1)!==0)return {ok:false,reason:'UNSOUND_ELIMINATION',action:`${e.cell}!=${e.digit}`};
  }
  return {ok:true};
}

for(const rec of corpus){
  const baseline=H.solve(rec.puzzle,{allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true});
  const state=new H.ClassicHumanState(rec.puzzle);
  for(const step of baseline.steps)state.apply(step);
  const probes=[];
  for(const [id,fn] of [
    ['digit-forcing-chain',()=>D.findDigitForcingChain(state,{seedBudget:32,maxSteps:32})],
    ['digit-forcing-net',()=>D.findDigitForcingNet(state,{seedBudget:32,maxSteps:32})]
  ]){
    const t0=Date.now();let found=[],error=null;
    try{found=fn()||[];}catch(err){error=String(err&&err.message||err);}
    const first=found[0]||null;
    probes.push({id,found:found.length,first:first?{techniqueId:first.techniqueId,placements:first.placements.map(x=>`${x.cell}=${x.digit}`),eliminations:first.eliminations.map(x=>`${x.cell}!=${x.digit}`),complexity:first.complexity,exact:exactCheck(state,first)}:null,elapsedMs:Date.now()-t0,error});
  }
  console.log('CLASSIC_CURATED_DIGIT_FORCING_ROW '+JSON.stringify({id:rec.id,baselineStatus:baseline.status,baselineSteps:baseline.steps.length,probes}));
}
