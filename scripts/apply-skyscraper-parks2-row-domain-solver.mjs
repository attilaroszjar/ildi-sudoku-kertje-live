import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function countParks2Solutions(source,variant,limit,ignoreClues){');
const end=text.indexOf('\n  function makeParks2Puzzle(variant,seed,difficulty){',start);
if(start<0||end<0)throw new Error('Skyscraper Parks 2 counter block not found');

const current=text.slice(start,end);
if(current.includes('function countParks2SolutionsByRows(')){
  console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_SOLVER_PATCH:PASS already-present=true');
  process.exit(0);
}

const replacement=`  function countParks2SolutionsCellwise(source,variant,limit,ignoreClues){
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

  function countParks2SolutionsByRows(source,variant,limit){
    var n=source.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2,full=(1<<maxDigit)-1;
    var clues=d.clues||[],rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    for(var ci=0;ci<clues.length;ci+=1){var cl=clues[ci];if(cl.axis==='row')rowClues[cl.index].push(cl);else if(cl.axis==='col')colClues[cl.index].push(cl);}

    function visible(line){return parks2VisibleCount(line,park);}
    function oriented(seq,cl){var out=seq.slice();if(cl.side==='right'||cl.side==='bottom')out.reverse();return out;}
    function lineMatchesClues(seq,list){for(var i=0;i<list.length;i++)if(visible(oriented(seq,list[i]))!==list[i].count)return false;return true;}
    function givenCompatible(seq,row){for(var c=0;c<n;c++){var g=source[row][c];if(g&&g!==seq[c])return false;}return true;}

    var base=[];
    function build(pos,usedMask,parksLeft,seq){
      if(pos===n){if(usedMask===full&&parksLeft===0)base.push(seq.slice());return;}
      if(parksLeft>0){seq[pos]=park;build(pos+1,usedMask,parksLeft-1,seq);}
      for(var digit=1;digit<=maxDigit;digit++){var bit=1<<(digit-1);if(usedMask&bit)continue;seq[pos]=digit;build(pos+1,usedMask|bit,parksLeft,seq);}
    }
    build(0,0,parksPerLine,Array(n).fill(0));

    var domains=Array(n);
    for(var r=0;r<n;r++){
      domains[r]=base.filter(function(seq){return givenCompatible(seq,r)&&lineMatchesClues(seq,rowClues[r]);});
      if(!domains[r].length)return 0;
    }

    var assigned=Array(n).fill(null),usedRows=Array(n).fill(false),colMasks=Array(n).fill(0),colParks=Array(n).fill(0),found=0;
    function colPrefixFeasible(col){
      var seq=[];for(var rr=0;rr<n;rr++){if(!assigned[rr])break;seq.push(assigned[rr][col]);}
      if(!seq.length)return true;
      for(var i=0;i<colClues[col].length;i++){
        var cl=colClues[col][i];
        if(cl.side==='top'){
          var vis=0,high=0;for(var k=0;k<seq.length;k++){var v=seq[k];if(v===park)continue;if(v>high){high=v;vis++;}}
          if(vis>cl.count)return false;
          var maxAdditional=Math.min(n-seq.length,Math.max(0,maxDigit-high));
          if(vis+maxAdditional<cl.count)return false;
        }
      }
      return true;
    }
    function completeColumnsValid(){
      for(var c=0;c<n;c++){
        if(colMasks[c]!==full||colParks[c]!==parksPerLine)return false;
        var line=[];for(var r=0;r<n;r++)line.push(assigned[r][c]);
        if(!lineMatchesClues(line,colClues[c]))return false;
      }
      return true;
    }
    function rowFitsColumns(seq){
      for(var c=0;c<n;c++){var v=seq[c];if(v===park){if(colParks[c]>=parksPerLine)return false;}else{var bit=1<<(v-1);if(colMasks[c]&bit)return false;}}
      return true;
    }
    function place(row,seq,delta){
      assigned[row]=delta>0?seq:null;
      for(var c=0;c<n;c++){var v=seq[c];if(v===park)colParks[c]+=delta;else{var bit=1<<(v-1);if(delta>0)colMasks[c]|=bit;else colMasks[c]^=bit;}}
    }
    function visit(row){
      if(found>=limit)return;
      if(row===n){if(completeColumnsValid())found++;return;}
      var domain=domains[row];
      for(var i=0;i<domain.length&&found<limit;i++){
        var seq=domain[i];if(!rowFitsColumns(seq))continue;place(row,seq,1);
        var ok=true;for(var c=0;c<n&&ok;c++)if(!colPrefixFeasible(c))ok=false;
        if(ok)visit(row+1);
        place(row,seq,-1);
      }
    }
    visit(0);return found;
  }

  function countParks2Solutions(source,variant,limit,ignoreClues){
    if(ignoreClues)return countParks2SolutionsCellwise(source,variant,limit,true);
    return countParks2SolutionsByRows(source,variant,limit);
  }`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_SOLVER_PATCH:PASS already-present=false');
