import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function compactActions(step){
  return {
    placements:(step.placements||[]).map(x=>`${x.cell}=${x.digit}`),
    eliminations:(step.eliminations||[]).map(x=>`${x.cell}!=${x.digit}`)
  };
}

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

function replay(record){
  const options={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true};
  const state=new H.ClassicHumanState(record.puzzle);
  const techniques={};
  let stepIndex=0;
  while(state.valid&&!state.isSolved()&&stepIndex<10000){
    const step=H.findNext(state,options);
    if(!step){
      return {id:record.id,status:'STALLED',stepIndex,techniques};
    }
    const exact=exactStepCheck(state,step);
    techniques[step.techniqueId]=(techniques[step.techniqueId]||0)+1;
    if(!exact.ok){
      return {id:record.id,status:'UNSOUND',stepIndex,techniqueId:step.techniqueId,exact,actions:compactActions(step),complexity:step.complexity||{},techniques};
    }
    if(!state.apply(step)){
      return {id:record.id,status:'APPLY_REJECTED',stepIndex,techniqueId:step.techniqueId,actions:compactActions(step),techniques};
    }
    stepIndex++;
  }
  return {id:record.id,status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STEP_LIMIT'):'INVALID_AFTER_SOUND_STEP',stepIndex,techniques};
}

const started=Date.now();
const rows=corpus.map(replay);
console.log('CLASSIC_CURATED_SOUNDNESS total='+rows.length+' wall_ms='+(Date.now()-started));
for(const row of rows)console.log('CLASSIC_CURATED_SOUNDNESS_ROW '+JSON.stringify(row));
if(rows.some(row=>row.status==='UNSOUND'||row.status==='APPLY_REJECTED'||row.status==='INVALID_AFTER_SOUND_STEP'))process.exitCode=2;
