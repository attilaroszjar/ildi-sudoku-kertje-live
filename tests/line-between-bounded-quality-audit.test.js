'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),performance=require('node:perf_hooks').performance;
const root=path.join(__dirname,'..');
function load(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-whole-set.js','games/line-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='between');assert.ok(v);return v;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*0.95)-1)];}
function solutionKey(grid){return grid.map(r=>r.join('')).join('/');}
function relabel(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function d4Grid(grid,mode){const n=grid.length,out=Array.from({length:n},()=>Array(n));for(let r=0;r<n;r++)for(let c=0;c<n;c++){let rr,cc;switch(mode){case 0:rr=r;cc=c;break;case 1:rr=c;cc=n-1-r;break;case 2:rr=n-1-r;cc=n-1-c;break;case 3:rr=n-1-c;cc=r;break;case 4:rr=r;cc=n-1-c;break;case 5:rr=n-1-r;cc=c;break;case 6:rr=c;cc=r;break;default:rr=n-1-c;cc=n-1-r;}out[rr][cc]=grid[r][c];}return out;}
function structuralSolutionKey(grid){const keys=[];for(let m=0;m<8;m++)keys.push(solutionKey(relabel(d4Grid(grid,m))));return keys.sort()[0];}
function transformCell(cell,mode,n=9){const r=cell[0],c=cell[1];switch(mode){case 0:return[r,c];case 1:return[c,n-1-r];case 2:return[n-1-r,n-1-c];case 3:return[n-1-c,r];case 4:return[r,n-1-c];case 5:return[n-1-r,c];case 6:return[c,r];default:return[n-1-c,n-1-r];}}
function canonicalLine(line){const a=line.map(p=>p.join(',')).join(';'),b=line.slice().reverse().map(p=>p.join(',')).join(';');return a<b?a:b;}
function structuralTopologyKey(lines){const keys=[];for(let m=0;m<8;m++){const normalized=lines.map(line=>canonicalLine(line.map(p=>transformCell(p,m)))).sort().join('|');keys.push(normalized);}return keys.sort()[0];}
function cellsOf(line){return Array.isArray(line)?line:line.cells;}
function assertBetween(ctx,g){for(const wrapped of g.data.lines){const line=cellsOf(wrapped);assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:4,maxLength:7}),true);const first=g.solution[line[0][0]][line[0][1]],last=g.solution[line[line.length-1][0]][line[line.length-1][1]],lo=Math.min(first,last),hi=Math.max(first,last);assert.ok(lo<hi);for(let i=1;i<line.length-1;i++){const v=g.solution[line[i][0]][line[i][1]];assert.ok(v>lo&&v<hi,`Between interior ${v} must be inside (${lo},${hi})`);}}}

const SEEDS=[3,7,11,17,23,29,37,43,53,61,71,83,97,109,127,149,173,197,223,251,281,313,347,383,421,461,503,547,593,641,691,743];
const DIFFICULTIES=['gentle','focused','expert'];

test('Between bounded quality audit 32 seeds x 3 difficulties',()=>{
  const ctx=load(),v=variant(ctx),solutions=new Set(),structuralSolutions=new Set(),topologies=new Set(),structuralTopologies=new Set(),scores={gentle:[],focused:[],expert:[]},times={gentle:[],focused:[],expert:[]};let generated=0;
  for(const seed of SEEDS){
    let seedSolution=null;
    for(const difficulty of DIFFICULTIES){
      const t0=performance.now(),a=ctx.SudokuGenerator.make(v,seed,difficulty),elapsed=performance.now()-t0,b=ctx.SudokuGenerator.make(v,seed,difficulty);
      generated++;
      assert.deepEqual(a.solution,b.solution,`solution replay ${seed} ${difficulty}`);assert.deepEqual(a.puzzle,b.puzzle,`puzzle replay ${seed} ${difficulty}`);assert.deepEqual(a.data.lines,b.data.lines,`topology replay ${seed} ${difficulty}`);
      assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.generatorFamily,'line-between-fresh-fill-mrv');assert.equal(a.generation.pilot,false);
      assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);assertBetween(ctx,a);
      if(seedSolution===null)seedSolution=solutionKey(a.solution);else assert.equal(solutionKey(a.solution),seedSolution,'difficulty must not change completed solution for same seed');
      const lines=a.data.lines.map(cellsOf);solutions.add(solutionKey(a.solution));structuralSolutions.add(structuralSolutionKey(a.solution));topologies.add(ctx.LineGeneratorCore.topologyFingerprint(lines));structuralTopologies.add(structuralTopologyKey(lines));scores[difficulty].push(a.generation.difficultyScore);times[difficulty].push(elapsed);
    }
  }
  const summary={seeds:SEEDS.length,generated,solutionUnique:solutions.size,structuralSolutionUnique:structuralSolutions.size,topologyUnique:topologies.size,structuralTopologyUnique:structuralTopologies.size,difficulty:{gentle:{median:median(scores.gentle),p95Ms:p95(times.gentle)},focused:{median:median(scores.focused),p95Ms:p95(times.focused)},expert:{median:median(scores.expert),p95Ms:p95(times.expert)}}};
  console.log('BETWEEN_GENERATOR_AUDIT '+JSON.stringify(summary));
  assert.equal(generated,96);assert.equal(solutions.size,32,'each seed should have a distinct completed solution');assert.equal(structuralSolutions.size,32,'symbol/D4 normalization must preserve 32 structural solution families');assert.ok(topologies.size>=28,'raw topology diversity should be high');assert.ok(structuralTopologies.size>=24,'D4-normalized topology diversity should remain high');
  assert.ok(summary.difficulty.gentle.median<summary.difficulty.focused.median,`expected Gentle < Focused: ${JSON.stringify(summary.difficulty)}`);assert.ok(summary.difficulty.focused.median<summary.difficulty.expert.median,`expected Focused < Expert: ${JSON.stringify(summary.difficulty)}`);
  assert.ok(summary.difficulty.gentle.p95Ms<1000&&summary.difficulty.focused.p95Ms<1000&&summary.difficulty.expert.p95Ms<1000,`runtime p95 unexpectedly high: ${JSON.stringify(summary.difficulty)}`);
});
