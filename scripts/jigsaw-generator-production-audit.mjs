import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const banks=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of banks)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
for(const ref of ['games/sudoku-generator.js','games/extra-house-generator-core.js','games/iteration4-generator-hardening.js','games/jigsaw-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='jigsaw');if(!variant)throw new Error('missing jigsaw variant');
const seeds=Array.from({length:96},(_,i)=>24000+i),difficulties=['gentle','focused','expert'];
function normalize(grid){const m=new Map();let n=1;return grid.map(row=>row.map(v=>{if(!m.has(v))m.set(v,n++);return m.get(v);}));}
function rotate(g){return Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>g[8-c][r]));}
function reflect(g){return g.map(r=>r.slice().reverse());}
function canon(g,norm){const a=[];let x=g.map(r=>r.slice());for(let i=0;i<4;i++){for(const y of [x,reflect(x)])a.push((norm?normalize(y):y).flat().join(','));x=rotate(x);}return a.sort()[0];}
function topology(g){return canon(g,true);}
function connected(regions,id){const cells=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(regions[r][c]===id)cells.push([r,c]);if(cells.length!==9)return false;const seen=new Set(),stack=[cells[0]];while(stack.length){const [r,c]=stack.pop(),k=r*9+c;if(seen.has(k))continue;seen.add(k);for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(rr>=0&&rr<9&&cc>=0&&cc<9&&regions[rr][cc]===id&&!seen.has(rr*9+cc))stack.push([rr,cc]);}return seen.size===9;}
function valid(g){const regs=g.data.regions,ids=[...new Set(regs.flat())];if(ids.length!==9||ids.some(id=>!connected(regs,id)))return false;for(const id of ids){const vals=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(regs[r][c]===id)vals.push(g.solution[r][c]);if(new Set(vals).size!==9)return false;}return true;}
function pct(xs,p){const a=xs.slice().sort((a,b)=>a-b);return a[Math.ceil(a.length*p)-1];}
function round(x){return Math.round(x*10)/10;}
const sols=new Set(),structs=new Set(),tops=new Set(),puzzles=new Set();let good=0,unique=0,essential=0,det=0,failures=0;const rows={};
for(const d of difficulties){const times=[],clues=[];for(const seed of seeds){const t=performance.now();let g;try{g=G.make(variant,seed,d);}catch(e){failures++;continue;}times.push(performance.now()-t);const replay=G.make(variant,seed,d);if(JSON.stringify(g)===JSON.stringify(replay))det++;else failures++;if(valid(g))good++;else failures++;if(G.countJigsawSolutions(g.puzzle,g.data.regions,2)===1)unique++;else failures++;if(G.countSolutions(g.puzzle,2)>1&&g.generation?.variantEssential===true)essential++;else failures++;sols.add(JSON.stringify(g.solution));structs.add(canon(g.solution,true));tops.add(topology(g.data.regions));puzzles.add(JSON.stringify(g.puzzle));clues.push(g.puzzle.flat().filter(Boolean).length);}rows[d]={samples:times.length,clueMin:Math.min(...clues),clueMax:Math.max(...clues),runtimeP50Ms:round(pct(times,.5)),runtimeP95Ms:round(pct(times,.95)),runtimeMaxMs:round(Math.max(...times))};}
const total=seeds.length*difficulties.length,result={samples:total,solutionUnique:sols.size,structuralSolutionUnique:structs.size,topologyUnique:tops.size,puzzleUnique:puzzles.size,valid:good,exactUnique:unique,variantEssential:essential,deterministic:det,failures,difficulties:rows};
const correctness=good===total&&unique===total&&essential===total&&det===total&&failures===0;
const diversity=sols.size>=90&&structs.size>=80&&tops.size>=80&&puzzles.size>=270;
const runtime=difficulties.every(d=>rows[d].samples===seeds.length&&rows[d].runtimeP95Ms<500&&rows[d].runtimeMaxMs<1000);
const ordering=rows.gentle.clueMin>rows.focused.clueMax&&rows.focused.clueMin>rows.expert.clueMax;
console.log('JIGSAW_PRODUCTION_AUDIT '+JSON.stringify(result));
console.log('JIGSAW_PRODUCTION_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('JIGSAW_PRODUCTION_DIVERSITY:'+(diversity?'PASS':'FAIL'));
console.log('JIGSAW_PRODUCTION_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('JIGSAW_PRODUCTION_DIFFICULTY_ORDERING:'+(ordering?'PASS':'FAIL'));
console.log('JIGSAW_PRODUCTION_GATE:'+(correctness&&diversity&&runtime&&ordering?'PASS':'FAIL'));
if(!(correctness&&diversity&&runtime&&ordering))process.exitCode=1;
