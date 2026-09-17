'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-generator.js');
const bank=global.SudokuBank, gen=global.SudokuGenerator, added=bank.slice(36);
const at=(g,p)=>g[p[0]][p[1]];
function normal(g){const n=g.length,bh=n===6?2:Math.sqrt(n)|0,bw=n===6?3:Math.sqrt(n)|0;for(let r=0;r<n;r++){assert.equal(new Set(g[r]).size,n);assert.equal(new Set(g.map(row=>row[r])).size,n);}for(let br=0;br<n;br+=bh)for(let bc=0;bc<n;bc+=bw){const z=[];for(let r=br;r<br+bh;r++)for(let c=bc;c<bc+bw;c++)z.push(g[r][c]);assert.equal(new Set(z).size,n);}}
function validateKind(v,kind){const g=v.solution,d=v.data||{};normal(g);
 if(kind==='killer')for(const cage of d.cages){const z=cage.cells.map(p=>at(g,p));assert.equal(new Set(z).size,z.length);assert.equal(z.reduce((a,b)=>a+b,0),cage.sum);}
 if(kind==='thermo')for(const line of d.thermos)for(let i=1;i<line.length;i++)assert.ok(at(g,line[i])>at(g,line[i-1]));
 if(kind==='arrow')for(const a of d.arrows)assert.equal(a.path.reduce((s,p)=>s+at(g,p),0),at(g,a.circle));
 if(kind==='palindrome')for(const line of d.lines){const z=line.map(p=>at(g,p));assert.deepEqual(z,z.slice().reverse());}
 if(kind==='zipper')for(const item of d.lines){const z=item.cells.map(p=>at(g,p)),m=(z.length-1)/2;for(let i=0;i<m;i++)assert.equal(z[i]+z[z.length-1-i],z[m]);}
 if(kind==='entropic')for(const line of d.lines){const z=line.map(p=>at(g,p));for(let i=0;i<=z.length-3;i++)assert.equal(new Set(z.slice(i,i+3).map(x=>Math.floor((x-1)/3))).size,3);}
 if(kind==='modular')for(const line of d.lines){const z=line.map(p=>at(g,p));for(let i=0;i<=z.length-3;i++)assert.equal(new Set(z.slice(i,i+3).map(x=>x%3)).size,3);}
 if(kind==='renban')for(const line of d.lines){const z=line.map(p=>at(g,p));assert.equal(new Set(z).size,z.length);assert.equal(Math.max(...z)-Math.min(...z),z.length-1);}
 if(kind==='dutchwhispers')for(const line of d.lines)for(let i=1;i<line.length;i++)assert.ok(Math.abs(at(g,line[i])-at(g,line[i-1]))>=4);
 if(kind==='nabner')for(const line of d.lines){const z=line.map(p=>at(g,p));for(let i=0;i<z.length;i++)for(let j=i+1;j<z.length;j++)assert.ok(Math.abs(z[i]-z[j])>=2);}
 if(kind==='lockout')for(const item of d.lines){const z=item.cells.map(p=>at(g,p)),lo=Math.min(z[0],z.at(-1)),hi=Math.max(z[0],z.at(-1));assert.notEqual(z[0],z.at(-1));for(const x of z.slice(1,-1))assert.ok(x<lo||x>hi);}
 if(kind==='frame')for(const cl of d.clues){let z=cl.axis==='row'?g[cl.index].slice():g.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')z.reverse();assert.equal(z.slice(0,3).reduce((a,b)=>a+b,0),cl.sum);}
}
test('iteration 3 expands the Sudoku catalogue from 36 to 49 rule systems',()=>{assert.equal(bank.length,49);assert.equal(added.length,13);assert.equal(new Set(bank.map(v=>v.id)).size,49);});
test('iteration 3 standalone and combination solutions satisfy every added rule',()=>{for(const v of added){const kinds=v.kinds||[v.kind];for(const kind of kinds)validateKind(v,kind);}});
test('seeded generator gives every Sudoku variant a fresh unique clue layout under its full rule set',()=>{for(let i=0;i<bank.length;i++){const v=bank[i],out=gen.make(v,0xABC000+i,'focused');assert.equal(out.generation.unique,true,v.id);if(out.generation.mode==='seeded-variant-essential'){assert.equal(gen.countVariantSolutions(out.puzzle,out,2),1,v.id);assert.ok(gen.countSolutions(out.puzzle,2)>1,v.id+' should genuinely require its variant rule');}else assert.equal(gen.countSolutions(out.puzzle,2),1,v.id);for(let r=0;r<out.puzzle.length;r++)for(let c=0;c<out.puzzle.length;c++)if(out.puzzle[r][c])assert.equal(out.puzzle[r][c],out.solution[r][c],v.id);}});
test('new-puzzle seeds produce a practically endless stream rather than four rotations',()=>{const classic=bank.find(v=>v.id==='classic'),seen=new Set();for(let seed=1;seed<=64;seed++){const out=gen.make(classic,seed,'focused');seen.add(out.puzzle.flat().join(''));assert.equal(out.generation.clues,32);assert.equal(out.generation.unique,true);}assert.ok(seen.size>=60,'expected strong clue-layout diversity');});
test('Sudoku difficulty changes generated clue density',()=>{const classic=bank.find(v=>v.id==='classic');const a=gen.make(classic,77,'gentle'),b=gen.make(classic,77,'focused'),c=gen.make(classic,77,'expert');assert.ok(a.generation.clues>b.generation.clues);assert.ok(b.generation.clues>c.generation.clues);assert.equal(a.generation.clues,40);assert.equal(b.generation.clues,32);assert.equal(c.generation.clues,27);});
