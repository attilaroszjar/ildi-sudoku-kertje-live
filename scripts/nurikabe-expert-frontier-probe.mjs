import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
globalThis.localStorage={getItem(){return null;},setItem(){}};

function loadScript(rel){
  const source=fs.readFileSync(path.join(root,rel),'utf8');
  Function(source)();
}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
for(const ref of refs){
  if(/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref))loadScript(ref);
}
loadScript('games/sudoku-generator.js');
loadScript('games/p3-nurikabe-complete.js');

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank.find(v=>v.id==='nurikabe');
if(!G||!variant)throw new Error('Nurikabe runtime did not load');

variant.data=variant.data||{};
variant.data.p3Size=5;
const seed=101001;

const t0=performance.now();
const generated=G.make(variant,seed,'expert');
const generationMs=performance.now()-t0;
const original=generated.preShaded.map(p=>[p[0],p[1]]);
let kept=original.map(p=>[p[0],p[1]]);
const attempts=[];

function exactCount(preShaded){
  const stats={};
  const start=performance.now();
  const count=G.countNurikabeSolutions(generated.puzzle,2,stats,preShaded);
  return {count,ms:performance.now()-start,stats};
}

const baseline=exactCount(kept);
if(baseline.count!==1)throw new Error('Canonical generated Expert is not exact-unique at baseline');

for(const atom of original){
  const idx=kept.findIndex(p=>p[0]===atom[0]&&p[1]===atom[1]);
  if(idx<0)continue;
  const trial=kept.slice(0,idx).concat(kept.slice(idx+1));
  const result=exactCount(trial);
  const accepted=result.count===1;
  attempts.push({atom,accepted,count:result.count,ms:Number(result.ms.toFixed(3)),stats:result.stats});
  if(accepted)kept=trial;
}

const finalCheck=exactCount(kept);
const remainingChecks=[];
for(const atom of kept){
  const trial=kept.filter(p=>p[0]!==atom[0]||p[1]!==atom[1]);
  const result=exactCount(trial);
  remainingChecks.push({atom,count:result.count,ms:Number(result.ms.toFixed(3)),stats:result.stats});
}

const report={
  seed,
  boardSize:5,
  generationMs:Number(generationMs.toFixed(3)),
  islandClues:generated.generation.clues-original.length,
  baselinePreShaded:original.length,
  baseline:{count:baseline.count,ms:Number(baseline.ms.toFixed(3)),stats:baseline.stats},
  acceptedRemovals:original.length-kept.length,
  finalPreShaded:kept.length,
  kept,
  final:{count:finalCheck.count,ms:Number(finalCheck.ms.toFixed(3)),stats:finalCheck.stats},
  remainingIndividuallyRemovable:remainingChecks.filter(x=>x.count===1).length,
  remainingChecks,
  attempts
};

console.log('NURIKABE_EXPERT_FRONTIER '+JSON.stringify(report));
if(finalCheck.count!==1)process.exitCode=2;
else if(report.remainingIndividuallyRemovable!==0)process.exitCode=3;
