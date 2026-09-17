import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const banks=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const refs=[...banks,...allRefs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
const generated=G.make(variant,seed,'expert');
const solution=generated.solution;
const n=generated.puzzle.length;
function cloneGrid(g){return g.map(r=>r.slice());}
function clueCount(g){return g.flat().filter(Boolean).length;}
function cellName(idx){return `r${Math.floor(idx/n)+1}c${idx%n+1}`;}

function findAlternative(source,{progress=false,label='case'}={}){
  const empties=[];
  for(let idx=0;idx<n*n;idx++)if(!source[Math.floor(idx/n)][idx%n])empties.push(idx);
  const prefix=cloneGrid(source);
  const start=performance.now();
  let calls=0;
  for(let k=0;k<empties.length;k++){
    const idx=empties[k],r=Math.floor(idx/n),c=idx%n,canonical=solution[r][c];
    if(progress)console.log('SKYSCRAPER_PARKS_ALT_PROGRESS '+JSON.stringify({phase:'cell-start',label,step:k+1,total:empties.length,cell:cellName(idx),canonical,elapsedMs:+(performance.now()-start).toFixed(1)}));
    for(let d=1;d<=n;d++){
      if(d===canonical)continue;
      const branch=cloneGrid(prefix);branch[r][c]=d;calls++;
      const t0=performance.now();
      const found=G.countParkSolutions(branch,generated,1,false)>0;
      const ms=performance.now()-t0;
      if(progress&&ms>=1000)console.log('SKYSCRAPER_PARKS_ALT_PROGRESS '+JSON.stringify({phase:'branch-done',label,step:k+1,cell:cellName(idx),digit:d,found,runtimeMs:+ms.toFixed(1),elapsedMs:+(performance.now()-start).toFixed(1)}));
      if(found)return {alternativeExists:true,firstDifference:cellName(idx),alternativeDigit:d,calls,runtimeMs:performance.now()-start};
    }
    prefix[r][c]=canonical;
    if(progress)console.log('SKYSCRAPER_PARKS_ALT_PROGRESS '+JSON.stringify({phase:'cell-done',label,step:k+1,total:empties.length,cell:cellName(idx),calls,elapsedMs:+(performance.now()-start).toFixed(1)}));
  }
  return {alternativeExists:false,firstDifference:null,alternativeDigit:null,calls,runtimeMs:performance.now()-start};
}

const cases=[{id:'base',puzzle:cloneGrid(generated.puzzle)}];
for(let idx=0;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;
  const p=cloneGrid(generated.puzzle);p[r][c]=0;cases.push({id:cellName(idx),puzzle:p});
}
let mismatches=0,productionMs=0,alternativeMs=0,totalCalls=0;
const diffs=[];
for(const tc of cases){
  const t0=performance.now();const count=G.countParkSolutions(tc.puzzle,generated,2,false);const pms=performance.now()-t0;
  const alt=findAlternative(tc.puzzle);const uniqueByAlt=!alt.alternativeExists;
  const match=(count===1)===uniqueByAlt;
  if(!match)mismatches++;
  productionMs+=pms;alternativeMs+=alt.runtimeMs;totalCalls+=alt.calls;
  diffs.push({id:tc.id,count,uniqueByAlt,match,productionMs:+pms.toFixed(1),alternativeMs:+alt.runtimeMs.toFixed(1),calls:alt.calls});
}
console.log('SKYSCRAPER_PARKS_ALTERNATIVE_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,productionMs:+productionMs.toFixed(1),alternativeMs:+alternativeMs.toFixed(1),aggregateSpeedup:alternativeMs?+(productionMs/alternativeMs).toFixed(2):null,totalCalls,slowest:diffs.slice().sort((a,b)=>b.alternativeMs-a.alternativeMs).slice(0,8)}));
if(mismatches){console.log('SKYSCRAPER_PARKS_ALTERNATIVE_SOLUTION_GATE:FAIL');process.exitCode=1;}else{
  const accepted=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1'];
  const sparse=cloneGrid(generated.puzzle);
  for(const cell of accepted){const m=/r(\d+)c(\d+)/.exec(cell);sparse[Number(m[1])-1][Number(m[2])-1]=0;}
  if(clueCount(sparse)!==13)throw new Error(`expected 13-clue reconstructed state, got ${clueCount(sparse)}`);
  const trial=cloneGrid(sparse);trial[6][5]=0;
  console.log('SKYSCRAPER_PARKS_ALT_PROGRESS '+JSON.stringify({phase:'hotspot-start',cell:'r7c6',cluesBefore:13,trialClues:12,mode:'first-difference-alternative-search'}));
  const alt=findAlternative(trial,{progress:true,label:'r7c6-13to12'});
  let baseFamilySolutions=null;
  if(!alt.alternativeExists)baseFamilySolutions=G.countParkSolutions(trial,generated,2,true);
  console.log('SKYSCRAPER_PARKS_ALTERNATIVE_HOTSPOT '+JSON.stringify({seed,cell:'r7c6',cluesBefore:13,trialClues:12,...alt,uniqueUnderVariant:!alt.alternativeExists,baseFamilySolutions,productionContractPass:!alt.alternativeExists&&baseFamilySolutions>1}));
  console.log('SKYSCRAPER_PARKS_ALTERNATIVE_SOLUTION_GATE:PASS');
}
