import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

function replaceFunctionBlock(source,startMarker,nextMarker,replacement){
  const start=source.indexOf(startMarker);
  if(start<0)throw new Error(`anchor not found: ${startMarker}`);
  const end=source.indexOf(nextMarker,start);
  if(end<0)throw new Error(`next anchor not found: ${nextMarker}`);
  return source.slice(0,start)+replacement+source.slice(end);
}

const validBlock=`  function parks2VisibleCount(line,parkValue){var max=0,count=0;for(var i=0;i<line.length;i+=1){var v=line[i];if(v===parkValue)continue;if(v>max){max=v;count+=1;}}return count;}
  function parks2VisibilityFeasible(line,parkValue,target,maxDigit){
    var visible=0,high=0,i=0;
    for(;i<line.length&&line[i];i+=1){var v=line[i];if(v===parkValue)continue;if(v>high){high=v;visible+=1;}}
    if(i===line.length)return visible===target;
    if(visible>target)return false;
    var remaining=line.length-i;
    var maxAdditional=Math.min(remaining,Math.max(0,maxDigit-high));
    return visible+maxAdditional>=target;
  }
  function parks2CluesValid(variant,grid,r,c,ignoreClues){
    if(ignoreClues)return true;var clues=affectedOutsideClues(variant,r,c),park=variant.data.parkValue,maxDigit=(variant.data&&variant.data.maxDigit)||grid.length-2;
    for(var i=0;i<clues.length;i++){var cl=clues[i],line=orientedLine(grid,cl);if(!parks2VisibilityFeasible(line,park,cl.count,maxDigit))return false;}return true;
  }
`;

if(!text.includes('function parks2VisibilityFeasible(')){
  text=replaceFunctionBlock(
    text,
    '  function parks2VisibleCount(',
    '  function countParks2Solutions(',
    validBlock
  );
}

const counterBlock=`  function countParks2Solutions(source,variant,limit,ignoreClues){
    var grid=cloneGrid(source),n=grid.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2,full=(1<<maxDigit)-1;
    var rows=Array(n).fill(0),cols=Array(n).fill(0),rowParks=Array(n).fill(0),colParks=Array(n).fill(0),rowEmpty=Array(n).fill(n),colEmpty=Array(n).fill(n),r,c;
    for(r=0;r<n;r+=1)for(c=0;c<n;c+=1){var value=grid[r][c];if(!value)continue;rowEmpty[r]-=1;colEmpty[c]-=1;if(value===park){rowParks[r]+=1;colParks[c]+=1;if(rowParks[r]>parksPerLine||colParks[c]>parksPerLine)return 0;}else{if(value<1||value>maxDigit)return 0;var bit=1<<(value-1);if((rows[r]|cols[c])&bit)return 0;rows[r]|=bit;cols[c]|=bit;}if(!parks2CluesValid(variant,grid,r,c,ignoreClues))return 0;}
    for(var qi=0;qi<n;qi+=1)if(rowParks[qi]+rowEmpty[qi]<parksPerLine||colParks[qi]+colEmpty[qi]<parksPerLine)return 0;
    var found=0;
    function visit(){
      if(found>=limit)return;
      for(var q=0;q<n;q+=1)if(rowParks[q]+rowEmpty[q]<parksPerLine||colParks[q]+colEmpty[q]<parksPerLine)return;
      var br=-1,bc=-1,best=null,bestCount=n+2;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var allowed=[],mask=full&~(rows[rr]|cols[cc]),mustParkRow=rowParks[rr]+rowEmpty[rr]===parksPerLine,mustParkCol=colParks[cc]+colEmpty[cc]===parksPerLine;
        if(!mustParkRow&&!mustParkCol)for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(parks2CluesValid(variant,grid,rr,cc,ignoreClues))allowed.push(digit);grid[rr][cc]=0;}
        if(rowParks[rr]<parksPerLine&&colParks[cc]<parksPerLine){grid[rr][cc]=park;if(parks2CluesValid(variant,grid,rr,cc,ignoreClues))allowed.push(park);grid[rr][cc]=0;}
        if(allowed.length<bestCount){br=rr;bc=cc;best=allowed;bestCount=allowed.length;if(bestCount<=1)break;}
      }
      if(br<0){for(var i=0;i<n;i+=1)if(rows[i]!==full||cols[i]!==full||rowParks[i]!==parksPerLine||colParks[i]!==parksPerLine)return;found+=1;return;}
      if(!best||!best.length)return;
      for(var ai=0;ai<best.length;ai+=1){var value=best[ai];grid[br][bc]=value;rowEmpty[br]-=1;colEmpty[bc]-=1;if(value===park){rowParks[br]+=1;colParks[bc]+=1;}else{var bit=1<<(value-1);rows[br]|=bit;cols[bc]|=bit;}visit();if(value===park){rowParks[br]-=1;colParks[bc]-=1;}else{rows[br]^=bit;cols[bc]^=bit;}rowEmpty[br]+=1;colEmpty[bc]+=1;grid[br][bc]=0;if(found>=limit)return;}
    }
    visit();return found;
  }
`;

if(!text.includes('rowEmpty=Array(n).fill(n)')){
  text=replaceFunctionBlock(
    text,
    '  function countParks2Solutions(',
    '  function makeParks2Puzzle(',
    counterBlock
  );
}

fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_VERIFIER_PRUNING_PATCH:PASS');
