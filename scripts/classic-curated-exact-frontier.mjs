import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function replayToStall(rec){
  const options={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true};
  const state=new H.ClassicHumanState(rec.puzzle);
  let steps=0;
  while(state.valid&&!state.isSolved()&&steps<10000){
    const d=H.findNext(state,options); if(!d)break;
    if(!state.apply(d))break;
    steps++;
  }
  return {state,steps,status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID'};
}
function gridFromState(state){return state.cloneGrid();}
function forcedPlacements(state){
  const grid=gridFromState(state),out=[];
  for(let cell=0;cell<81;cell++){
    const [r,c]=C.rowCol(cell); if(grid[r][c])continue;
    const digits=C.digitsFromMask(state.masks[cell]);
    for(const digit of digits){
      const probe=grid.map(row=>row.slice()); probe[r][c]=digit;
      if(C.countSolutions(probe,1)===1)out.push({cell,digit});
    }
  }
  return out;
}
function forcedEliminations(state){
  const grid=gridFromState(state),out=[];
  for(let cell=0;cell<81;cell++){
    const [r,c]=C.rowCol(cell); if(grid[r][c])continue;
    for(const digit of C.digitsFromMask(state.masks[cell])){
      const probe=grid.map(row=>row.slice()); probe[r][c]=digit;
      if(C.countSolutions(probe,1)===0)out.push({cell,digit});
    }
  }
  return out;
}
for(const rec of corpus){
  const t0=Date.now(),base=replayToStall(rec);
  const placements=forcedPlacements(base.state);
  const eliminations=forcedEliminations(base.state);
  console.log('CLASSIC_CURATED_EXACT_FRONTIER '+JSON.stringify({
    id:rec.id,status:base.status,baselineSteps:base.steps,
    forcedPlacements:placements.slice(0,12),forcedPlacementCount:placements.length,
    forcedEliminations:eliminations.slice(0,24),forcedEliminationCount:eliminations.length,
    elapsedMs:Date.now()-t0
  }));
}
