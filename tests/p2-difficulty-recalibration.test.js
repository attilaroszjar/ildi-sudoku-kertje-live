'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ids=['skyscraper','double-skyscrapers','toroidal-skyscrapers','odd-even'];
const seeds=[0x72a10001,0x72a11f3e,0x72a13e7b,0x72a15db8];

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  return [...index.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m=>m[1])
    .filter(x=>{
      if(/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x))return true;
      if(x==='games/sudoku-generator.js')return true;
      if(/^games\/(?:extra-house-generator-core|line-generator-core|killer-generator|line-generator-[^/]+)\.js$/.test(x))return true;
      if(/^games\/iteration\d+-generator-hardening\.js$/.test(x))return true;
      if(/^games\/[^/]+(?:generator|runtime)-hardening\.js$/.test(x))return true;
      return false;
    });
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of runtimeRefs())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  return ctx;
}

function givens(grid){return grid.flat().filter(x=>Number.isFinite(x)&&x!==0).length;}
function specialCount(id,out){
  if(id==='skyscraper'||id==='double-skyscrapers')return out.data.clues.length;
  if(id==='toroidal-skyscrapers')return out.data.toroidalClues.length;
  return Object.keys(out.data||{}).filter(k=>/^\d+,\d+$/.test(k)).length;
}

const ctx=loadRuntime();
const G=ctx.SudokuGenerator;

function skyVisible(line){let max=0,count=0;for(const x of line)if(x>max){max=x;count++;}return count;}
function toroidalValid(variant,grid,r,c,ignoreSpecial){
  if(ignoreSpecial)return true;
  for(const cl of variant.data?.toroidalClues||[]){
    if(!cl.cells.some(p=>p[0]===r&&p[1]===c))continue;
    const line=cl.cells.map(p=>grid[p[0]][p[1]]);
    if(line.every(Boolean)&&skyVisible(line)!==cl.count)return false;
  }
  return true;
}
function countToroidal(source,variant,limit,ignoreSpecial){
  const grid=source.map(r=>r.slice()),n=grid.length,d=variant.data||{},clueValue=d.clueValue||n,maxDigit=d.maxDigit||n-1,full=(1<<maxDigit)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),clueMap={};
  for(const cl of d.toroidalClues||[]){clueMap[cl.cell[0]+','+cl.cell[1]]=1;grid[cl.cell[0]][cl.cell[1]]=clueValue;}
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(clueMap[r+','+c])continue;const value=grid[r][c];if(!value)continue;if(value<1||value>maxDigit)return 0;
    const bit=1<<(value-1);if((rows[r]|cols[c])&bit)return 0;rows[r]|=bit;cols[c]|=bit;if(!toroidalValid(variant,grid,r,c,ignoreSpecial))return 0;
  }
  let found=0;
  function visit(){
    if(found>=limit)return;let br=-1,bc=-1,best=[],bestCount=maxDigit+1;
    for(let rr=0;rr<n;rr++)for(let cc=0;cc<n;cc++)if(!clueMap[rr+','+cc]&&!grid[rr][cc]){
      let mask=full&~(rows[rr]|cols[cc]),allowed=[];
      for(let bits=mask;bits;bits&=bits-1){const one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(toroidalValid(variant,grid,rr,cc,ignoreSpecial))allowed.push(digit);grid[rr][cc]=0;}
      if(allowed.length<bestCount){br=rr;bc=cc;best=allowed;bestCount=allowed.length;if(bestCount<=1)break;}
    }
    if(br<0){for(let i=0;i<n;i++)if(rows[i]!==full||cols[i]!==full)return;found++;return;}
    if(!best.length)return;
    for(const digit of best){const one=1<<(digit-1);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(found>=limit)return;}
  }
  visit();return found;
}
function exactCount(id,out){
  if(id==='double-skyscrapers')return G.countDoubleSkyscraperSolutions(out.puzzle,out,2,false);
  if(id==='toroidal-skyscrapers')return countToroidal(out.puzzle,out,2,false);
  return G.countVariantSolutions(out.puzzle,out,2);
}
function baselineCount(id,out){
  if(id==='double-skyscrapers')return G.countDoubleSkyscraperSolutions(out.puzzle,out,2,true);
  if(id==='toroidal-skyscrapers')return countToroidal(out.puzzle,out,2,true);
  return G.countSolutions(out.puzzle,2);
}

test('P2 expert recalibration uses the selected strongest seed-stable calibration',()=>{
  const expected={
    skyscraper:{type:'outside',target:20,maxActual:20},
    'double-skyscrapers':{type:'outside',target:12,maxActual:12},
    'toroidal-skyscrapers':{type:'givens',target:10,maxActual:10},
    'odd-even':{type:'givens',target:16,maxActual:19}
  };
  for(const id of ids){
    const variant=ctx.SudokuBank.find(v=>v.id===id);
    assert.ok(variant,id+' missing');
    for(const seed of seeds){
      const out=G.make(variant,seed,'expert');
      assert.equal(out.generation?.p2Recalibrated,true,id+' recalibration marker');
      assert.equal(out.generation?.p2Calibration?.strategy,expected[id].type,id+' strategy');
      assert.equal(out.generation?.p2Calibration?.target,expected[id].target,id+' target');
      const actual=expected[id].type==='givens'?givens(out.puzzle):specialCount(id,out);
      assert.ok(actual<=expected[id].maxActual,`${id} actual=${actual}`);
      assert.equal(exactCount(id,out),1,id+' exact uniqueness');
      assert.ok(baselineCount(id,out)>1,id+' variant essentiality');
    }
  }
});

test('P2 recalibration does not alter gentle or focused generation policy',()=>{
  for(const id of ids){
    const variant=ctx.SudokuBank.find(v=>v.id===id);
    for(const difficulty of ['gentle','focused']){
      const out=G.make(variant,seeds[0],difficulty);
      assert.notEqual(out.generation?.p2Recalibrated,true,`${id}/${difficulty}`);
    }
  }
});
