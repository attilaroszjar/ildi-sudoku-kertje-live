import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

const ctx={
  console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  setTimeout,clearTimeout
};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const siblings=ctx.LineGeneratorProvenSiblings;
const variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner production generator path not loaded');

const seed=Number(process.env.NABNER_EXPERT_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_EXPERT_SEED invalid');
const configuredExpertTarget=siblings.CONFIGS?.nabner?.targetsByDifficulty?.expert??null;

function clueCount(grid){return grid.flat().filter(Boolean).length;}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function lineCells(line){return Array.isArray(line)?line:(line&&Array.isArray(line.cells)?line.cells:[]);}
function linesValid(generated){
  const lines=generated?.data?.lines||[];
  return lines.length>=2&&lines.every(line=>{
    const cells=lineCells(line);
    const values=cells.map(([r,c])=>generated.solution[r][c]);
    return cells.length>=4&&new Set(values).size===values.length&&values.every((a,i)=>values.every((b,j)=>i===j||Math.abs(a-b)!==1));
  });
}
function generationMetadata(generated){
  const g=generated?.generation||{};
  return {
    clues:g.clues??null,
    generatorFamily:g.generatorFamily||null,
    mode:g.mode||null,
    verification:g.verification||null,
    policy:g.policy||null,
    variantEssential:g.variantEssential===true,
    lineCount:g.lineCount??null,
    topologyFingerprint:g.topologyFingerprint||null,
    difficultyScore:g.difficultyScore??null
  };
}

const t0=performance.now();
const generated=G.make(variant,seed,'expert');
const generationMs=performance.now()-t0;
const repeat=G.make(variant,seed,'expert');
const deterministic=JSON.stringify(generated)===JSON.stringify(repeat);
const givens=clueCount(generated.puzzle);
const lineValidity=linesValid(generated);
const variantSolutions=G.countVariantSolutions(generated.puzzle,generated,2);
const classicSolutions=G.countSolutions(generated.puzzle,2);
const uniqueUnderNabner=variantSolutions===1;
const variantEssential=classicSolutions>1;
const metadata=generationMetadata(generated);
const baselineContract=lineValidity&&uniqueUnderNabner&&variantEssential&&deterministic&&metadata.variantEssential;

const children=[];
let variantUniqueChildren=0,variantEssentialChildren=0,acceptedChildren=0;
const frontierStart=performance.now();
for(let index=0;index<81;index++){
  const r=Math.floor(index/9),c=index%9;
  if(!generated.puzzle[r][c])continue;
  const puzzle=cloneGrid(generated.puzzle);
  puzzle[r][c]=0;
  const stats={};
  const childStart=performance.now();
  const childVariantSolutions=G.countVariantSolutions(puzzle,generated,2,stats);
  const childVariantUnique=childVariantSolutions===1;
  if(childVariantUnique)variantUniqueChildren++;
  let childClassicSolutions=null;
  let childVariantEssential=false;
  if(childVariantUnique){
    childClassicSolutions=G.countSolutions(puzzle,2);
    childVariantEssential=childClassicSolutions>1;
    if(childVariantEssential)variantEssentialChildren++;
  }
  const accepted=childVariantUnique&&childVariantEssential&&lineValidity;
  if(accepted)acceptedChildren++;
  children.push({
    index,
    cell:`r${r+1}c${c+1}`,
    variantSolutions:childVariantSolutions,
    classicSolutions:childClassicSolutions,
    accepted,
    solverNodes:stats.nodes??null,
    solverBranches:stats.branches??null,
    solverDeadEnds:stats.deadEnds??null,
    runtimeMs:Number((performance.now()-childStart).toFixed(1))
  });
}
const frontierMs=performance.now()-frontierStart;

console.log('NABNER_EXPERT_BASELINE '+JSON.stringify({
  seed,
  givens,
  density:Number((givens/81).toFixed(3)),
  generationMs:Number(generationMs.toFixed(1)),
  lineValidity,
  variantSolutions,
  classicSolutions,
  uniqueUnderNabner,
  variantEssential,
  deterministic,
  configuredExpertTarget,
  carvingStopCondition:'clues > configured target',
  restoreToConfiguredTarget:true,
  generation:metadata
}));
console.log('NABNER_EXPERT_FRONTIER '+JSON.stringify({
  seed,
  evaluated:children.length,
  variantUniqueChildren,
  variantEssentialChildren,
  acceptedChildren,
  locallyIrreducibleUnderProductionContract:acceptedChildren===0,
  frontierMs:Number(frontierMs.toFixed(1)),
  removable:children.filter(child=>child.accepted),
  rejected:children.filter(child=>!child.accepted)
}));
console.log('NABNER_EXPERT_PLAYABILITY_PROBE '+(baselineContract?'PASS':'FAIL'));
if(!baselineContract)process.exitCode=1;
