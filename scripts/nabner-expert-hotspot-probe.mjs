import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const siblings=ctx.LineGeneratorProvenSiblings;
const variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner runtime not loaded');
const seed=Number(process.env.NABNER_HOTSPOT_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_HOTSPOT_SEED invalid');

function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}
function rng(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
baseline.generation.pilot=false;
baseline.generation.mode='seeded-variant-essential';
baseline.generation.verification='nabner-pressure-mrv-reference-last-exact';
const puzzle=clone(baseline.puzzle);
const baseGivens=countClues(puzzle);
if(baseGivens!==30)throw new Error(`expected 30-given baseline, got ${baseGivens}`);

const order=[];
for(let i=0;i<81;i++)if(puzzle[Math.floor(i/9)][i%9])order.push(i);
shuffle(order,rng((seed^0x4E414243)>>>0));

const attempts=[];
let accepted=0,rejected=0,totalMs=0,maxMs=0;
for(const index of order){
  const r=Math.floor(index/9),c=index%9,old=puzzle[r][c];
  puzzle[r][c]=0;
  const stats={};
  const t0=performance.now();
  const solutions=G.countVariantSolutions(puzzle,baseline,2,stats);
  const elapsed=performance.now()-t0;
  totalMs+=elapsed;maxMs=Math.max(maxMs,elapsed);
  const keep=solutions===1;
  if(keep)accepted++;else{rejected++;puzzle[r][c]=old;}
  attempts.push({index,cell:`r${r+1}c${c+1}`,accepted:keep,solutions,givensAfter:countClues(puzzle),runtimeMs:+elapsed.toFixed(1),nodes:stats.nodes??null,branches:stats.branches??null,deadEnds:stats.deadEnds??null});
}

const finalGivens=countClues(puzzle);
const unique=G.countVariantSolutions(puzzle,baseline,2)===1;
const essential=G.countSolutions(puzzle,2)>1;
const hottest=attempts.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,10);
const deepest=attempts.slice().sort((a,b)=>(b.nodes??0)-(a.nodes??0)).slice(0,10);
const expensiveRejected=attempts.filter(x=>!x.accepted).sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,10);
console.log('NABNER_EXPERT_HOTSPOT '+JSON.stringify({seed,solverProfile:baseline.generation.verification,baseGivens,acceptedRemovals:accepted,rejectedRemovals:rejected,finalGivens,unique,essential,totalMs:+totalMs.toFixed(1),maxMs:+maxMs.toFixed(1),hottest,deepest,expensiveRejected}));
const pass=unique&&essential&&accepted+rejected===baseGivens;
console.log('NABNER_EXPERT_HOTSPOT_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
