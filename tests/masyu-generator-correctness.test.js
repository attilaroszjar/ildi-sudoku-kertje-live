'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const ctx={console,Map,Set,Math,JSON,Array,Object,Number,String,Boolean,Date,Uint8Array};
ctx.globalThis=ctx;
vm.createContext(ctx);

for(const f of fs.readdirSync(path.join(root,'games'))
  .filter(x=>/^sudoku-bank(?:-iteration\d+)?\.js$/.test(x))
  .sort((a,b)=>{const n=x=>+(x.match(/iteration(\d+)/)||[,0])[1];return n(a)-n(b);})
  .concat(['sudoku-generator.js'])){
  vm.runInContext(fs.readFileSync(path.join(root,'games',f),'utf8'),ctx,{filename:f});
}

const M=ctx.SudokuBank.find(x=>x.id==='masyu');
const count=(p,l=2)=>ctx.SudokuGenerator.countMasyuSolutions(p,l);

function edgesFor(n){
  const out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(c+1<n)out.push({a:[r,c],b:[r,c+1]});
    if(r+1<n)out.push({a:[r,c],b:[r+1,c]});
  }
  return out;
}

function key(p){return p[0]+','+p[1];}

function independentSolutionCheck(g){
  const n=g.puzzle.length,edges=edgesFor(n),vals=g.solution;
  assert.equal(vals.length,edges.length,'solution edge vector length');

  const adj=new Map();
  function add(a,b){
    const ak=key(a),bk=key(b);
    if(!adj.has(ak))adj.set(ak,[]);
    if(!adj.has(bk))adj.set(bk,[]);
    adj.get(ak).push(bk);
    adj.get(bk).push(ak);
  }
  edges.forEach((e,i)=>{if(vals[i]===1)add(e.a,e.b);});
  assert.ok(adj.size>0,'loop must contain edges');
  for(const ns of adj.values())assert.equal(ns.length,2,'every used cell has degree 2');

  const start=adj.keys().next().value,seen=new Set([start]),stack=[start];
  while(stack.length){
    const x=stack.pop();
    for(const y of adj.get(x)||[])if(!seen.has(y)){seen.add(y);stack.push(y);}
  }
  assert.equal(seen.size,adj.size,'solution is one connected loop');

  function cellType(r,c){
    const ns=adj.get(r+','+c)||[];
    if(ns.length!==2)return null;
    const pts=ns.map(s=>s.split(',').map(Number));
    if(pts[0][0]===pts[1][0])return 'h';
    if(pts[0][1]===pts[1][1])return 'v';
    return 'turn';
  }
  function inb(r,c){return r>=0&&c>=0&&r<n&&c<n;}

  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const clue=g.puzzle[r][c];
    if(!clue)continue;
    const t=cellType(r,c);
    assert.ok(t,'every clue lies on the loop');
    if(clue==='w'){
      assert.ok(t==='h'||t==='v','white circle is traversed straight');
      let a=null,b=null;
      if(t==='h'){
        a=c>0?cellType(r,c-1):null;
        b=c+1<n?cellType(r,c+1):null;
      }else{
        a=r>0?cellType(r-1,c):null;
        b=r+1<n?cellType(r+1,c):null;
      }
      assert.ok(a==='turn'||b==='turn','white circle has an adjacent turn');
    }else if(clue==='b'){
      assert.equal(t,'turn','black circle turns');
      const ns=adj.get(r+','+c).map(s=>s.split(',').map(Number));
      for(const p of ns){
        const dr=p[0]-r,dc=p[1]-c;
        assert.ok(inb(p[0],p[1]));
        assert.equal(cellType(p[0],p[1]),dr===0?'h':'v','black circle continues straight after the turn');
      }
    }else{
      assert.fail('unknown Masyu clue '+clue);
    }
  }
}

test('Masyu generated solutions satisfy the rules independently and are unique',()=>{
  assert.ok(M,'Masyu must exist in catalogue');
  for(const difficulty of ['gentle','focused','expert']){
    for(const seed of [1,3,7,17,41]){
      const g=ctx.SudokuGenerator.make(M,seed,difficulty);
      assert.equal(g.generation.unique,true,difficulty+' seed '+seed);
      assert.equal(g.generation.verification,difficulty==='expert'?'solver-verified-local-irreducible':'solver-verified',difficulty+' seed '+seed);
      assert.equal(g.generation.variantEssential,true,difficulty+' seed '+seed);
      assert.equal(count(g.puzzle,2),1,difficulty+' seed '+seed);
      independentSolutionCheck(g);
    }
  }
});

test('Masyu focused corpus is deterministic and structurally diverse',()=>{
  const puzzleSig=new Set(),solutionSig=new Set();
  for(let seed=1;seed<=12;seed++){
    const a=ctx.SudokuGenerator.make(M,seed,'focused');
    const b=ctx.SudokuGenerator.make(M,seed,'focused');
    assert.deepEqual(a,b,'same seed must replay exactly: '+seed);
    independentSolutionCheck(a);
    puzzleSig.add(JSON.stringify(a.puzzle));
    solutionSig.add(JSON.stringify(a.solution));
  }
  assert.ok(puzzleSig.size>=8,'expected broad puzzle diversity');
  assert.ok(solutionSig.size>=6,'expected broad loop diversity');
});
