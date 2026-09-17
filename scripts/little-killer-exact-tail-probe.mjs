import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/little-killer-runtime-hardening.js');
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
if(first<0||last<first)throw new Error('Little Killer production script range not found');
const refs=[...bankRefs,...allRefs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref))];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,clearTimeout};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const variant=ctx.SudokuBank.find(v=>v.id==='little-killer');
if(!variant)throw new Error('Little Killer variant missing');
const generated=ctx.SudokuGenerator.make(variant,92001,'expert');
const solution=generated.solution,clues=generated.data.clues,n=9,full=(1<<9)-1;
const bitCount=Array(512).fill(0),digitForBit=Array(512).fill(0),lowDigit=Array(512).fill(0),highDigit=Array(512).fill(0);
for(let m=0;m<512;m++){let x=m,c=0,lo=0,hi=0;while(x){x&=x-1;c++;}for(let d=1;d<=9;d++)if(m&(1<<(d-1))){if(!lo)lo=d;hi=d;}bitCount[m]=c;lowDigit[m]=lo;highDigit[m]=hi;}
for(let d=1;d<=9;d++)digitForBit[1<<(d-1)]=d;
const pairSumBits=new Uint32Array(512*512);
for(let ma=1;ma<512;ma++){
  for(let mb=1;mb<512;mb++){
    let sums=0;
    for(let a=ma;a;a&=a-1){const da=digitForBit[a&-a];for(let b=mb;b;b&=b-1){const db=digitForBit[b&-b];sums|=1<<(da+db);}}
    pairSumBits[(ma<<9)|mb]=sums;
  }
}
const cellClues=Array.from({length:81},()=>[]),cellRows=Array(81),cellCols=Array(81);
for(let i=0;i<81;i++){cellRows[i]=Math.floor(i/9);cellCols[i]=i%9;}
const compiled=clues.map((cl,ci)=>({sum:cl.sum,cells:cl.cells.map(([r,c])=>{const idx=r*9+c;cellClues[idx].push(ci);return idx;})}));

function findAlternative(source,nodeBudget){
  const grid=source.map(r=>r.slice()),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),clueSums=Array(compiled.length).fill(0),clueEmpty=compiled.map(cl=>cl.cells.length);
  let nodes=0,found=false,exhausted=false,forced=0,exactTailChecks=0;
  const box=(r,c)=>Math.floor(r/3)*3+Math.floor(c/3);
  const baseMask=(r,c)=>full&~(rows[r]|cols[c]|boxes[box(r,c)]);
  function applyClues(idx,d,delta){for(const ci of cellClues[idx]){clueSums[ci]+=delta*d;clueEmpty[ci]-=delta;}}
  function clueFeasible(ci){
    const cl=compiled[ci],sum=clueSums[ci],empty=clueEmpty[ci],need=cl.sum-sum;
    if(need<0)return false;if(!empty)return need===0;
    if(empty===1){
      exactTailChecks++;
      for(const idx of cl.cells){const r=cellRows[idx],c=cellCols[idx];if(grid[r][c])continue;return need>=1&&need<=9&&!!(baseMask(r,c)&(1<<(need-1)));}
      return false;
    }
    if(empty===2){
      exactTailChecks++;
      let a=-1,b=-1;
      for(const idx of cl.cells)if(!grid[cellRows[idx]][cellCols[idx]]){if(a<0)a=idx;else{b=idx;break;}}
      if(a<0||b<0||need<2||need>18)return false;
      const ma=baseMask(cellRows[a],cellCols[a]),mb=baseMask(cellRows[b],cellCols[b]);if(!ma||!mb)return false;
      return !!(pairSumBits[(ma<<9)|mb]&(1<<need));
    }
    let min=0,max=0;
    for(const idx of cl.cells){const r=cellRows[idx],c=cellCols[idx];if(grid[r][c])continue;const mask=baseMask(r,c);if(!mask)return false;min+=lowDigit[mask];max+=highDigit[mask];}
    return min<=need&&need<=max;
  }
  function touchedFeasible(idx){for(const ci of cellClues[idx])if(!clueFeasible(ci))return false;return true;}
  function put(r,c,one){const d=digitForBit[one],b=box(r,c),idx=r*9+c;grid[r][c]=d;rows[r]|=one;cols[c]|=one;boxes[b]|=one;applyClues(idx,d,1);}
  function unput(r,c,one){const d=digitForBit[one],b=box(r,c),idx=r*9+c;applyClues(idx,d,-1);rows[r]^=one;cols[c]^=one;boxes[b]^=one;grid[r][c]=0;}
  function allowedMask(r,c){let out=0,mask=baseMask(r,c);for(let bits=mask;bits;bits&=bits-1){const one=bits&-bits;put(r,c,one);if(touchedFeasible(r*9+c))out|=one;unput(r,c,one);}return out;}
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){const v=grid[r][c];if(!v)continue;const one=1<<(v-1),b=box(r,c);if((rows[r]|cols[c]|boxes[b])&one)return{alternative:false,nodes:0,exhausted:false,forced:0,exactTailChecks:0};rows[r]|=one;cols[c]|=one;boxes[b]|=one;applyClues(r*9+c,v,1);}
  for(let ci=0;ci<compiled.length;ci++)if(!clueFeasible(ci))return{alternative:false,nodes:0,exhausted:false,forced:0,exactTailChecks};
  function visit(differs){
    if(found||exhausted)return;if(++nodes>nodeBudget){exhausted=true;return;}
    const forcedStack=[];let changed=true,contradiction=false;
    while(changed&&!contradiction){changed=false;for(let r=0;r<9&&!changed;r++)for(let c=0;c<9;c++)if(!grid[r][c]){const mask=baseMask(r,c),count=bitCount[mask];if(!count){contradiction=true;break;}if(count===1){const one=mask&-mask;put(r,c,one);if(cellClues[r*9+c].length&&!touchedFeasible(r*9+c)){unput(r,c,one);contradiction=true;break;}forcedStack.push([r,c,one]);forced++;if(digitForBit[one]!==solution[r][c])differs=true;changed=true;break;}}}
    if(!contradiction){let br=-1,bc=-1,bm=0,best=10;for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!grid[r][c]){const mask=allowedMask(r,c),count=bitCount[mask];if(!count){contradiction=true;break;}if(count<best){br=r;bc=c;bm=mask;best=count;if(count===1)break;}}if(!contradiction){if(br<0){if(differs)found=true;}else{const knownBit=1<<(solution[br][bc]-1),nonKnown=bm&~knownBit;for(let bits=nonKnown;bits&&!found&&!exhausted;bits&=bits-1){const one=bits&-bits;put(br,bc,one);visit(true);unput(br,bc,one);}if(!found&&!exhausted&&(bm&knownBit)){put(br,bc,knownBit);visit(differs);unput(br,bc,knownBit);}}}}
    for(let i=forcedStack.length-1;i>=0;i--){const [r,c,one]=forcedStack[i];unput(r,c,one);}
  }
  visit(false);return{alternative:found,nodes,exhausted,forced,exactTailChecks};
}

const puzzle=generated.puzzle.map(r=>r.slice());
const remaining=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(puzzle[r][c])remaining.push(r*9+c);
let removed=0,unresolved=0,totalNodes=0,totalForced=0,totalTail=0;
const t0=performance.now();
for(const idx of remaining){const r=Math.floor(idx/9),c=idx%9,old=puzzle[r][c];puzzle[r][c]=0;const check=findAlternative(puzzle,9000);totalNodes+=check.nodes;totalForced+=check.forced;totalTail+=check.exactTailChecks;if(check.exhausted){puzzle[r][c]=old;unresolved++;continue;}if(check.alternative){puzzle[r][c]=old;continue;}removed++;}
const finalCheck=findAlternative(puzzle,30000);totalNodes+=finalCheck.nodes;totalForced+=finalCheck.forced;totalTail+=finalCheck.exactTailChecks;
const elapsed=performance.now()-t0;if(finalCheck.exhausted||finalCheck.alternative)throw new Error('exact-tail probe lost exact uniqueness');
const givens=puzzle.flat().filter(Boolean).length;
console.log(`LITTLE_KILLER_EXACT_TAIL_LOOKUP baselineGivens=${remaining.length} finalGivens=${givens} removed=${removed} unresolved=${unresolved} nodes=${totalNodes} forced=${totalForced} exactTailChecks=${totalTail} runtimeMs=${elapsed.toFixed(1)}`);
console.log('LITTLE_KILLER_EXACT_TAIL_LOOKUP PASS');
