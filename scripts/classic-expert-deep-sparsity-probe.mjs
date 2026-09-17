'use strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Evaluator=require('../games/classic-human/runtime-evaluator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function clone(x){return JSON.parse(JSON.stringify(x));}
function puzzleString(grid){return grid.flat().join('');}
function clueCount(text){let n=0;for(const ch of text)if(ch!=='0')n++;return n;}
function mulberry32(seed){let x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
function diversifiedVariant(variant,seed){const out=clone(variant),source=variant.solution,random=mulberry32((seed^0xC1A551C5)>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];for(let bi=0;bi<3;bi++){const inner=shuffle([0,1,2],random);for(let ri=0;ri<3;ri++)rows.push(bands[bi]*3+inner[ri]);}for(let si=0;si<3;si++){const inner=shuffle([0,1,2],random);for(let ci=0;ci<3;ci++)cols.push(stacks[si]*3+inner[ci]);}out.solution=rows.map(r=>cols.map(c=>digits[source[r][c]-1]));return out;}
function accepted(ev){const r=ev&&ev.rating;return !!(ev&&ev.unique===true&&ev.status==='SOLVED_LOGICALLY'&&r&&Number.isInteger(r.level)&&r.level>=6&&r.level<=8);}
function rank(ev){const r=ev&&ev.rating;if(!r||!Number.isFinite(r.score))return -1e6;return r.score+(Number.isInteger(r.advancedSteps)?r.advancedSteps:0)*24;}
function loadBaseGenerator(){const p=require.resolve('../games/sudoku-generator.js');delete require.cache[p];delete global.SudokuGenerator;require(p);return global.SudokuGenerator;}
function better(a,b){if(!a)return b;if(!b)return a;const ac=clueCount(a.puzzle),bc=clueCount(b.puzzle);if(ac!==bc)return ac<bc?a:b;const ar=rank(a.evaluation),br=rank(b.evaluation);if(ar!==br)return ar>br?a:b;return a.puzzle<b.puzzle?a:b;}

const seed=Number(process.env.CLASSIC_DEEP_SEED||92004),target=Number(process.env.CLASSIC_DEEP_TARGET||21),beamWidth=Number(process.env.CLASSIC_DEEP_BEAM||32),maxEvaluations=Number(process.env.CLASSIC_DEEP_MAX_EVALS||12000);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('CLASSIC_DEEP_SEED invalid');
if(!Number.isInteger(target)||target<17||target>30)throw new RangeError('CLASSIC_DEEP_TARGET invalid');
if(!Number.isInteger(beamWidth)||beamWidth<1||beamWidth>128)throw new RangeError('CLASSIC_DEEP_BEAM invalid');
if(!Number.isInteger(maxEvaluations)||maxEvaluations<100||maxEvaluations>50000)throw new RangeError('CLASSIC_DEEP_MAX_EVALS invalid');

const generator=loadBaseGenerator(),baseProfiles=['expert','focused','gentle'],cache=new Map();let evals=0,prunes=0;
function evaluate(p){if(cache.has(p))return cache.get(p);if(evals>=maxEvaluations)return null;const ev=typeof Evaluator.evaluateExpertSearch==='function'?Evaluator.evaluateExpertSearch(p):Evaluator.evaluate(p);evals++;if(ev&&ev.status==='BRUTAL_LOWER_BOUND')prunes++;cache.set(p,ev);return ev;}

const entries=[],seenEntries=new Set();
outer:for(let attempt=0;attempt<6;attempt++){
  const derived=(seed+Math.imul(attempt,0x9E3779B1))>>>0;
  for(let pi=0;pi<baseProfiles.length;pi++){
    const shaped=diversifiedVariant(classic(),(derived^Math.imul(pi+1,0x85EBCA6B))>>>0),base=generator.make(shaped,derived,baseProfiles[pi]);
    if(!base||!base.generation||base.generation.unique!==true)continue;
    const root=puzzleString(base.puzzle),rootEv=evaluate(root);if(rootEv&&accepted(rootEv)&&!seenEntries.has(root)){seenEntries.add(root);entries.push({puzzle:root,evaluation:rootEv});}
    let frontier=[{puzzle:root,evaluation:rootEv,rank:rank(rootEv)}];
    for(let depth=0;depth<2;depth++){
      const next=[];
      for(const node of frontier){
        const start=(derived^Math.imul(depth+1,0x85EBCA6B))>>>0;
        for(let j=0;j<81;j++){
          const idx=(start+j)%81;if(node.puzzle[idx]==='0')continue;
          const child=node.puzzle.slice(0,idx)+'0'+node.puzzle.slice(idx+1),ev=evaluate(child);if(!ev)break outer;
          if(accepted(ev)&&!seenEntries.has(child)){seenEntries.add(child);entries.push({puzzle:child,evaluation:ev});}
          else if(ev.unique&&ev.status!=='INVALID'&&ev.status!=='NON_UNIQUE'&&rank(ev)>-100000)next.push({puzzle:child,evaluation:ev,rank:rank(ev)});
        }
      }
      next.sort((a,b)=>b.rank-a.rank||a.puzzle.localeCompare(b.puzzle));frontier=next.slice(0,4);if(!frontier.length)break;
    }
  }
}
entries.sort((a,b)=>clueCount(a.puzzle)-clueCount(b.puzzle)||b.evaluation.rating.score-a.evaluation.rating.score||a.puzzle.localeCompare(b.puzzle));
let frontier=entries.slice(0,Math.min(16,entries.length)).map(x=>({puzzle:x.puzzle,evaluation:x.evaluation,path:[]})),solution=null,depth=0,globalBest=null;
for(const node of frontier)globalBest=better(globalBest,node);
const seen=new Set(frontier.map(x=>x.puzzle)),terminalByGivens={};
while(frontier.length&&!solution&&evals<maxEvaluations){
  const next=[];
  for(const node of frontier){
    let acceptedChildCount=0;
    for(let i=0;i<81;i++){
      if(node.puzzle[i]==='0')continue;
      const child=node.puzzle.slice(0,i)+'0'+node.puzzle.slice(i+1);if(seen.has(child))continue;seen.add(child);
      const ev=evaluate(child);if(!ev)break;
      if(!accepted(ev))continue;
      acceptedChildCount++;
      const candidate={puzzle:child,evaluation:ev,path:[...node.path,i]};
      globalBest=better(globalBest,candidate);
      if(clueCount(child)<=target){solution=candidate;break;}
      next.push(candidate);
    }
    if(acceptedChildCount===0){const g=clueCount(node.puzzle);terminalByGivens[g]=(terminalByGivens[g]||0)+1;}
    if(solution||evals>=maxEvaluations)break;
  }
  if(solution)break;
  next.sort((a,b)=>clueCount(a.puzzle)-clueCount(b.puzzle)||rank(b.evaluation)-rank(a.evaluation)||a.puzzle.localeCompare(b.puzzle));
  frontier=next.slice(0,beamWidth);depth++;
  console.log('CLASSIC_EXPERT_DEEP_DEPTH '+JSON.stringify({depth,frontier:frontier.length,bestFrontierGivens:frontier.length?Math.min(...frontier.map(x=>clueCount(x.puzzle))):null,globalBestGivens:globalBest?clueCount(globalBest.puzzle):null,evaluations:evals,brutalPrunes:prunes,terminalByGivens}));
}
const best=solution||globalBest;
console.log('CLASSIC_EXPERT_DEEP_RESULT '+JSON.stringify({seed,target,reached:!!solution,entryCount:entries.length,bestGivens:best?clueCount(best.puzzle):null,level:best&&best.evaluation.rating?best.evaluation.rating.level:null,score:best&&best.evaluation.rating?best.evaluation.rating.score:null,path:solution?solution.path:[],evaluations:evals,brutalPrunes:prunes,maxEvaluations,beamWidth,terminalByGivens}));
console.log('CLASSIC_EXPERT_DEEP_SPARSITY_PROBE PASS');
