'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
const bank=global.SudokuBank;
const added=bank.slice(21);
function boxDims(n){return n===6?[2,3]:[Math.sqrt(n)|0,Math.sqrt(n)|0];}
function sudokuValid(g){const n=g.length,[bh,bw]=boxDims(n),target=n;for(let r=0;r<n;r++){assert.equal(new Set(g[r]).size,target);assert.equal(new Set(g.map(row=>row[r])).size,target);}for(let br=0;br<n;br+=bh)for(let bc=0;bc<n;bc+=bw){const v=[];for(let r=br;r<br+bh;r++)for(let c=bc;c<bc+bw;c++)v.push(g[r][c]);assert.equal(new Set(v).size,target);}return true;}
function value(g,p){return g[p[0]][p[1]];}
function validate(v){const g=v.solution,d=v.data||{};sudokuValid(g);for(let r=0;r<g.length;r++)for(let c=0;c<g.length;c++)if(v.puzzle[r][c])assert.equal(v.puzzle[r][c],g[r][c],v.id+' given');
 if(v.kind==='palindrome')for(const line of d.lines){const z=line.map(p=>value(g,p));assert.deepEqual(z,z.slice().reverse());}
 if(v.kind==='parityline')for(const line of d.lines){const z=line.map(p=>value(g,p));for(let i=1;i<z.length;i++)assert.notEqual(z[i]%2,z[i-1]%2);}
 if(v.kind==='entropic')for(const line of d.lines){const z=line.map(p=>value(g,p));for(let i=0;i<=z.length-3;i++)assert.equal(new Set(z.slice(i,i+3).map(x=>Math.floor((x-1)/3))).size,3);}
 if(v.kind==='modular')for(const line of d.lines){const z=line.map(p=>value(g,p));for(let i=0;i<=z.length-3;i++)assert.equal(new Set(z.slice(i,i+3).map(x=>x%3)).size,3);}
 if(v.kind==='regionsum')for(const line of d.lines){const groups={};for(const p of line){const k=Math.floor(p[0]/3)+','+Math.floor(p[1]/3);(groups[k]??=[]).push(value(g,p));}const sums=Object.values(groups).map(a=>a.reduce((x,y)=>x+y,0));assert.equal(new Set(sums).size,1);}
 if(v.kind==='quadruple')for(const q of d.quads)assert.deepEqual(q.cells.map(p=>value(g,p)).sort(),q.digits.slice().sort());
 if(v.kind==='clone'){assert.equal(d.clones.length,2);for(let i=0;i<d.clones[0].length;i++)assert.equal(value(g,d.clones[0][i]),value(g,d.clones[1][i]));}
 if(v.kind==='xsums')for(const cl of d.clues){let seq=cl.axis==='row'?g[cl.index].slice():g.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')seq.reverse();const x=seq[0];assert.equal(seq.slice(0,x).reduce((a,b)=>a+b,0),cl.sum);}
 if(v.kind==='rossini')for(const cl of d.clues){let seq=cl.axis==='row'?g[cl.index].slice():g.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')seq.reverse();seq=seq.slice(0,3);assert.ok(cl.dir==='inc'?seq[0]<seq[1]&&seq[1]<seq[2]:seq[0]>seq[1]&&seq[1]>seq[2]);}
 if(v.kind==='fortress'){const marked=new Set(d.cells.map(p=>p.join(',')));for(const p of d.cells){for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const r=p[0]+dr,c=p[1]+dc;if(r>=0&&c>=0&&r<9&&c<9&&!marked.has(r+','+c))assert.ok(value(g,p)>g[r][c]);}}}
 if(v.kind==='slowthermo')for(const line of d.lines){const z=line.map(p=>value(g,p));for(let i=1;i<z.length;i++)assert.ok(z[i]>=z[i-1]&&z[i]-z[i-1]<=1);}
 if(v.kind==='zipper')for(const item of d.lines){const line=item.cells,z=line.map(p=>value(g,p)),m=(z.length-1)/2;for(let i=0;i<m;i++)assert.equal(z[i]+z[z.length-1-i],z[m]);}
 if(v.kind==='extracells'){const z=d.cells.map(p=>value(g,p));assert.equal(new Set(z).size,9);}
 if(v.kind==='disjoint'){for(let pr=0;pr<3;pr++)for(let pc=0;pc<3;pc++){const z=[];for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)z.push(g[br*3+pr][bc*3+pc]);assert.equal(new Set(z).size,9);}}
}
test('iteration 2 expands the Sudoku catalogue from 21 to 36 rule systems',()=>{assert.equal(bank.length,36);assert.equal(added.length,15);assert.equal(new Set(bank.map(v=>v.id)).size,36);});
test('all iteration 2 solutions satisfy their Sudoku and variant constraints',()=>{for(const v of added)validate(v);});
test('iteration 2 adds line, outside-clue, cell-mark, extra-region, and grid mechanics',()=>{const kinds=new Set(added.map(v=>v.kind));for(const k of ['palindrome','entropic','modular','regionsum','quadruple','clone','xsums','rossini','fortress','zipper','extracells','disjoint','mini6'])assert.ok(kinds.has(k),k);});
