import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='nabner');if(!v)throw new Error('missing nabner');
const diffs=['gentle','focused','expert'],seeds=Array.from({length:64},(_,i)=>31000+i);
const sols=new Set(),structs=new Set(),tops=new Set(),puzzles=new Set();let valid=0,unique=0,essential=0,det=0,fail=0;const rows={};
function norm(g){const m=new Map();let n=1;return g.flat().map(x=>{if(!m.has(x))m.set(x,n++);return m.get(x)}).join(',')}
function top(g){return JSON.stringify(g.data.lines)}
function lineOK(g){return g.data.lines.length>=2&&g.data.lines.every(line=>{const vals=line.map(([r,c])=>g.solution[r][c]);return new Set(vals).size===vals.length&&vals.every((x,i)=>vals.every((y,j)=>i===j||Math.abs(x-y)!==1));});}
function pct(a,p){a=a.slice().sort((x,y)=>x-y);return a[Math.ceil(a.length*p)-1]}
for(const d of diffs){const times=[],clues=[];for(const seed of seeds){try{const t=performance.now(),g=G.make(v,seed,d);times.push(performance.now()-t);const r=G.make(v,seed,d);if(JSON.stringify(g)===JSON.stringify(r))det++;else fail++;if(lineOK(g))valid++;else fail++;if(G.countVariantSolutions(g.puzzle,g,2)===1)unique++;else fail++;if(G.countSolutions(g.puzzle,2)>1&&g.generation?.variantEssential===true)essential++;else fail++;sols.add(JSON.stringify(g.solution));structs.add(norm(g.solution));tops.add(top(g));puzzles.add(JSON.stringify(g.puzzle));clues.push(g.puzzle.flat().filter(Boolean).length);}catch(e){fail++;}}rows[d]={samples:times.length,clueMin:Math.min(...clues),clueMax:Math.max(...clues),runtimeP50Ms:+pct(times,.5).toFixed(1),runtimeP95Ms:+pct(times,.95).toFixed(1),runtimeMaxMs:+Math.max(...times).toFixed(1)};}
const total=diffs.length*seeds.length,result={samples:total,solutionUnique:sols.size,structuralSolutionUnique:structs.size,topologyUnique:tops.size,puzzleUnique:puzzles.size,valid,exactUnique:unique,variantEssential:essential,deterministic:det,failures:fail,difficulties:rows};
const correctness=valid===total&&unique===total&&essential===total&&det===total&&fail===0,diversity=sols.size>=60&&structs.size>=50&&tops.size>=150&&puzzles.size>=180,runtime=diffs.every(d=>rows[d].samples===seeds.length&&rows[d].runtimeP95Ms<500&&rows[d].runtimeMaxMs<1000),ordering=rows.gentle.clueMin>rows.focused.clueMax&&rows.focused.clueMin>rows.expert.clueMax;
console.log('NABNER_PRODUCTION_AUDIT '+JSON.stringify(result));console.log('NABNER_PRODUCTION_CORRECTNESS:'+(correctness?'PASS':'FAIL'));console.log('NABNER_PRODUCTION_DIVERSITY:'+(diversity?'PASS':'FAIL'));console.log('NABNER_PRODUCTION_RUNTIME:'+(runtime?'PASS':'FAIL'));console.log('NABNER_PRODUCTION_DIFFICULTY_ORDERING:'+(ordering?'PASS':'FAIL'));console.log('NABNER_PRODUCTION_GATE:'+(correctness&&diversity&&runtime&&ordering?'PASS':'FAIL'));if(!(correctness&&diversity&&runtime&&ordering))process.exitCode=1;
