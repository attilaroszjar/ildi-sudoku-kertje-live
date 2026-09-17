import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/iteration4-generator-hardening.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='asterisk');if(!v)throw new Error('missing asterisk variant');

const diffs=['gentle','focused','expert'];
const seeds=Array.from({length:32},(_,i)=>41000+i);
const sols=new Set(),structs=new Set(),tops=new Set(),puzzles=new Set();
let valid=0,unique=0,essential=0,det=0,failures=0;const rows={};
function normalize(g){const m=new Map();let n=1;return g.flat().map(x=>{if(!m.has(x))m.set(x,n++);return m.get(x)}).join(',');}
function topology(g){return JSON.stringify((g.data?.cells||[]).map(p=>p.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]));}
function asteriskValid(g){const cells=g.data?.cells||[];if(cells.length!==9)return false;const vals=cells.map(([r,c])=>g.solution[r][c]);return new Set(vals).size===9&&vals.every(x=>Number.isInteger(x)&&x>=1&&x<=9);}
function pct(a,p){const s=a.slice().sort((x,y)=>x-y);return s[Math.ceil(s.length*p)-1];}
function round(x){return Math.round(x*10)/10;}
for(const d of diffs){const times=[],clues=[];for(const seed of seeds){try{const t=performance.now(),g=G.make(v,seed,d);times.push(performance.now()-t);const replay=G.make(v,seed,d);if(JSON.stringify(g)===JSON.stringify(replay))det++;else failures++;if(asteriskValid(g))valid++;else failures++;if(G.countVariantSolutions(g.puzzle,g,2)===1)unique++;else failures++;if(G.countSolutions(g.puzzle,2)>1&&g.generation?.variantEssential===true)essential++;else failures++;sols.add(JSON.stringify(g.solution));structs.add(normalize(g.solution));tops.add(topology(g));puzzles.add(JSON.stringify(g.puzzle));clues.push(g.puzzle.flat().filter(Boolean).length);}catch(e){failures++;}}
 rows[d]={samples:times.length,clueMin:Math.min(...clues),clueMax:Math.max(...clues),runtimeP50Ms:round(pct(times,.5)),runtimeP95Ms:round(pct(times,.95)),runtimeMaxMs:round(Math.max(...times))};}
const total=diffs.length*seeds.length;
const result={samples:total,solutionUnique:sols.size,structuralSolutionUnique:structs.size,topologyUnique:tops.size,puzzleUnique:puzzles.size,valid,exactUnique:unique,variantEssential:essential,deterministic:det,failures,difficulties:rows};
const correctness=valid===total&&unique===total&&essential===total&&det===total&&failures===0;
const diversity=sols.size>=30&&structs.size>=24&&tops.size>=24&&puzzles.size>=90;
const runtime=diffs.every(d=>rows[d].samples===seeds.length&&rows[d].runtimeP95Ms<500&&rows[d].runtimeMaxMs<1000);
const ordering=rows.gentle.clueMin>rows.focused.clueMax&&rows.focused.clueMin>rows.expert.clueMax;
console.log('ASTERISK_GENERATOR_BASELINE '+JSON.stringify(result));
console.log('ASTERISK_GENERATOR_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('ASTERISK_GENERATOR_DIVERSITY:'+(diversity?'PASS':'FAIL'));
console.log('ASTERISK_GENERATOR_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('ASTERISK_GENERATOR_DIFFICULTY_ORDERING:'+(ordering?'PASS':'FAIL'));
console.log('ASTERISK_GENERATOR_BASELINE_GATE:'+(correctness&&diversity&&runtime&&ordering?'PASS':'FAIL'));
if(!(correctness&&diversity&&runtime&&ordering))process.exitCode=1;
