import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scriptRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=scriptRefs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const generator=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const core=fs.readFileSync(path.join(root,'games/extra-house-generator-core.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'games/iteration4-generator-hardening.js'),'utf8');
const candidate=fs.readFileSync(path.join(root,'games/jigsaw-generator-hardening.js'),'utf8');
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of bankRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
vm.runInContext(generator,ctx,{filename:'sudoku-generator.js'});
vm.runInContext(core,ctx,{filename:'extra-house-generator-core.js'});
vm.runInContext(hardening,ctx,{filename:'iteration4-generator-hardening.js'});
vm.runInContext(candidate,ctx,{filename:'jigsaw-generator-hardening.js'});

const G=ctx.SudokuGenerator;
const variant=ctx.SudokuBank.find(v=>v.id==='jigsaw');
if(!variant)throw new Error('missing jigsaw variant after loading '+bankRefs.length+' Sudoku bank files');
const seeds=Array.from({length:32},(_,i)=>12000+i);
const difficulties=['gentle','focused','expert'];

function normalizeSymbols(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function canonicalGrid(grid,normalize){const forms=[];let g=grid.map(row=>row.slice());for(let i=0;i<4;i++){for(const x of [g,reflect(g)])forms.push((normalize?normalizeSymbols(x):x).flat().join(','));g=rotate(g);}forms.sort();return forms[0];}
function canonicalRegions(regions){return canonicalGrid(regions,true);}
function validRegions(regions){if(!Array.isArray(regions)||regions.length!==9||regions.some(r=>!Array.isArray(r)||r.length!==9))return false;const counts=new Map();for(const row of regions)for(const id of row)counts.set(id,(counts.get(id)||0)+1);return counts.size===9&&[...counts.values()].every(n=>n===9);}
function connectedRegion(regions,id){const cells=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(regions[r][c]===id)cells.push([r,c]);if(cells.length!==9)return false;const wanted=new Set(cells.map(([r,c])=>r*9+c));const seen=new Set(),stack=[cells[0]];while(stack.length){const [r,c]=stack.pop(),key=r*9+c;if(seen.has(key))continue;seen.add(key);for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<9&&cc>=0&&cc<9&&wanted.has(rr*9+cc)&&!seen.has(rr*9+cc))stack.push([rr,cc]);}}return seen.size===9;}
function solutionFitsRegions(solution,regions){if(!validRegions(regions))return false;for(let r=0;r<9;r++){if(new Set(solution[r]).size!==9)return false;const col=solution.map(row=>row[r]);if(new Set(col).size!==9)return false;}const groups=new Map();for(let r=0;r<9;r++)for(let c=0;c<9;c++){const id=regions[r][c];if(!groups.has(id))groups.set(id,[]);groups.get(id).push(solution[r][c]);}return [...groups.entries()].every(([id,vals])=>connectedRegion(regions,id)&&new Set(vals).size===9);}
function percentile(xs,p){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.max(0,Math.ceil(a.length*p)-1))];}
function round(x){return Math.round(x*10)/10;}

const solutions=new Set(),structures=new Set(),topologies=new Set(),allPuzzles=new Set();
const difficultyRows={};let exactUnique=0,essential=0,deterministic=0,valid=0;const failures=[];
for(const difficulty of difficulties){const puzzles=new Set(),times=[];for(const seed of seeds){const t0=performance.now();const g=G.make(variant,seed,difficulty);times.push(performance.now()-t0);const again=G.make(variant,seed,difficulty);if(JSON.stringify(g)===JSON.stringify(again))deterministic++;else failures.push(`${difficulty}:${seed}:determinism`);puzzles.add(JSON.stringify(g.puzzle));allPuzzles.add(JSON.stringify(g.puzzle));solutions.add(JSON.stringify(g.solution));structures.add(canonicalGrid(g.solution,true));topologies.add(canonicalRegions(g.data.regions));if(solutionFitsRegions(g.solution,g.data.regions))valid++;else failures.push(`${difficulty}:${seed}:invalid-regions`);if(G.countJigsawSolutions(g.puzzle,g.data.regions,2)===1)exactUnique++;else failures.push(`${difficulty}:${seed}:variant-unique`);if(G.countSolutions(g.puzzle,2)>1&&g.generation?.variantEssential===true)essential++;else failures.push(`${difficulty}:${seed}:variant-essential`);}difficultyRows[difficulty]={puzzleUnique:puzzles.size,runtimeP50Ms:round(percentile(times,.5)),runtimeP95Ms:round(percentile(times,.95)),runtimeMaxMs:round(Math.max(...times))};}
const total=seeds.length*difficulties.length;
const result={samples:total,solutionUnique:solutions.size,structuralSolutionUnique:structures.size,topologyUnique:topologies.size,puzzleUnique:allPuzzles.size,valid,exactUnique,variantEssential:essential,deterministic,difficulties:difficultyRows,failures:failures.length};
console.log('JIGSAW_GENERATOR_BASELINE '+JSON.stringify(result));
const correctness=result.valid===total&&result.exactUnique===total&&result.variantEssential===total&&result.deterministic===total;
const diversity=result.solutionUnique>=30&&result.structuralSolutionUnique>=24&&result.topologyUnique>=24&&result.puzzleUnique>=90;
const runtime=difficulties.every(d=>difficultyRows[d].runtimeP95Ms<1000);
console.log('JIGSAW_GENERATOR_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('JIGSAW_GENERATOR_DIVERSITY:'+(diversity?'PASS':'FAIL'));
console.log('JIGSAW_GENERATOR_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('JIGSAW_GENERATOR_BASELINE:'+(correctness&&diversity&&runtime?'PASS':'NEEDS_HARDENING'));
if(!correctness)process.exitCode=1;
