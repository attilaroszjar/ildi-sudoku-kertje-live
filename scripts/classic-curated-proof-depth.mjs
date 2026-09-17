import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function replayToStall(rec){
  const state=new H.ClassicHumanState(rec.puzzle);
  const options={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true};
  let steps=0;
  while(state.valid&&!state.isSolved()&&steps<10000){
    const d=H.findNext(state,options);if(!d)break;
    if(!state.apply(d))break;
    steps++;
  }
  return {state,status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID',steps};
}

function gridWith(state,cell,digit){
  const g=state.cloneGrid(),rc=C.rowCol(cell);g[rc[0]][rc[1]]=digit;return g;
}

function candidateList(state){
  const out=[];
  for(let cell=0;cell<81;cell++){
    const rc=C.rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
    for(const digit of C.digitsFromMask(state.masks[cell]))out.push({cell,digit});
  }
  return out;
}

function contradictionDepth(state,cell,digit,maxDepth){
  const start=gridWith(state,cell,digit);
  if(C.countSolutions(start,1)!==0)return null;
  // Bounded proof proxy: recursively branch on minimum-candidate cells, looking for a contradiction tree.
  function rec(grid,depth,budget){
    const s=new C.ClassicCandidateState(grid);
    if(!s.valid)return {ok:true,depth:0,nodes:1};
    if(C.countSolutions(grid,1)!==0)return {ok:false,depth:null,nodes:1};
    if(depth<=0||budget.nodes<=0)return {ok:false,depth:null,nodes:1};
    let best=null;
    for(let cell=0;cell<81;cell++){
      const rc=C.rowCol(cell);if(s.grid[rc[0]][rc[1]])continue;
      const ds=C.digitsFromMask(s.masks[cell]);
      if(ds.length<2)continue;
      if(!best||ds.length<best.digits.length)best={cell,digits:ds};
    }
    if(!best)return {ok:false,depth:null,nodes:1};
    let nodes=1,maxChild=0;
    for(const d of best.digits){
      if(nodes>=budget.nodes)return {ok:false,depth:null,nodes};
      const g=grid.map(r=>r.slice()),rc=C.rowCol(best.cell);g[rc[0]][rc[1]]=d;
      const child=rec(g,depth-1,{nodes:budget.nodes-nodes});nodes+=child.nodes;
      if(!child.ok)return {ok:false,depth:null,nodes};
      maxChild=Math.max(maxChild,child.depth);
    }
    return {ok:true,depth:maxChild+1,nodes};
  }
  for(let depth=1;depth<=maxDepth;depth++){
    const r=rec(start,depth,{nodes:512});if(r.ok)return {depth,nodes:r.nodes};
  }
  return {depth:null,nodes:512};
}

for(const rec of corpus){
  const t0=Date.now(),base=replayToStall(rec),cands=candidateList(base.state),proofs=[];
  for(const x of cands){
    const probe=gridWith(base.state,x.cell,x.digit);
    if(C.countSolutions(probe,1)!==0)continue;
    const p=contradictionDepth(base.state,x.cell,x.digit,4);
    proofs.push({cell:x.cell,digit:x.digit,depth:p&&p.depth,nodes:p&&p.nodes});
  }
  proofs.sort((a,b)=>(a.depth==null?99:a.depth)-(b.depth==null?99:b.depth)||a.nodes-b.nodes||a.cell-b.cell||a.digit-b.digit);
  console.log('CLASSIC_CURATED_PROOF_DEPTH '+JSON.stringify({id:rec.id,status:base.status,baselineSteps:base.steps,provenFalseCandidates:proofs.length,shallowest:proofs.slice(0,16),elapsedMs:Date.now()-t0}));
}
