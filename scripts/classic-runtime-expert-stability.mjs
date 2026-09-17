'use strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const C=require('../games/classic-human/contracts.js');
const Runtime=require('../games/classic-human-runtime-generator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function puzzleString(grid){return grid.flat().join('');}
function clueCount(text){let n=0;for(const ch of text)if(ch!=='0')n++;return n;}
function loadGenerator(){const p=require.resolve('../games/sudoku-generator.js');delete require.cache[p];delete global.SudokuGenerator;require(p);return global.SudokuGenerator;}
function quantile(xs,q){const a=xs.slice().sort((x,y)=>x-y);if(!a.length)return null;return a[Math.min(a.length-1,Math.floor((a.length-1)*q))];}

const start=Number(process.env.CLASSIC_RUNTIME_EXPERT_START||74000);
const count=Number(process.env.CLASSIC_RUNTIME_EXPERT_COUNT||16);
if(!Number.isInteger(start)||start<0)throw new RangeError('CLASSIC_RUNTIME_EXPERT_START invalid');
if(!Number.isInteger(count)||count<1||count>64)throw new RangeError('CLASSIC_RUNTIME_EXPERT_COUNT must be 1..64');

const generator=loadGenerator();Runtime.install(generator);
const seen=new Set(),solutions=new Set(),levels={},times=[],clues=[],localAttempts=[],localAccepted=[],rawEntryCounts=[],rawEntryClues=[],entryCounts=[],entryClues=[],multistartEvaluations=[],cacheHits=[],brutalPrunes=[],rows=[];
for(let i=0;i<count;i++){
  const seed=start+i,t0=performance.now();
  const out=generator.make(classic(),seed,'expert');
  const elapsed=performance.now()-t0;
  times.push(elapsed);
  const key=puzzleString(out.puzzle),solution=puzzleString(out.solution),g=out.generation||{},givenCount=clueCount(key);
  if(g.humanStatus!=='SOLVED_LOGICALLY')throw new Error('seed '+seed+' status '+g.humanStatus);
  if(!Number.isInteger(g.humanLevel)||g.humanLevel<6||g.humanLevel>8)throw new Error('seed '+seed+' level '+g.humanLevel);
  if(g.degraded===true)throw new Error('seed '+seed+' degraded');
  if(g.runtimeProfile!=='classic-human-runtime-expert-sparse-entry-v6')throw new Error('seed '+seed+' runtimeProfile '+g.runtimeProfile);
  if(g.locallyIrreducibleUnderProductionContract!==true)throw new Error('seed '+seed+' not locally irreducible');
  if(g.clues!==givenCount)throw new Error('seed '+seed+' clue metadata mismatch '+g.clues+' != '+givenCount);
  if(givenCount>28)throw new Error('seed '+seed+' remains density-warning dense with '+givenCount+' givens');
  if(!Number.isInteger(g.rawEntryCandidateCount)||g.rawEntryCandidateCount<1||g.rawEntryCandidateCount>8)throw new Error('seed '+seed+' rawEntryCandidateCount '+g.rawEntryCandidateCount);
  if(!Array.isArray(g.rawEntryCandidateClues)||g.rawEntryCandidateClues.length!==g.rawEntryCandidateCount)throw new Error('seed '+seed+' rawEntryCandidateClues mismatch');
  if(!Number.isInteger(g.entryCandidateCount)||g.entryCandidateCount<1||g.entryCandidateCount>4)throw new Error('seed '+seed+' entryCandidateCount '+g.entryCandidateCount);
  if(!Array.isArray(g.entryCandidateClues)||g.entryCandidateClues.length!==g.entryCandidateCount)throw new Error('seed '+seed+' entryCandidateClues mismatch');
  if(seen.has(key))throw new Error('seed '+seed+' duplicate puzzle');
  if(C.countSolutions(key,2)!==1)throw new Error('seed '+seed+' not unique');
  seen.add(key);solutions.add(solution);levels[g.humanLevel]=(levels[g.humanLevel]||0)+1;
  clues.push(givenCount);localAttempts.push(g.localRemovalAttempts||0);localAccepted.push(g.localAcceptedRemovals||0);
  rawEntryCounts.push(g.rawEntryCandidateCount);rawEntryClues.push(...g.rawEntryCandidateClues);entryCounts.push(g.entryCandidateCount);entryClues.push(...g.entryCandidateClues);multistartEvaluations.push(g.multistartEvaluations||0);cacheHits.push(g.evaluationCacheHits||0);brutalPrunes.push(g.brutalPrunes||0);
  rows.push({seed,givens:givenCount,level:g.humanLevel,score:g.humanScore??null,rawEntryCandidateCount:g.rawEntryCandidateCount,rawEntryCandidateClues:g.rawEntryCandidateClues,entryCandidateCount:g.entryCandidateCount,entryCandidateClues:g.entryCandidateClues,chosenEntryClues:g.chosenEntryClues??null,localRemovalAttempts:g.localRemovalAttempts||0,localAcceptedRemovals:g.localAcceptedRemovals||0,multistartEvaluations:g.multistartEvaluations||0,evaluationCacheHits:g.evaluationCacheHits||0,brutalPrunes:g.brutalPrunes||0,runtimeMs:Math.round(elapsed)});
}
const minSolutions=Math.max(1,Math.ceil(count*.5));
if(solutions.size<minSolutions)throw new Error('insufficient expert solution-family diversity '+solutions.size+' < '+minSolutions);
for(const row of rows)console.log('CLASSIC_RUNTIME_EXPERT_SEED '+JSON.stringify(row));
console.log('CLASSIC_RUNTIME_EXPERT_STABILITY '+JSON.stringify({
  start,count,levels,uniquePuzzles:seen.size,uniqueSolutions:solutions.size,minSolutions,
  givens:{min:Math.min(...clues),p50:quantile(clues,.5),max:Math.max(...clues)},
  localRemovalAttempts:{p50:quantile(localAttempts,.5),max:Math.max(...localAttempts)},
  localAcceptedRemovals:{p50:quantile(localAccepted,.5),max:Math.max(...localAccepted)},
  rawEntryCandidateCount:{p50:quantile(rawEntryCounts,.5),max:Math.max(...rawEntryCounts)},
  rawEntryCandidateClues:{min:Math.min(...rawEntryClues),p50:quantile(rawEntryClues,.5),max:Math.max(...rawEntryClues)},
  entryCandidateCount:{p50:quantile(entryCounts,.5),max:Math.max(...entryCounts)},
  entryCandidateClues:{min:Math.min(...entryClues),p50:quantile(entryClues,.5),max:Math.max(...entryClues)},
  multistartEvaluations:{p50:quantile(multistartEvaluations,.5),max:Math.max(...multistartEvaluations)},
  evaluationCacheHits:{p50:quantile(cacheHits,.5),max:Math.max(...cacheHits)},
  brutalPrunes:{p50:quantile(brutalPrunes,.5),max:Math.max(...brutalPrunes),total:brutalPrunes.reduce((a,b)=>a+b,0)},
  runtimeMs:{p50:Math.round(quantile(times,.5)),p95:Math.round(quantile(times,.95)),max:Math.round(Math.max(...times))}
}));
console.log('CLASSIC_RUNTIME_EXPERT_STABILITY PASS');
