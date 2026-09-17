import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['skyscraper','double-skyscrapers','toroidal-skyscrapers','odd-even'];
const seeds=[0x72a10001,0x72a11f3e,0x72a13e7b,0x72a15db8];

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const all=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  return all.filter(x=>{
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
function clone(x){return JSON.parse(JSON.stringify(x));}
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function givens(grid){return grid.flat().filter(x=>Number.isFinite(x)&&x!==0).length;}
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

const ctx=loadRuntime(),G=ctx.SudokuGenerator;
function exactCount(id,puzzle,candidate){
  if(id==='double-skyscrapers')return G.countDoubleSkyscraperSolutions(puzzle,candidate,2,false);
  if(id==='toroidal-skyscrapers')return countToroidal(puzzle,candidate,2,false);
  return G.countVariantSolutions(puzzle,candidate,2);
}
function baselineCount(id,puzzle,candidate){
  if(id==='double-skyscrapers')return G.countDoubleSkyscraperSolutions(puzzle,candidate,2,true);
  if(id==='toroidal-skyscrapers')return countToroidal(puzzle,candidate,2,true);
  return G.countSolutions(puzzle,2);
}
function carveGivens(id,generated,target,seed){
  const out=clone(generated),n=out.puzzle.length,order=[];for(let i=0;i<n*n;i++)if(out.puzzle[Math.floor(i/n)][i%n])order.push(i);shuffle(order,rng(seed^0xC411B4A7));
  for(const idx of order){if(givens(out.puzzle)<=target)break;const r=Math.floor(idx/n),c=idx%n,old=out.puzzle[r][c];out.puzzle[r][c]=0;if(exactCount(id,out.puzzle,out)!==1)out.puzzle[r][c]=old;}
  return out;
}
function carveOutside(id,generated,target,seed){
  const out=clone(generated),key=id==='skyscraper'?'clues':'clues',list=out.data?.[key];if(!Array.isArray(list))return out;
  const order=shuffle(Array.from({length:list.length},(_,i)=>i),rng(seed^0x0C1751DE));
  const removed=new Set();
  for(const idx of order){if(list.length-removed.size<=target)break;removed.add(idx);const candidate=list.filter((_,i)=>!removed.has(i));out.data[key]=candidate;if(exactCount(id,out.puzzle,out)!==1){removed.delete(idx);out.data[key]=list.filter((_,i)=>!removed.has(i));}}
  return out;
}

const targetSets={
  'skyscraper':[{type:'outside',value:30},{type:'outside',value:24},{type:'outside',value:20},{type:'givens',value:24},{type:'givens',value:21}],
  'double-skyscrapers':[{type:'outside',value:20},{type:'outside',value:16},{type:'outside',value:12}],
  'toroidal-skyscrapers':[{type:'givens',value:16},{type:'givens',value:14},{type:'givens',value:12},{type:'givens',value:10}],
  'odd-even':[{type:'givens',value:24},{type:'givens',value:21},{type:'givens',value:18},{type:'givens',value:16}]
};

console.log('===== ILDI P2 CANDIDATE SWEEP =====');
let failures=0;
for(const id of ids){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  for(const t of targetSets[id]){
    const rows=[];
    for(const seed of seeds){
      try{
        const base=G.make(variant,seed,'expert');
        const cand=t.type==='outside'?carveOutside(id,base,t.value,seed):carveGivens(id,base,t.value,seed);
        const exact=exactCount(id,cand.puzzle,cand),baseline=baselineCount(id,cand.puzzle,cand),special=Array.isArray(cand.data?.clues)?cand.data.clues.length:(Array.isArray(cand.data?.toroidalClues)?cand.data.toroidalClues.length:Object.keys(cand.data||{}).filter(k=>/^\d+,\d+$/.test(k)).length);
        rows.push({seed,exact,baseline,givens:givens(cand.puzzle),special,ok:exact===1&&baseline>1});
      }catch(error){rows.push({seed,ok:false,error:String(error&&error.message||error)});}
    }
    const ok=rows.filter(r=>r.ok).length;if(ok!==seeds.length)failures++;
    const gs=rows.filter(r=>r.ok).map(r=>r.givens),ss=rows.filter(r=>r.ok).map(r=>r.special);
    console.log(`P2_SWEEP ${id} ${t.type}=${t.value} ok=${ok}/${seeds.length} givens=${gs.length?Math.min(...gs)+'-'+Math.max(...gs):'null'} special=${ss.length?Math.min(...ss)+'-'+Math.max(...ss):'null'}`);
  }
}
console.log('ILDI_P2_CANDIDATE_SWEEP:'+(failures?'PARTIAL':'PASS'));
