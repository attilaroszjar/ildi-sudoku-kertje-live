'use strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const C=require('../games/classic-human/contracts.js');
const Runtime=require('../games/classic-human-runtime-generator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function puzzleString(grid){return grid.flat().join('');}
function loadGenerator(){const p=require.resolve('../games/sudoku-generator.js');delete require.cache[p];delete global.SudokuGenerator;require(p);return global.SudokuGenerator;}
function quantile(xs,q){const a=xs.slice().sort((x,y)=>x-y);if(!a.length)return null;return a[Math.min(a.length-1,Math.floor((a.length-1)*q))];}

const start=Number(process.env.CLASSIC_RUNTIME_FOCUSED_START||75000);
const count=Number(process.env.CLASSIC_RUNTIME_FOCUSED_COUNT||32);
if(!Number.isInteger(start)||start<0)throw new RangeError('CLASSIC_RUNTIME_FOCUSED_START invalid');
if(!Number.isInteger(count)||count<1||count>64)throw new RangeError('CLASSIC_RUNTIME_FOCUSED_COUNT must be 1..64');

const generator=loadGenerator();Runtime.install(generator);
const seen=new Set(),solutions=new Set(),levels={},times=[];
for(let i=0;i<count;i++){
  const seed=start+i,t0=performance.now();
  const out=generator.make(classic(),seed,'focused');
  times.push(performance.now()-t0);
  const key=puzzleString(out.puzzle),solution=puzzleString(out.solution),g=out.generation||{};
  if(g.humanStatus!=='SOLVED_LOGICALLY')throw new Error('seed '+seed+' status '+g.humanStatus);
  if(!Number.isInteger(g.humanLevel)||g.humanLevel<3||g.humanLevel>5)throw new Error('seed '+seed+' level '+g.humanLevel);
  if(g.degraded===true)throw new Error('seed '+seed+' degraded');
  if(seen.has(key))throw new Error('seed '+seed+' duplicate puzzle');
  if(C.countSolutions(key,2)!==1)throw new Error('seed '+seed+' not unique');
  seen.add(key);solutions.add(solution);levels[g.humanLevel]=(levels[g.humanLevel]||0)+1;
}
const minSolutions=Math.ceil(count*.5);
const strongFocused=(levels[4]||0)+(levels[5]||0);
const minStrong=Math.ceil(count*.25);
if(solutions.size<minSolutions)throw new Error('insufficient focused solution diversity '+solutions.size+' < '+minSolutions);
if(strongFocused<minStrong)throw new Error('focused sample too concentrated at level 3: strong '+strongFocused+' < '+minStrong);
console.log('CLASSIC_RUNTIME_FOCUSED_STABILITY '+JSON.stringify({start,count,levels,strongFocused,minStrong,uniquePuzzles:seen.size,uniqueSolutions:solutions.size,minSolutions,runtimeMs:{p50:Math.round(quantile(times,.5)),p95:Math.round(quantile(times,.95)),max:Math.round(Math.max(...times))}}));
