'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
let files=['games/sudoku-bank.js'];for(let i=2;i<=23;i++)files.push(`games/sudoku-bank-iteration${i}.js`);for(let i=30;i<=38;i++)files.push(`games/sudoku-bank-iteration${i}.js`);files.push('games/sudoku-bank-iteration50.js','games/sudoku-generator.js');files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));
const v=ctx.SudokuBank.find(x=>x.id==='star-battle');
const seeds=Array.from({length:24},(_,i)=>1000+i*7919);

function regionCells(regions,id){const out=[];for(let r=0;r<regions.length;r++)for(let c=0;c<regions.length;c++)if(regions[r][c]===id)out.push([r,c]);return out;}
function connected(cells){if(!cells.length)return false;const keys=new Set(cells.map(q=>q.join(','))),seen=new Set([cells[0].join(',')]),queue=[cells[0]];while(queue.length){const [r,c]=queue.shift();for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(r+dr)+','+(c+dc);if(keys.has(k)&&!seen.has(k)){seen.add(k);queue.push([r+dr,c+dc]);}}}return seen.size===cells.length;}
function validate(g){
  const n=g.puzzle.size,regions=g.puzzle.regions,solution=g.solution,ids=[...new Set(regions.flat())].sort((a,b)=>a-b),stats={};
  assert.equal(regions.length,n);for(const row of regions)assert.equal(row.length,n);
  assert.deepEqual(ids,Array.from({length:n},(_,i)=>i),'regions must use exactly n canonical ids');
  assert.equal(ctx.SudokuGenerator.countStarBattleSolutions(g.puzzle,2,stats),1,'puzzle must be solver-unique');
  assert.equal(g.generation.unique,true);assert.equal(g.generation.verification,'solver-verified');
  assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0,'difficultyScore must be measured solver complexity');
  for(let r=0;r<n;r++)assert.equal(solution[r].reduce((a,b)=>a+b,0),1,'one star per row');
  for(let c=0;c<n;c++)assert.equal(solution.reduce((a,row)=>a+row[c],0),1,'one star per column');
  for(const id of ids){const cells=regionCells(regions,id);assert.ok(connected(cells),'every region must be orthogonally connected');assert.equal(cells.reduce((a,[r,c])=>a+solution[r][c],0),1,'one solution star per region');}
  const stars=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(solution[r][c])stars.push([r,c]);for(let i=0;i<stars.length;i++)for(let j=i+1;j<stars.length;j++)assert.ok(Math.max(Math.abs(stars[i][0]-stars[j][0]),Math.abs(stars[i][1]-stars[j][1]))>1,'stars must not touch, even diagonally');
  return stats.nodes;
}
function sample(difficulty){const signatures=new Set(),nodes=[];for(const seed of seeds){const a=ctx.SudokuGenerator.make(v,seed,difficulty),b=ctx.SudokuGenerator.make(v,seed,difficulty);assert.deepEqual(a,b,'same Star Battle seed must be deterministic');nodes.push(validate(a));signatures.add(JSON.stringify({puzzle:a.puzzle,solution:a.solution}));}nodes.sort((a,b)=>a-b);return {distinct:signatures.size,median:nodes[Math.floor(nodes.length/2)]};}

test('Star Battle sampled puzzles satisfy the full puzzle contract',()=>{for(const d of ['gentle','focused','expert'])sample(d);});
test('Star Battle seed sample stays highly diverse',()=>{for(const d of ['gentle','focused','expert'])assert.ok(sample(d).distinct>=22,d+' should produce at least 22 distinct puzzles from 24 sampled seeds');});
test('Star Battle difficulty has meaningful measured search separation',()=>{const gentle=sample('gentle'),focused=sample('focused'),expert=sample('expert');assert.ok(focused.median>=gentle.median*1.35,'focused median search cost should materially exceed gentle');assert.ok(expert.median>=focused.median*1.35,'expert median search cost should materially exceed focused');});
