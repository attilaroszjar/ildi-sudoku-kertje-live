import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function replayToStall(record){
  const options={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true};
  const state=new H.ClassicHumanState(record.puzzle);
  let steps=0;
  while(state.valid&&!state.isSolved()&&steps<10000){
    const d=H.findNext(state,options);
    if(!d)break;
    if(!state.apply(d))break;
    steps++;
  }
  return {state,steps,status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID'};
}

function cellCardinalityCounts(state){
  const counts={};
  for(let cell=0;cell<81;cell++){
    const [r,c]=C.rowCol(cell);
    if(state.grid[r][c])continue;
    const n=C.bitCount(state.masks[cell]);
    counts[n]=(counts[n]||0)+1;
  }
  return counts;
}

function houseCells(type,index){
  const out=[];
  if(type==='row'){for(let c=0;c<9;c++)out.push(C.cellIndex(index,c));return out;}
  if(type==='column'){for(let r=0;r<9;r++)out.push(C.cellIndex(r,index));return out;}
  const br=Math.floor(index/3)*3,bc=(index%3)*3;
  for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)out.push(C.cellIndex(r,c));
  return out;
}

function digitHouseCardinalityCounts(state){
  const counts={};
  for(const type of ['row','column','box']){
    for(let h=0;h<9;h++){
      const cells=houseCells(type,h);
      for(let digit=1;digit<=9;digit++){
        let n=0;
        for(const cell of cells){
          const [r,c]=C.rowCol(cell);
          if(!state.grid[r][c]&&(state.masks[cell]&C.bitForDigit(digit)))n++;
        }
        if(n>0)counts[n]=(counts[n]||0)+1;
      }
    }
  }
  return counts;
}

for(const rec of corpus){
  const replay=replayToStall(rec);
  const cells=cellCardinalityCounts(replay.state);
  const houses=digitHouseCardinalityCounts(replay.state);
  const bivalueCells=cells[2]||0,trivalueCells=cells[3]||0;
  const bilocationLinks=houses[2]||0,trilocationUnits=houses[3]||0;
  console.log('CLASSIC_CURATED_SEED_INVENTORY '+JSON.stringify({
    id:rec.id,
    status:replay.status,
    baselineSteps:replay.steps,
    unsolvedCells:Object.values(cells).reduce((a,b)=>a+b,0),
    cellCandidateCardinalities:cells,
    digitHouseCardinalities:houses,
    bivalueCells,
    trivalueCells,
    bilocationLinks,
    trilocationUnits,
    forcingCellSeedAvailable:bivalueCells>0||trivalueCells>0,
    digitForcingSeedAvailable:bilocationLinks>0||trilocationUnits>0
  }));
}
