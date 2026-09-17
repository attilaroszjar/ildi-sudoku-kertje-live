import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||x==='games/sudoku-generator.js'||x==='games/iteration4-generator-hardening.js');
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const variant=ctx.SudokuBank.find(v=>v.id==='magic-square'),G=ctx.SudokuGenerator;
if(!variant||!G||typeof G.countIteration4SpecialSolutions!=='function')throw new Error('Magic Square baseline dependencies missing');
const difficulties=['gentle','focused','expert'],perDifficulty=32,rows=[];
function hashGrid(g){return g.map(r=>r.join('')).join('/');}
function normalizedSolution(g){const map=new Map();let next=1;return g.map(r=>r.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}).join('')).join('/');}
function topology(v){return JSON.stringify((v.data?.cells||[]).map(p=>p.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]));}
function validMagic(g,v){
  if(!Array.isArray(g)||g.length!==9||g.some(r=>!Array.isArray(r)||r.length!==9))return false;
  for(let r=0;r<9;r++)if(new Set(g[r]).size!==9)return false;
  for(let c=0;c<9;c++)if(new Set(g.map(r=>r[c])).size!==9)return false;
  for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++){const a=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)a.push(g[br*3+r][bc*3+c]);if(new Set(a).size!==9)return false;}
  const cells=v.data?.cells||[];if(cells.length!==9)return false;
  const rs=[3,4,5],cs=[3,4,5],lines=[];for(const r of rs)lines.push(cs.map(c=>[r,c]));for(const c of cs)lines.push(rs.map(r=>[r,c]));lines.push([[3,3],[4,4],[5,5]],[[3,5],[4,4],[5,3]]);
  return lines.every(line=>line.reduce((s,[r,c])=>s+g[r][c],0)===15);
}
for(const d of difficulties)for(let seed=1;seed<=perDifficulty;seed++){
  const t0=performance.now(),g=G.make(variant,seed,d),ms=performance.now()-t0,replay=G.make(variant,seed,d);
  const valid=validMagic(g.solution,g),exact=G.countIteration4SpecialSolutions(g.puzzle,g,2,{})===1,essential=G.countSolutions(g.puzzle,2)>1&&g.generation?.variantEssential===true,deterministic=JSON.stringify(g)===JSON.stringify(replay),clues=g.puzzle.flat().filter(Boolean).length;
  rows.push({d,seed,ms,g,valid,exact,essential,deterministic,clues});
}
const sols=new Set(rows.map(x=>hashGrid(x.g.solution))),structs=new Set(rows.map(x=>normalizedSolution(x.g.solution))),tops=new Set(rows.map(x=>topology(x.g))),puzzles=new Set(rows.map(x=>hashGrid(x.g.puzzle)));
const failures=rows.filter(x=>!x.valid||!x.exact||!x.essential||!x.deterministic);
const ds={};for(const d of difficulties){const a=rows.filter(x=>x.d===d),times=a.map(x=>x.ms).sort((a,b)=>a-b),clues=a.map(x=>x.clues);ds[d]={samples:a.length,clueMin:Math.min(...clues),clueMax:Math.max(...clues),runtimeP50Ms:+times[Math.floor(times.length*.50)].toFixed(1),runtimeP95Ms:+times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(1),runtimeMaxMs:+times.at(-1).toFixed(1)};}
const summary={samples:rows.length,solutionUnique:sols.size,structuralSolutionUnique:structs.size,topologyUnique:tops.size,puzzleUnique:puzzles.size,valid:rows.filter(x=>x.valid).length,exactUnique:rows.filter(x=>x.exact).length,variantEssential:rows.filter(x=>x.essential).length,deterministic:rows.filter(x=>x.deterministic).length,failures:failures.length,difficulties:ds};
const correctness=failures.length===0,diversity=sols.size>=30&&structs.size>=24&&tops.size>=24&&puzzles.size>=90,runtime=difficulties.every(d=>ds[d].runtimeP95Ms<500&&ds[d].runtimeMaxMs<1000),ordering=ds.gentle.clueMin>ds.focused.clueMax&&ds.focused.clueMin>ds.expert.clueMax;
console.log('MAGIC_SQUARE_GENERATOR_BASELINE '+JSON.stringify(summary));
console.log('MAGIC_SQUARE_GENERATOR_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('MAGIC_SQUARE_GENERATOR_DIVERSITY:'+(diversity?'PASS':'FAIL'));
console.log('MAGIC_SQUARE_GENERATOR_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('MAGIC_SQUARE_GENERATOR_DIFFICULTY_ORDERING:'+(ordering?'PASS':'FAIL'));
console.log('MAGIC_SQUARE_GENERATOR_BASELINE_GATE:'+(correctness&&diversity&&runtime&&ordering?'PASS':'FAIL'));
process.exitCode=correctness&&diversity&&runtime&&ordering?0:1;
