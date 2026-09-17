'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),performance=require('node:perf_hooks').performance;
const root=path.join(__dirname,'..');
function load(){
  const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  const files=['games/sudoku-bank.js'];
  for(let i=2;i<=23;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  for(let i=30;i<=38;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  for(let i=50;i<=52;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  files.push('games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js');
  for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:f});}
  return ctx;
}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*0.95)-1)];}
function solutionKey(grid){return grid.map(r=>r.join('')).join('/');}
function relabel(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function d4Grid(grid,mode){const n=grid.length,out=Array.from({length:n},()=>Array(n));for(let r=0;r<n;r++)for(let c=0;c<n;c++){let rr,cc;switch(mode){case 0:rr=r;cc=c;break;case 1:rr=c;cc=n-1-r;break;case 2:rr=n-1-r;cc=n-1-c;break;case 3:rr=n-1-c;cc=r;break;case 4:rr=r;cc=n-1-c;break;case 5:rr=n-1-r;cc=c;break;case 6:rr=c;cc=r;break;default:rr=n-1-c;cc=n-1-r;}out[rr][cc]=grid[r][c];}return out;}
function structuralSolutionKey(grid){const keys=[];for(let m=0;m<8;m++)keys.push(solutionKey(relabel(d4Grid(grid,m))));return keys.sort()[0];}
function transformCell(cell,mode,n=9){const r=cell[0],c=cell[1];switch(mode){case 0:return[r,c];case 1:return[c,n-1-r];case 2:return[n-1-r,n-1-c];case 3:return[n-1-c,r];case 4:return[r,n-1-c];case 5:return[n-1-r,c];case 6:return[c,r];default:return[n-1-c,n-1-r];}}
function canonicalLine(line){const a=line.map(p=>p.join(',')).join(';'),b=line.slice().reverse().map(p=>p.join(',')).join(';');return a<b?a:b;}
function structuralTopologyKey(lines){const keys=[];for(let m=0;m<8;m++){const normalized=lines.map(line=>canonicalLine(line.map(p=>transformCell(p,m)))).sort().join('|');keys.push(normalized);}return keys.sort()[0];}
function rawLine(entry){return Array.isArray(entry)?entry:entry.cells;}
function rawLines(g){return g.data.lines.map(rawLine);}
function assertSemantics(ctx,g,id){for(const entry of g.data.lines){const line=rawLine(entry);assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:3,maxLength:7}),true);const values=line.map(([r,c])=>g.solution[r][c]);if(id==='nabner'){for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)assert.ok(Math.abs(values[i]-values[j])>1);}else if(id==='palindrome'){for(let i=0;i<Math.floor(values.length/2);i++)assert.equal(values[i],values[values.length-1-i]);}else{const lo=Math.min(values[0],values[values.length-1]),hi=Math.max(values[0],values[values.length-1]);assert.notEqual(values[0],values[values.length-1]);for(let i=1;i<values.length-1;i++)assert.ok(values[i]<lo||values[i]>hi);}}}
const SEEDS=[3,7,11,17,23,29,37,43,53,61,71,83,97,109,127,149,173,197,223,251,281,313,347,383,421,461,503,547,593,641,691,743];
const DIFFICULTIES=['gentle','focused','expert'];
const SPECS=[
  {id:'nabner',family:'line-nabner-fresh-fill-mrv',label:'NABNER_GENERATOR_AUDIT'},
  {id:'palindrome',family:'line-palindrome-fresh-fill-mrv',label:'PALINDROME_GENERATOR_AUDIT'},
  {id:'lockout',family:'line-lockout-fresh-fill-mrv',label:'LOCKOUT_GENERATOR_AUDIT'}
];
for(const spec of SPECS)test(spec.id+' bounded quality audit 32 seeds x 3 difficulties',()=>{
  const ctx=load(),v=ctx.SudokuBank.find(x=>x.id===spec.id);assert.ok(v,'missing '+spec.id+' bank entry');const solutions=new Set(),structuralSolutions=new Set(),topologies=new Set(),structuralTopologies=new Set(),scores={gentle:[],focused:[],expert:[]},times={gentle:[],focused:[],expert:[]};let generated=0;
  for(const seed of SEEDS){for(const difficulty of DIFFICULTIES){const t0=performance.now(),a=ctx.SudokuGenerator.make(v,seed,difficulty),elapsed=performance.now()-t0,b=ctx.SudokuGenerator.make(v,seed,difficulty);generated++;
    assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);assert.equal(a.generation.generatorFamily,spec.family);assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.pilot,false);assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);assertSemantics(ctx,a,spec.id);
    solutions.add(solutionKey(a.solution));structuralSolutions.add(structuralSolutionKey(a.solution));const lines=rawLines(a);topologies.add(ctx.LineGeneratorCore.topologyFingerprint(lines));structuralTopologies.add(structuralTopologyKey(lines));scores[difficulty].push(a.generation.difficultyScore);times[difficulty].push(elapsed);
  }}
  const summary={seeds:SEEDS.length,generated,solutionUnique:solutions.size,structuralSolutionUnique:structuralSolutions.size,topologyUnique:topologies.size,structuralTopologyUnique:structuralTopologies.size,difficulty:{gentle:{median:median(scores.gentle),p95Ms:p95(times.gentle)},focused:{median:median(scores.focused),p95Ms:p95(times.focused)},expert:{median:median(scores.expert),p95Ms:p95(times.expert)}}};
  console.log(spec.label+' '+JSON.stringify(summary));
  assert.equal(generated,96);assert.ok(solutions.size>=32);assert.ok(structuralSolutions.size>=32);assert.ok(topologies.size>=28);assert.ok(structuralTopologies.size>=24);assert.ok(summary.difficulty.gentle.median<summary.difficulty.focused.median);assert.ok(summary.difficulty.focused.median<summary.difficulty.expert.median);assert.ok(summary.difficulty.gentle.p95Ms<1000&&summary.difficulty.focused.p95Ms<1000&&summary.difficulty.expert.p95Ms<1000);
});
