import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

if(text.includes('PARKS2_CARVE_BEGIN')){
  console.log('SKYSCRAPER_PARKS2_EXPERT_CARVE_INSTRUMENTATION:PASS already-present=true');
  process.exit(0);
}

const old=`      for(oi=0;oi<order.length;oi+=1){
        idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];if(!old)continue;
        grid[r][c]=0;
        if(countParks2Solutions(grid,working,2,false)===1){clues-=1;acceptedRemovals+=1;}
        else{grid[r][c]=old;rejectedRemovals+=1;}
      }`;

const replacement=`      for(oi=0;oi<order.length;oi+=1){
        idx=order[oi];r=Math.floor(idx/n);c=idx%n;old=grid[r][c];if(!old)continue;
        grid[r][c]=0;
        var parks2ProbeStart=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
        console.log('PARKS2_CARVE_BEGIN step='+oi+' cell=r'+(r+1)+'c'+(c+1)+' value='+old+' cluesBefore='+clues+' accepted='+acceptedRemovals+' rejected='+rejectedRemovals);
        var parks2ProbeSolutions=countParks2Solutions(grid,working,2,false);
        var parks2ProbeEnd=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
        console.log('PARKS2_CARVE_END step='+oi+' cell=r'+(r+1)+'c'+(c+1)+' solutions='+parks2ProbeSolutions+' ms='+(parks2ProbeEnd-parks2ProbeStart).toFixed(1));
        if(parks2ProbeSolutions===1){clues-=1;acceptedRemovals+=1;}
        else{grid[r][c]=old;rejectedRemovals+=1;}
      }`;

if(!text.includes(old))throw new Error('Skyscraper Parks 2 expert carve loop anchor not found');
text=text.replace(old,replacement);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_EXPERT_CARVE_INSTRUMENTATION:PASS already-present=false');
