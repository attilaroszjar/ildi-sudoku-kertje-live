import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const APE=require('../games/classic-human/aligned-pair-exclusion.js');
const corpus=require('../tests/fixtures/classic-curated-brutal-benchmarks.json');

const id=process.argv[2]||'ai-escargot-2006';
const record=corpus.find(x=>x.id===id);
if(!record)throw new Error(`unknown benchmark: ${id}`);

function solveExact(source){
  const base=new C.ClassicCandidateState(source);if(!base.valid)return null;
  const grid=base.cloneGrid(),rowUsed=new Uint16Array(base.rowUsed),colUsed=new Uint16Array(base.colUsed),boxUsed=new Uint16Array(base.boxUsed);
  let solved=null;
  function search(){if(solved)return;let best=-1,bestMask=0,bestCount=10;for(let idx=0;idx<81;idx++){const [r,c]=C.rowCol(idx);if(grid[r][c])continue;const mask=C.FULL_MASK&~(rowUsed[r]|colUsed[c]|boxUsed[C.boxIndex(r,c)]),cnt=C.bitCount(mask);if(!cnt)return;if(cnt<bestCount){best=idx;bestMask=mask;bestCount=cnt;if(cnt===1)break;}}
    if(best<0){solved=grid.flat().slice();return;}
    const [r,c]=C.rowCol(best),b=C.boxIndex(r,c);for(let bits=bestMask;bits&&!solved;bits&=bits-1){const bit=bits&-bits,d=C.digitsFromMask(bit)[0];grid[r][c]=d;rowUsed[r]|=bit;colUsed[c]|=bit;boxUsed[b]|=bit;search();grid[r][c]=0;rowUsed[r]&=~bit;colUsed[c]&=~bit;boxUsed[b]&=~bit;}
  }
  search();return solved;
}

const exact=solveExact(record.puzzle);if(!exact)throw new Error('exact solution not found');
const APE_ENTRY={id:'aligned-pair-exclusion',fn:APE.findAlignedPairExclusion,serverPreferred:true};
const entries=H.FINDERS.concat([APE_ENTRY]).slice().sort((a,b)=>C.TECHNIQUES[a.id].priority-C.TECHNIQUES[b.id].priority||a.id.localeCompare(b.id));
const profile={allowUniqueness:true,allowServerPreferred:true,allowServerOnly:false,finderOptions:{'forcing-chain':{maxSteps:24},'forcing-net':{maxSteps:24},'digit-forcing-chain':{maxSteps:24},'digit-forcing-net':{maxSteps:24}}};
function finderOptions(id){const per=profile.finderOptions[id];return per?Object.assign({},profile,per):profile;}
function eligible(e){if(e.requiresUniqueness&&!profile.allowUniqueness)return false;if(e.serverPreferred&&!profile.allowServerPreferred)return false;if(e.serverOnly&&!profile.allowServerOnly)return false;return true;}
function next(state){let i=0;const es=entries.filter(eligible);while(i<es.length){const p=C.TECHNIQUES[es[i].id].priority,all=[];while(i<es.length&&C.TECHNIQUES[es[i].id].priority===p){all.push(...es[i].fn(state,finderOptions(es[i].id)));i++;}if(all.length){all.sort(C.compareDeductions);return all[0];}}return null;}
function compactProof(d){return {techniqueId:d.techniqueId,eliminations:d.eliminations,placements:d.placements,complexity:d.complexity,explanationData:d.explanationData};}

const state=new H.ClassicHumanState(record.puzzle);let step=0,apeSteps=0;
while(state.valid&&!state.isSolved()&&step<10000){const d=next(state);if(!d)break;step++;if(d.techniqueId==='aligned-pair-exclusion')apeSteps++;
  const badElims=d.eliminations.filter(e=>exact[e.cell]===e.digit);
  const badPlacements=d.placements.filter(e=>exact[e.cell]!==e.digit);
  if(badElims.length||badPlacements.length){
    const x=d.explanationData||{},base=(x.baseCells||[]).map(cell=>({cell,candidates:C.digitsFromMask(state.masks[cell]),solution:exact[cell]}));
    console.log('CLASSIC_H7_APE_SOUNDNESS_REPLAY '+JSON.stringify({id,step,apeSteps,status:'UNSOUND_DEDUCTION',badElims,badPlacements,base,deduction:compactProof(d)}));
    process.exit(0);
  }
  if(!state.apply(d)){
    console.log('CLASSIC_H7_APE_SOUNDNESS_REPLAY '+JSON.stringify({id,step,apeSteps,status:'APPLY_INVALID',deduction:compactProof(d)}));process.exit(0);
  }
}
console.log('CLASSIC_H7_APE_SOUNDNESS_REPLAY '+JSON.stringify({id,step,apeSteps,status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID'}));
