'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),performance=require('node:perf_hooks').performance;
const root=path.join(__dirname,'..');
function load(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const f of ['games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-whole-set.js','games/line-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='zipper');assert.ok(v);return v;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*0.95)-1)];}
function solutionKey(grid){return grid.map(r=>r.join('')).join('/');}
function relabel(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function d4Grid(grid,mode){const n=grid.length,out=Array.from({length:n},()=>Array(n));for(let r=0;r<n;r++)for(let c=0;c<n;c++){let rr,cc;switch(mode){case 0:rr=r;cc=c;break;case 1:rr=c;cc=n-1-r;break;case 2:rr=n-1-r;cc=n-1-c;break;case 3:rr=n-1-c;cc=r;break;case 4:rr=r;cc=n-1-c;break;case 5:rr=n-1-r;cc=c;break;case 6:rr=c;cc=r;break;default:rr=n-1-c;cc=n-1-r;}out[rr][cc]=grid[r][c];}return out;}
function structuralSolutionKey(grid){const keys=[];for(let m=0;m<8;m++)keys.push(solutionKey(relabel(d4Grid(grid,m))));return keys.sort()[0];}
function transformCell(cell,mode,n=9){const r=cell[0],c=cell[1];switch(mode){case 0:return[r,c];case 1:return[c,n-1-r];case 2:return[n-1-r,n-1-c];case 3:return[n-1-c,r];case 4:return[r,n-1-c];case 5:return[n-1-r,c];case 6:return[c,r];default:return[n-1-c,n-1-r];}}
function canonicalLine(line){const a=line.map(p=>p.join(',')).join(';'),b=line.slice().reverse().map(p=>p.join(',')).join(';');return a<b?a:b;}
function structuralTopologyKey(lines){const keys=[];for(let m=0;m<8;m++){const normalized=lines.map(line=>canonicalLine(line.map(p=>transformCell(p,m)))).sort().join('|');keys.push(normalized);}return keys.sort()[0];}
function rawLines(g){return g.data.lines.map(x=>Array.isArray(x)?x:x.cells);}
function assertZipper(ctx,g){for(const entry of g.data.lines){const line=Array.isArray(entry)?entry:entry.cells;assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:3,maxLength:7}),true);assert.equal(line.length%2,1);const mid=(line.length-1)/2,target=g.solution[line[mid][0]][line[mid][1]];for(let i=1;i<=mid;i++){const a=line[mid-i],b=line[mid+i];assert.equal(g.solution[a[0]][a[1]]+g.solution[b[0]][b[1]],target);}}}
const SEEDS=[3,7,11,17,23,29,37,43,53,61,71,83,97,109,127,149,173,197,223,251,281,313,347,383,421,461,503,547,593,641,691,743];
const DIFFICULTIES=['gentle','focused','expert'];

test('Zipper bounded quality audit 32 seeds x 3 difficulties',()=>{
  const ctx=load(),v=variant(ctx),solutions=new Set(),structuralSolutions=new Set(),topologies=new Set(),structuralTopologies=new Set(),scores={gentle:[],focused:[],expert:[]},times={gentle:[],focused:[],expert:[]};let generated=0;
  for(const seed of SEEDS){
    let seedSolution=null;
    for(const difficulty of DIFFICULTIES){
      const t0=performance.now(),a=ctx.SudokuGenerator.make(v,seed,difficulty),elapsed=performance.now()-t0,b=ctx.SudokuGenerator.make(v,seed,difficulty);generated++;
      assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);
      assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.generatorFamily,'line-zipper-fresh-fill-mrv');assert.equal(a.generation.pilot,false);
      assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);assertZipper(ctx,a);
      if(seedSolution===null)seedSolution=solutionKey(a.solution);else assert.equal(solutionKey(a.solution),seedSolution);
      solutions.add(solutionKey(a.solution));structuralSolutions.add(structuralSolutionKey(a.solution));const lines=rawLines(a);topologies.add(ctx.LineGeneratorCore.topologyFingerprint(lines));structuralTopologies.add(structuralTopologyKey(lines));scores[difficulty].push(a.generation.difficultyScore);times[difficulty].push(elapsed);
    }
  }
  const summary={seeds:SEEDS.length,generated,solutionUnique:solutions.size,structuralSolutionUnique:structuralSolutions.size,topologyUnique:topologies.size,structuralTopologyUnique:structuralTopologies.size,difficulty:{gentle:{median:median(scores.gentle),p95Ms:p95(times.gentle)},focused:{median:median(scores.focused),p95Ms:p95(times.focused)},expert:{median:median(scores.expert),p95Ms:p95(times.expert)}}};
  console.log('ZIPPER_GENERATOR_AUDIT '+JSON.stringify(summary));
  assert.equal(generated,96);assert.equal(solutions.size,32);assert.equal(structuralSolutions.size,32);assert.ok(topologies.size>=28);assert.ok(structuralTopologies.size>=24);
  assert.ok(summary.difficulty.gentle.median<summary.difficulty.focused.median);assert.ok(summary.difficulty.focused.median<summary.difficulty.expert.median);
  assert.ok(summary.difficulty.gentle.p95Ms<1000&&summary.difficulty.focused.p95Ms<1000&&summary.difficulty.expert.p95Ms<1000);
});
