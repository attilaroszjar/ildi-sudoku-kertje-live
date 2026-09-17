import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const lastGenerator=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator script range not found');
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1);
const refs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs){
  const code=fs.readFileSync(path.join(root,ref),'utf8');
  (0,eval)(`${code}\n//# sourceURL=${ref}`);
}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks production path not loaded');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('SKYSCRAPER_PARKS_EXPERT_SEED invalid');

function cloneGrid(grid){return grid.map(row=>row.slice());}
function bitCount(x){let count=0;while(x){x&=x-1;count++;}return count;}
function orientedLine(grid,clue){
  const line=clue.axis==='row'?grid[clue.index].slice():grid.map(row=>row[clue.index]);
  if(clue.side==='right'||clue.side==='bottom')line.reverse();
  return line;
}
function visibleCount(line,parkValue){
  let max=0,count=0;
  for(const value of line){
    if(value===parkValue)continue;
    if(value>max){max=value;count++;}
  }
  return count;
}
function clueIndexFor(generated){
  const n=generated.puzzle.length,index={row:Array.from({length:n},()=>[]),col:Array.from({length:n},()=>[])};
  for(const clue of generated.data?.clues||[])index[clue.axis][clue.index].push(clue);
  return index;
}
function instrumentedCount(source,generated,limit,ignoreClues){
  const grid=cloneGrid(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0);
  const park=generated.data?.parkValue||n,clueIndex=clueIndexFor(generated);
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,candidateCellsScanned:0,candidateDigitsTested:0,clueValidations:0,completedLineChecks:0,prunedCandidateDigits:0,maxDepth:0};

  function validAt(r,c){
    if(ignoreClues)return true;
    const clues=clueIndex.row[r].concat(clueIndex.col[c]);
    stats.clueValidations+=clues.length;
    for(const clue of clues){
      const line=orientedLine(grid,clue);
      if(!line.every(Boolean))continue;
      stats.completedLineChecks++;
      if(visibleCount(line,park)!==clue.count)return false;
    }
    return true;
  }

  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const value=grid[r][c];if(!value)continue;
    const bit=1<<(value-1);
    if((rows[r]|cols[c])&bit)return {count:0,stats};
    rows[r]|=bit;cols[c]|=bit;
    if(!validAt(r,c))return {count:0,stats};
  }

  let found=0;
  function visit(depth){
    if(found>=limit)return;
    stats.nodes++;
    if(depth>stats.maxDepth)stats.maxDepth=depth;
    let bestR=-1,bestC=-1,bestMask=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      stats.candidateCellsScanned++;
      const mask=full&~(rows[r]|cols[c]);
      let allowed=0;
      for(let bits=mask;bits;bits&=bits-1){
        const one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);
        stats.candidateDigitsTested++;
        grid[r][c]=digit;
        if(validAt(r,c))allowed|=one;else stats.prunedCandidateDigits++;
        grid[r][c]=0;
      }
      const count=bitCount(allowed);
      if(count<best){bestR=r;bestC=c;bestMask=allowed;best=count;if(best<=1)break;}
    }
    if(bestR<0){found++;stats.solutions=found;return;}
    if(!bestMask){stats.deadEnds++;return;}
    if(best>1)stats.branches++;
    for(let bits=bestMask;bits;bits&=bits-1){
      const one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);
      grid[bestR][bestC]=digit;rows[bestR]|=one;cols[bestC]|=one;
      visit(depth+1);
      rows[bestR]^=one;cols[bestC]^=one;grid[bestR][bestC]=0;
      if(found>=limit)return;
    }
  }
  visit(0);
  stats.solutions=found;
  return {count:found,stats};
}

function timedProduction(grid,generated,ignoreClues){
  const start=performance.now(),count=G.countParkSolutions(grid,generated,2,ignoreClues);
  return {count,runtimeMs:+(performance.now()-start).toFixed(1)};
}
function timedInstrumented(grid,generated,ignoreClues){
  const start=performance.now(),result=instrumentedCount(grid,generated,2,ignoreClues);
  return {...result,runtimeMs:+(performance.now()-start).toFixed(1)};
}

const generated=G.make(variant,seed,'expert');
const cases=[{id:'baseline',grid:cloneGrid(generated.puzzle)}];
for(let index=0;index<81;index++){
  const r=Math.floor(index/9),c=index%9;
  if(!generated.puzzle[r][c])continue;
  const grid=cloneGrid(generated.puzzle);grid[r][c]=0;
  cases.push({id:`r${r+1}c${c+1}`,index,grid});
}

let mismatches=0;
const rows=[];
for(const testCase of cases){
  const production=timedProduction(testCase.grid,generated,false);
  const instrumented=timedInstrumented(testCase.grid,generated,false);
  const match=production.count===instrumented.count;
  if(!match)mismatches++;
  rows.push({
    id:testCase.id,index:testCase.index??null,solutions:production.count,match,
    productionMs:production.runtimeMs,instrumentedMs:instrumented.runtimeMs,...instrumented.stats
  });
}

const baselineBaseProd=timedProduction(generated.puzzle,generated,true);
const baselineBaseInst=timedInstrumented(generated.puzzle,generated,true);
const baseMatch=baselineBaseProd.count===baselineBaseInst.count;
if(!baseMatch)mismatches++;

const sortedByNodes=rows.slice().sort((a,b)=>b.nodes-a.nodes);
const sortedByRuntime=rows.slice().sort((a,b)=>b.productionMs-a.productionMs);
const total=rows.reduce((acc,row)=>{
  acc.productionMs+=row.productionMs;acc.instrumentedMs+=row.instrumentedMs;acc.nodes+=row.nodes;acc.branches+=row.branches;acc.deadEnds+=row.deadEnds;acc.candidateDigitsTested+=row.candidateDigitsTested;acc.clueValidations+=row.clueValidations;acc.completedLineChecks+=row.completedLineChecks;acc.prunedCandidateDigits+=row.prunedCandidateDigits;return acc;
},{productionMs:0,instrumentedMs:0,nodes:0,branches:0,deadEnds:0,candidateDigitsTested:0,clueValidations:0,completedLineChecks:0,prunedCandidateDigits:0});
for(const key of ['productionMs','instrumentedMs'])total[key]=+total[key].toFixed(1);

console.log('SKYSCRAPER_PARKS_HOTSPOT_BASE '+JSON.stringify({seed,givens:generated.puzzle.flat().filter(Boolean).length,variantSolutions:rows[0].solutions,baseFamilySolutions:baselineBaseProd.count,baseDifferentialMatch:baseMatch,baseProductionMs:baselineBaseProd.runtimeMs,baseInstrumentedMs:baselineBaseInst.runtimeMs,baseStats:baselineBaseInst.stats}));
console.log('SKYSCRAPER_PARKS_HOTSPOT_SUMMARY '+JSON.stringify({seed,cases:rows.length,mismatches,total,topByNodes:sortedByNodes.slice(0,8),topByProductionRuntime:sortedByRuntime.slice(0,8)}));
console.log('SKYSCRAPER_PARKS_HOTSPOT_DIFFERENTIAL:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches!==0)process.exitCode=1;
