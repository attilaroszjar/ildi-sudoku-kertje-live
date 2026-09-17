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
for(const ref of refs){const code=fs.readFileSync(path.join(root,ref),'utf8');(0,eval)(`${code}\n//# sourceURL=${ref}`);}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks production path not loaded');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('SKYSCRAPER_PARKS_EXPERT_SEED invalid');

function cloneGrid(grid){return grid.map(row=>row.slice());}
function bitCount(x){let n=0;while(x){x&=x-1;n++;}return n;}
function orientedLine(grid,clue){const line=clue.axis==='row'?grid[clue.index].slice():grid.map(row=>row[clue.index]);if(clue.side==='right'||clue.side==='bottom')line.reverse();return line;}
function parkVisibleCount(line,parkValue){let max=0,count=0;for(const v of line){if(v===parkValue)continue;if(v>max){max=v;count++;}}return count;}
function optimizedCountParkSolutions(source,generated,limit,ignoreClues,stats){
  const grid=cloneGrid(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),rowFill=Array(n).fill(0),colFill=Array(n).fill(0);
  const clues=generated?.data?.clues||[],park=generated?.data?.parkValue||n;
  const rowClues=Array.from({length:n},()=>[]),colClues=Array.from({length:n},()=>[]);
  for(const clue of clues){if(clue.axis==='row')rowClues[clue.index].push(clue);else if(clue.axis==='col')colClues[clue.index].push(clue);}
  const s=stats||{};s.nodes=0;s.branches=0;s.deadEnds=0;s.solutions=0;s.candidateCellsScanned=0;s.candidateDigitsTested=0;s.completedLineChecks=0;s.prunedCandidateDigits=0;
  function completedLineValid(r,c){
    if(ignoreClues)return true;
    if(rowFill[r]===n){for(const clue of rowClues[r]){s.completedLineChecks++;if(parkVisibleCount(orientedLine(grid,clue),park)!==clue.count)return false;}}
    if(colFill[c]===n){for(const clue of colClues[c]){s.completedLineChecks++;if(parkVisibleCount(orientedLine(grid,clue),park)!==clue.count)return false;}}
    return true;
  }
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const value=grid[r][c];if(!value)continue;const bit=1<<(value-1);if((rows[r]|cols[c])&bit)return 0;rows[r]|=bit;cols[c]|=bit;rowFill[r]++;colFill[c]++;}
  if(!ignoreClues){for(let r=0;r<n;r++)if(rowFill[r]===n)for(const clue of rowClues[r]){s.completedLineChecks++;if(parkVisibleCount(orientedLine(grid,clue),park)!==clue.count)return 0;}for(let c=0;c<n;c++)if(colFill[c]===n)for(const clue of colClues[c]){s.completedLineChecks++;if(parkVisibleCount(orientedLine(grid,clue),park)!==clue.count)return 0;}}
  let found=0;
  function visit(){
    if(found>=limit)return;s.nodes++;
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      s.candidateCellsScanned++;
      const mask=full&~(rows[r]|cols[c]);let allowed=0;
      for(let bits=mask;bits;bits&=bits-1){const one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);s.candidateDigitsTested++;grid[r][c]=digit;rows[r]|=one;cols[c]|=one;rowFill[r]++;colFill[c]++;const ok=completedLineValid(r,c);rowFill[r]--;colFill[c]--;rows[r]^=one;cols[c]^=one;grid[r][c]=0;if(ok)allowed|=one;else s.prunedCandidateDigits++;}
      const cnt=bitCount(allowed);if(cnt<best){br=r;bc=c;bm=allowed;best=cnt;if(best<=1)break;}
    }
    if(br<0){found++;s.solutions=found;return;}
    if(!bm){s.deadEnds++;return;}
    if(best>1)s.branches++;
    for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;rowFill[br]++;colFill[bc]++;visit();rowFill[br]--;colFill[bc]--;rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(found>=limit)return;}
  }
  visit();return found;
}

const generated=G.make(variant,seed,'expert');
const cases=[{id:'baseline',puzzle:generated.puzzle}];
for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;if(!generated.puzzle[r][c])continue;const puzzle=cloneGrid(generated.puzzle);puzzle[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle});}
let mismatches=0,totalLegacyMs=0,totalOptimizedMs=0,totalNodes=0,totalCompleted=0;
const results=[];
for(const test of cases){
  const a0=performance.now();const legacy=G.countParkSolutions(test.puzzle,generated,2,false);const legacyMs=performance.now()-a0;
  const stats={};const b0=performance.now();const optimized=optimizedCountParkSolutions(test.puzzle,generated,2,false,stats);const optimizedMs=performance.now()-b0;
  const match=legacy===optimized;if(!match)mismatches++;
  totalLegacyMs+=legacyMs;totalOptimizedMs+=optimizedMs;totalNodes+=stats.nodes;totalCompleted+=stats.completedLineChecks;
  results.push({id:test.id,legacy,optimized,match,legacyMs:+legacyMs.toFixed(1),optimizedMs:+optimizedMs.toFixed(1),speedup:optimizedMs?+(legacyMs/optimizedMs).toFixed(2):null,nodes:stats.nodes,branches:stats.branches,deadEnds:stats.deadEnds,candidateDigitsTested:stats.candidateDigitsTested,completedLineChecks:stats.completedLineChecks,prunedCandidateDigits:stats.prunedCandidateDigits});
}
const baseLegacy=G.countParkSolutions(generated.puzzle,generated,2,true),baseStats={},baseOptimized=optimizedCountParkSolutions(generated.puzzle,generated,2,true,baseStats);if(baseLegacy!==baseOptimized)mismatches++;
const slowest=results.slice().sort((a,b)=>b.legacyMs-a.legacyMs).slice(0,8);
console.log('SKYSCRAPER_PARKS_VERIFIER_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,totalLegacyMs:+totalLegacyMs.toFixed(1),totalOptimizedMs:+totalOptimizedMs.toFixed(1),aggregateSpeedup:totalOptimizedMs?+(totalLegacyMs/totalOptimizedMs).toFixed(2):null,totalNodes,totalCompletedLineChecks:totalCompleted,baseIgnoreClues:{legacy:baseLegacy,optimized:baseOptimized,match:baseLegacy===baseOptimized},slowest}));
console.log('SKYSCRAPER_PARKS_VERIFIER_DIFFERENTIAL:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches)process.exitCode=1;
