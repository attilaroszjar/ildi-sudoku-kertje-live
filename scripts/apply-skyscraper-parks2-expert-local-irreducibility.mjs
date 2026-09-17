import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function makeParks2Puzzle(variant,seed,difficulty){');
const end=text.indexOf('\n\n\n\n  function toroidalSkyVisible',start);
if(start<0||end<0)throw new Error('Skyscraper Parks 2 generator block not found');

const current=text.slice(start,end);
if(current.includes("generatorFamily:'seeded-latin-permutation-expert-local-irreducible'")){
  console.log('SKYSCRAPER_PARKS2_EXPERT_LOCAL_IRREDUCIBILITY_PATCH:PASS');
  process.exit(0);
}

const replacement=`  function makeParks2Puzzle(variant,seed,difficulty){
    var random=mulberry32(seed^0x2A2A50),solution=permutedLatinSolution(variant.solution,random),n=solution.length,data=JSON.parse(JSON.stringify(variant.data||{}));data.clues=exactOutsideClues(solution,'count',data.parkValue);var working=Object.assign({},variant,{solution:solution,data:data});
    var target=targets(n,difficulty),grid=cloneGrid(solution),order=[];for(var i=0;i<n*n;i+=1)order.push(i);shuffle(order,random);var clues=n*n;
    for(var oi=0;oi<order.length&&clues>target;oi+=1){var idx=order[oi],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];grid[r][c]=0;if(countParks2Solutions(grid,working,2,false)!==1)grid[r][c]=old;else clues-=1;}
    var essential=countParks2Solutions(grid,working,2,true)!==1;
    if(!essential){shuffle(order,random);for(oi=0;oi<order.length&&!essential;oi+=1){idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];if(!old)continue;grid[r][c]=0;if(countParks2Solutions(grid,working,2,false)!==1)grid[r][c]=old;else{clues--;essential=countParks2Solutions(grid,working,2,true)!==1;}}}

    var expertLocalIrreducibility=difficulty==='expert'&&essential,acceptedRemovals=0,rejectedRemovals=0;
    if(expertLocalIrreducibility){
      for(oi=0;oi<order.length;oi+=1){
        idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];if(!old)continue;
        grid[r][c]=0;
        if(countParks2Solutions(grid,working,2,false)===1){clues-=1;acceptedRemovals+=1;}
        else{grid[r][c]=old;rejectedRemovals+=1;}
      }
      essential=countParks2Solutions(grid,working,2,true)!==1;
    }

    var unique=countParks2Solutions(grid,working,2,false)===1;
    return {
      puzzle:grid,
      solution:solution,
      data:data,
      clues:clues,
      unique:unique,
      variantEssential:essential,
      generatorFamily:expertLocalIrreducibility?'seeded-latin-permutation-expert-local-irreducible':'seeded-latin-permutation',
      verification:expertLocalIrreducibility?'solver-verified-local-irreducible':undefined,
      policy:expertLocalIrreducibility?'contract-driven-local-irreducibility':undefined,
      localIrreducibilityProof:expertLocalIrreducibility?'monotone-nonuniqueness-from-single-pass':undefined,
      locallyIrreducibleUnderProductionContract:expertLocalIrreducibility&&unique&&essential,
      acceptedRemovals:expertLocalIrreducibility?acceptedRemovals:undefined,
      rejectedRemovals:expertLocalIrreducibility?rejectedRemovals:undefined
    };
  }`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_EXPERT_LOCAL_IRREDUCIBILITY_PATCH:PASS');
