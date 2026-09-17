import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'games','sudoku-generator.js');
let source=fs.readFileSync(target,'utf8');

// Safe partial visibility pruning for the exact Classic/Domino Skyscraper solver.
// From a clue-facing contiguous prefix, the current visible count can never go
// down. Each remaining cell can increase it by at most one, and only values
// larger than the current maximum can do so. These are necessary bounds only,
// so this pruning cannot discard a valid completion.
const validStart='  function dominoSkyscraperValid(variant,grid,r,c,ignoreSpecial){';
const validEnd='  function countDominoSkyscraperSolutions(';
const validStartAt=source.indexOf(validStart);
const validEndAt=source.indexOf(validEnd,validStartAt);
if(validStartAt<0||validEndAt<0)throw new Error('dominoSkyscraperValid block not found');
const validReplacement=`  function skyscraperVisibilityFeasible(line,target){
    var visible=0,high=0,i=0;
    for(;i<line.length&&line[i];i+=1){if(line[i]>high){high=line[i];visible+=1;}}
    if(i===line.length)return visible===target;
    if(visible>target)return false;
    var remaining=line.length-i;
    var maxAdditional=Math.min(remaining,line.length-high);
    return visible+maxAdditional>=target;
  }
  function dominoSkyscraperValid(variant,grid,r,c,ignoreSpecial){
    if(ignoreSpecial)return true;
    var clues=affectedOutsideClues(variant,r,c),i;
    for(i=0;i<clues.length;i+=1){var cl=clues[i],line=orientedLine(grid,cl);if(!skyscraperVisibilityFeasible(line,cl.count))return false;}
    var dominoes=(variant.data&&variant.data.dominoes)||[],target=null;
    for(i=0;i<dominoes.length;i+=1){var dm=dominoes[i],a=grid[dm[0][0]][dm[0][1]],b=grid[dm[1][0]][dm[1][1]];if(a&&b){var sum=a+b;if(target===null)target=sum;else if(sum!==target)return false;}}
    return true;
  }
`;
source=source.slice(0,validStartAt)+validReplacement+source.slice(validEndAt);

const startMarker='  function makeDominoSkyscraperPuzzle(variant,seed,difficulty){';
const endMarker='  function parkVisibleCount(';
const start=source.indexOf(startMarker);
const end=source.indexOf(endMarker,start);
if(start<0||end<0)throw new Error('makeDominoSkyscraperPuzzle block not found');

const replacement=`  function makeDominoSkyscraperPuzzle(variant,seed,difficulty){
    var random=mulberry32(seed^0xD06D1A0),solution=permutedLatinSolution(variant.solution,random),n=solution.length,data=variant.id==='classic-skyscrapers'?JSON.parse(JSON.stringify(variant.data||{})):deriveDominoSkyscraperData(variant,solution,random);if(variant.id==='classic-skyscrapers')data.clues=exactOutsideClues(solution,'count');var working=Object.assign({},variant,{solution:solution,data:data}),target=targets(n,difficulty),grid=cloneGrid(solution),order=[];
    for(var i=0;i<n*n;i+=1)order.push(i);shuffle(order,random);var clues=n*n;
    for(var oi=0;oi<order.length&&clues>target;oi+=1){var idx=order[oi],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;grid[r][c]=0;if(countDominoSkyscraperSolutions(grid,working,2,false)!==1)grid[r][c]=old;else clues-=1;}
    var essential=countDominoSkyscraperSolutions(grid,working,2,true)!==1;
    if(!essential){shuffle(order,random);for(oi=0;oi<order.length&&!essential;oi+=1){idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];if(!old)continue;grid[r][c]=0;if(countDominoSkyscraperSolutions(grid,working,2,false)!==1)grid[r][c]=old;else{clues-=1;essential=countDominoSkyscraperSolutions(grid,working,2,true)!==1;}}}
    var expertLocalIrreducibility=variant.id==='classic-skyscrapers'&&difficulty==='expert';
    if(essential&&clues<target&&!expertLocalIrreducibility)clues=restoreAmbiguousGivens(grid,solution,order,target,clues,function(g){return countDominoSkyscraperSolutions(g,working,2,true);});
    var acceptedRemovals=0,rejectedRemovals=0;
    if(expertLocalIrreducibility){
      // A single complete pass is a proof here: once removing a given makes the
      // puzzle non-unique, deleting further givens cannot make it unique again.
      // The solution set is monotone under clue removal, so rejected removals
      // remain rejected in the final, sparser puzzle.
      for(oi=0;oi<order.length;oi+=1){
        idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];
        if(!old)continue;
        grid[r][c]=0;
        if(countDominoSkyscraperSolutions(grid,working,2,false)===1){clues-=1;acceptedRemovals+=1;}
        else{grid[r][c]=old;rejectedRemovals+=1;}
      }
    }
    var finalStats={};
    var unique=countDominoSkyscraperSolutions(grid,working,2,false,finalStats)===1;
    return {
      puzzle:grid,
      solution:solution,
      data:data,
      clues:clues,
      unique:unique,
      variantEssential:essential,
      generatorFamily:variant.id==='classic-skyscrapers'?(expertLocalIrreducibility?'seeded-row-column-permutation-expert-local-irreducible':'seeded-row-column-permutation'):'seeded-latin-permutation-derived-dominoes',
      verification:expertLocalIrreducibility?'solver-verified-local-irreducible':undefined,
      policy:expertLocalIrreducibility?'contract-driven-local-irreducibility':undefined,
      localIrreducibilityProof:expertLocalIrreducibility?'monotone-nonuniqueness-from-single-pass':undefined,
      locallyIrreducibleUnderProductionContract:expertLocalIrreducibility&&unique,
      acceptedRemovals:expertLocalIrreducibility?acceptedRemovals:undefined,
      rejectedRemovals:expertLocalIrreducibility?rejectedRemovals:undefined,
      searchStats:expertLocalIrreducibility?finalStats:undefined
    };
  }
`;

source=source.slice(0,start)+replacement+source.slice(end);

const cacheMarker='      cache.set(key, out);';
const propagation=`      ['policy','localIrreducibilityProof','locallyIrreducibleUnderProductionContract','acceptedRemovals','rejectedRemovals'].forEach(function(name){if(result[name]!==undefined)out.generation[name]=result[name];});\n`;
if(!source.includes(propagation.trim())){
  const cacheAt=source.indexOf(cacheMarker);
  if(cacheAt<0)throw new Error('generation cache marker not found');
  source=source.slice(0,cacheAt)+propagation+source.slice(cacheAt);
}

fs.writeFileSync(target,source);
console.log('CLASSIC_SKYSCRAPER_EXPERT_LOCAL_IRREDUCIBILITY_PATCH:PASS');
