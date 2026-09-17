import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {classifyGridDensity} from './playability-clue-density-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/little-killer-runtime-hardening.js');
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
if(first<0||last<first)throw new Error('Little Killer production script range not found');
const refs=[...bankRefs,...allRefs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref))];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,clearTimeout};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const variant=ctx.SudokuBank.find(v=>v.id==='little-killer');
if(!variant)throw new Error('Little Killer variant missing');
const seed=92001;
const limits={gentle:44,focused:36};
for(const difficulty of ['gentle','focused','expert']){
  const t0=performance.now();
  const out=ctx.SudokuGenerator.make(variant,seed,difficulty);
  const elapsed=performance.now()-t0;
  const metric=classifyGridDensity(out.puzzle,difficulty);
  const play=out.generation&&out.generation.playabilityCarving;
  const search=out.generation&&out.generation.search||{};
  if(limits[difficulty]&&metric.filled>limits[difficulty])throw new Error(`${difficulty} remains too dense: ${metric.filled}/81`);
  if(!(out.generation&&out.generation.unique===true&&out.generation.variantEssential===true))throw new Error(`${difficulty} production contract failed`);
  if(difficulty==='expert'&&(!play||play.policy!=='optimized-tail-mask-local-irreducibility-pass'))throw new Error('expert tail-mask metadata missing');
  if(!(out.generation&&out.generation.verification==='little-killer-tail-mask-proof'))throw new Error(`${difficulty} tail-mask proof missing`);
  console.log(`LITTLE_KILLER_PLAYABILITY difficulty=${difficulty} givens=${metric.filled}/81 density=${metric.density.toFixed(3)} unique=PASS essential=PASS runtimeMs=${elapsed.toFixed(1)} policy=${play&&play.policy||'none'} locallyIrreducible=${play&&play.locallyIrreducible===true?'yes':'no'} budgetHits=${search.postEssentialBudgetHits||0} nodes=${search.nodes||0} forced=${search.forced||0} exactTailChecks=${search.exactTailChecks||0} tailMaskChecks=${search.tailMaskChecks||0}`);
}
console.log('LITTLE_KILLER_PLAYABILITY PASS');
