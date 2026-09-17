import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
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
const hardening=globalThis.XSumsRuntimeHardening;
const variant=globalThis.SudokuBank?.find(item=>item.id==='skyscraper-parks');
if(!G||!hardening||!variant)throw new Error('Skyscraper Parks production generator path not loaded');
if(typeof G.countParkSolutions!=='function')throw new Error('countParkSolutions missing');

const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('SKYSCRAPER_PARKS_EXPERT_SEED invalid');

function clueCount(grid){return grid.flat().filter(Boolean).length;}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function fixed(value,digits=1){return Number(value.toFixed(digits));}
function stablePayload(generated){
  return JSON.stringify({puzzle:generated.puzzle,solution:generated.solution,data:generated.data,generation:generated.generation});
}
function topologySummary(generated){
  const clues=generated?.data?.clues||[],byAxis={row:0,col:0},bySide={left:0,right:0,top:0,bottom:0},counts={};
  for(const clue of clues){
    if(clue.axis in byAxis)byAxis[clue.axis]++;
    if(clue.side in bySide)bySide[clue.side]++;
    const value=clue.count??clue.sum??null;
    if(value!==null)counts[value]=(counts[value]||0)+1;
  }
  return {size:generated.puzzle.length,baseStructure:'latin-row-column',parkValue:generated?.data?.parkValue??generated.puzzle.length,outsideClueCount:clues.length,byAxis,bySide,clueValueHistogram:counts};
}
function generationMetadata(generated){
  const g=generated?.generation||{};
  return {clues:g.clues??null,unique:g.unique===true,variantEssential:g.variantEssential===true,generatorFamily:g.generatorFamily||null,requestedSeed:g.requestedSeed??null,actualSeed:g.actualSeed??null,attempt:g.attempt??null,difficultyScore:g.difficultyScore??null,difficultyCalibration:g.difficultyCalibration||null,policy:g.policy||null,verification:g.verification||null,locallyIrreducibleUnderProductionContract:g.locallyIrreducibleUnderProductionContract===true};
}

const generationStart=performance.now();
const generated=G.make(variant,seed,'expert');
const generationMs=performance.now()-generationStart;
const repeat=G.make(variant,seed,'expert');
const deterministic=stablePayload(generated)===stablePayload(repeat);
const givens=clueCount(generated.puzzle);
const verifyStart=performance.now();
const variantSolutions=G.countParkSolutions(generated.puzzle,generated,2,false);
const baselineSolutions=G.countParkSolutions(generated.puzzle,generated,2,true);
const verifyMs=performance.now()-verifyStart;
const uniqueUnderVariant=variantSolutions===1,variantEssential=baselineSolutions>1;
const metadata=generationMetadata(generated),topology=topologySummary(generated);
const configuredExpertTarget=hardening.skyscraperParksExpertTarget??null,maxAttempts=hardening.outsideMaxAttempts??null;
const baselineContract=givens===configuredExpertTarget&&uniqueUnderVariant&&variantEssential&&deterministic&&metadata.unique&&metadata.variantEssential;

const children=[];
let uniqueChildren=0,essentialChildren=0,acceptedChildren=0;
const frontierStart=performance.now();
for(let index=0;index<generated.puzzle.length*generated.puzzle.length;index++){
  const n=generated.puzzle.length,r=Math.floor(index/n),c=index%n;
  if(!generated.puzzle[r][c])continue;
  const puzzle=cloneGrid(generated.puzzle);puzzle[r][c]=0;
  const childStart=performance.now();
  const childVariantSolutions=G.countParkSolutions(puzzle,generated,2,false),childUnique=childVariantSolutions===1;
  if(childUnique)uniqueChildren++;
  let childBaselineSolutions=null,childEssential=false;
  if(childUnique){
    childBaselineSolutions=G.countParkSolutions(puzzle,generated,2,true);
    childEssential=childBaselineSolutions>1;
    if(childEssential)essentialChildren++;
  }
  const accepted=childUnique&&childEssential;
  if(accepted)acceptedChildren++;
  children.push({index,cell:`r${r+1}c${c+1}`,value:generated.puzzle[r][c],variantSolutions:childVariantSolutions,baselineSolutions:childBaselineSolutions,uniqueUnderVariant:childUnique,variantEssential:childEssential,productionContractPass:accepted,solverNodes:null,solverBranches:null,solverDeadEnds:null,runtimeMs:fixed(performance.now()-childStart)});
}
const frontierMs=performance.now()-frontierStart;
const slowest=children.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,Math.min(8,children.length));
const removable=children.filter(child=>child.productionContractPass);
const rejected=children.filter(child=>!child.productionContractPass);
if(removable.length!==acceptedChildren||rejected.length!==children.length-acceptedChildren)throw new Error('frontier classification invariant failed');

console.log('SKYSCRAPER_PARKS_EXPERT_BASELINE '+JSON.stringify({seed,runtimeRealm:'host',givens,density:fixed(givens/(generated.puzzle.length**2),3),generationMs:fixed(generationMs),verifyMs:fixed(verifyMs),visibleOutsideClues:topology.outsideClueCount,variantSolutions,baseFamilySolutions:baselineSolutions,baseFamily:'latin-without-skyscraper-clues',uniqueUnderVariant,variantEssential,deterministic,configuredExpertTarget,carvingStopCondition:'clues > configured expert target',sourceDifficulty:'focused',boundedAttempts:maxAttempts,fallbackRestore:false,runtimeCutoff:false,topologyOnlyStop:false,localIrreducibilityCheckedByProduction:false,topology,generation:metadata}));
console.log('SKYSCRAPER_PARKS_EXPERT_FRONTIER '+JSON.stringify({seed,runtimeRealm:'host',baselineClues:givens,evaluatedAtoms:children.length,removableCount:removable.length,rejectedCount:rejected.length,uniqueChildren,essentialChildren,locallyIrreducibleUnderProductionContract:removable.length===0,frontierMs:fixed(frontierMs),searchStatsAvailable:false,slowestRemovalChecks:slowest,removable,rejected}));
console.log('SKYSCRAPER_PARKS_EXPERT_PLAYABILITY_PROBE:'+(baselineContract?'PASS':'FAIL'));
if(!baselineContract)process.exitCode=1;
