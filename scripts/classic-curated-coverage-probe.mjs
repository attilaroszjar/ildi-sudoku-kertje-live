import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

const baselineOptions={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true};
const probes=[
  ['aic-max',s=>H.findAIC(s,{maxEdges:15})],
  ['grouped-aic',s=>H.findGroupedAic(s,{maxEdges:12})],
  ['als-xz-max',s=>H.findAlsXz(s,{maxCells:4})],
  ['als-xy-wing-max',s=>H.findAlsXyWing(s,{maxCells:4})],
  ['als-chain-max',s=>H.findAlsChain(s,{maxCells:4,maxAls:6})],
  ['forcing-chain-max',s=>H.findForcingChain(s,{candidateBudget:24,maxSteps:32})],
  ['forcing-net-max',s=>H.findForcingNet(s,{seedBudget:12,maxSteps:32})],
  ['dynamic-forcing-max',s=>H.findDynamicForcingChain(s,{candidateBudget:16,directSteps:32,nestedSteps:6,innerCandidateBudget:12,innerSeedBudget:6,innerSteps:24})],
  ['nested-forcing-max',s=>H.findNestedForcingChain(s,{candidateBudget:12,directSteps:32,nestedSteps:2,dynamicCandidateBudget:8,dynamicNestedSteps:4,dynamicInnerSteps:16,workBudget:12})]
];

function exactStepCheck(state,step){
  const grid=state.cloneGrid();
  if(C.countSolutions(grid,1)!==1)return {ok:false,reason:'STATE_ALREADY_HAS_NO_SOLUTION'};
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

function stalledState(record){
  const solve=H.solve(record.puzzle,baselineOptions);
  const state=new H.ClassicHumanState(record.puzzle);
  for(const step of solve.steps){
    if(!state.apply(step))throw new Error('baseline replay failed for '+record.id);
  }
  return {solve,state};
}

const started=Date.now();
for(const rec of corpus){
  const {solve,state}=stalledState(rec);
  const rows=[];
  for(const [id,fn] of probes){
    const t0=Date.now();
    let found=[],error=null;
    try{ found=fn(state)||[]; }catch(err){ error=String(err&&err.message||err); }
    const first=found[0]||null;
    rows.push({
      id,
      found:found.length,
      first:first?{
        techniqueId:first.techniqueId,
        placements:(first.placements||[]).map(x=>`${x.cell}=${x.digit}`),
        eliminations:(first.eliminations||[]).map(x=>`${x.cell}!=${x.digit}`),
        complexity:first.complexity||{},
        exact:exactStepCheck(state,first)
      }:null,
      elapsedMs:Date.now()-t0,
      error
    });
  }
  console.log('CLASSIC_CURATED_COVERAGE_ROW '+JSON.stringify({
    id:rec.id,
    baselineStatus:solve.status,
    baselineSteps:solve.steps.length,
    baselineTechniques:solve.steps.reduce((m,s)=>(m[s.techniqueId]=(m[s.techniqueId]||0)+1,m),{}),
    probes:rows
  }));
}
console.log('CLASSIC_CURATED_COVERAGE wall_ms='+(Date.now()-started));
