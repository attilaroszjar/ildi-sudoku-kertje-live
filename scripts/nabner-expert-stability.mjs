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
const variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!variant)throw new Error('Nabner runtime not loaded');
const start=Number(process.env.NABNER_EXPERT_START||92001);
const count=Number(process.env.NABNER_EXPERT_COUNT||4);
if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(count)||count<1||count>12)throw new RangeError('invalid Nabner stability range');

function countClues(grid){return grid.flat().filter(Boolean).length;}
function pct(values,p){const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];}

const rows=[];let pass=true;
for(let i=0;i<count;i++){
  const seed=start+i,t0=performance.now();
  const a=G.make(variant,seed,'expert');
  const runtimeMs=performance.now()-t0;
  const givens=countClues(a.puzzle);
  const unique=G.countVariantSolutions(a.puzzle,a,2)===1;
  const essential=G.countSolutions(a.puzzle,2)>1;
  const t1=performance.now();
  const b=G.make(variant,seed,'expert');
  const deterministic=JSON.stringify(a)===JSON.stringify(b);
  const repeatMs=performance.now()-t1;
  const local=a.generation?.locallyIrreducibleUnderProductionContract===true&&a.generation?.localIrreducibilityProof==='monotone-nonuniqueness-from-single-pass';
  const metadata=a.generation?.policy==='contract-driven-local-irreducibility'&&a.generation?.verification==='nabner-naked-single-pressure-mrv-exact-v2';
  const row={seed,givens,density:+(givens/81).toFixed(3),runtimeMs:+runtimeMs.toFixed(1),repeatMs:+repeatMs.toFixed(1),unique,essential,deterministic,local,metadata,lineCount:a.generation?.lineCount??null,acceptedRemovals:a.generation?.acceptedRemovals??null,rejectedRemovals:a.generation?.rejectedRemovals??null};
  rows.push(row);
  if(!(unique&&essential&&deterministic&&local&&metadata))pass=false;
}
const runtimes=rows.map(r=>r.runtimeMs),givens=rows.map(r=>r.givens);
console.log('NABNER_EXPERT_STABILITY '+JSON.stringify({start,count,givens:{min:Math.min(...givens),p50:pct(givens,0.5),max:Math.max(...givens)},runtimeMs:{min:+Math.min(...runtimes).toFixed(1),p50:+pct(runtimes,0.5).toFixed(1),max:+Math.max(...runtimes).toFixed(1)},rows}));
console.log('NABNER_EXPERT_STABILITY_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
