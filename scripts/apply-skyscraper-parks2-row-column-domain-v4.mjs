import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function countParks2Solutions(source,variant,limit,ignoreClues){');
const end=text.indexOf('\n  function makeParks2Puzzle',start);
if(start<0||end<0)throw new Error('Parks2 solver block not found');
const current=text.slice(start,end);
if(current.includes('parks2RowColumnDomainV4')){
  console.log('SKYSCRAPER_PARKS2_ROW_COLUMN_DOMAIN_V4_PATCH:PASS already-present=true');
  process.exit(0);
}

const replacement=`  function countParks2Solutions(source,variant,limit,ignoreClues){
    var n=source.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    if(n!==8||maxDigit!==6||parksPerLine!==2){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,ignoreClues);
      throw new Error('Parks2 row-column domain solver requires the generic fallback for non-8x8 variants');
    }
    var clues=Array.isArray(d.clues)?d.clues:[];
    var rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    if(!ignoreClues){
      for(var ci=0;ci<clues.length;ci++){
        var cl=clues[ci];
        if(cl.axis==='row')rowClues[cl.index].push(cl);
        else if(cl.axis==='col')colClues[cl.index].push(cl);
      }
    }
    function visible(seq){return parks2VisibleCount(seq,park);}
    function oriented(seq,cl){var out=seq.slice();if(cl.side==='right'||cl.side==='bottom')out.reverse();return out;}
    function matchesClues(seq,list){for(var i=0;i<list.length;i++)if(visible(oriented(seq,list[i]))!==list[i].count)return false;return true;}
    function matchesGivensRow(seq,row){for(var c=0;c<n;c++){var g=source[row][c];if(g&&g!==seq[c])return false;}return true;}
    function matchesGivensCol(seq,col){for(var r=0;r<n;r++){var g=source[r][col];if(g&&g!==seq[r])return false;}return true;}

    var patterns=[],work=Array(n).fill(0),used=Array(maxDigit+1).fill(false);
    function build(pos,parksLeft){
      if(pos===n){if(parksLeft===0)patterns.push(work.slice());return;}
      if(parksLeft>0){work[pos]=park;build(pos+1,parksLeft-1);}
      for(var digit=1;digit<=maxDigit;digit++)if(!used[digit]){used[digit]=true;work[pos]=digit;build(pos+1,parksLeft);used[digit]=false;}
    }
    build(0,parksPerLine);

    var rowDomains=Array(n),colDomains=Array(n);
    for(var r=0;r<n;r++){
      rowDomains[r]=patterns.filter(function(p){return matchesGivensRow(p,r)&&matchesClues(p,rowClues[r]);});
      if(!rowDomains[r].length)return 0;
    }
    for(var c=0;c<n;c++){
      colDomains[c]=patterns.filter(function(p){return matchesGivensCol(p,c)&&matchesClues(p,colClues[c]);});
      if(!colDomains[c].length)return 0;
    }

    var rowOrder=Array.from({length:n},function(_,i){return i;}).sort(function(a,b){return rowDomains[a].length-rowDomains[b].length;});
    var assignedRows=Array(n).fill(null),found=0;

    function filterColumnDomain(domain,row,value){
      var out=[];for(var i=0;i<domain.length;i++)if(domain[i][row]===value)out.push(domain[i]);return out;
    }
    function visit(depth,currentColDomains){
      if(found>=limit)return;
      if(depth===n){found++;return;}
      var row=rowOrder[depth],domain=rowDomains[row];
      for(var pi=0;pi<domain.length&&found<limit;pi++){
        var pattern=domain[pi],nextDomains=Array(n),ok=true;
        for(var c=0;c<n;c++){
          var filtered=filterColumnDomain(currentColDomains[c],row,pattern[c]);
          if(!filtered.length){ok=false;break;}
          nextDomains[c]=filtered;
        }
        if(!ok)continue;
        assignedRows[row]=pattern;
        visit(depth+1,nextDomains);
        assignedRows[row]=null;
      }
    }
    visit(0,colDomains);
    return found;
  }
  // parks2RowColumnDomainV4
`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_ROW_COLUMN_DOMAIN_V4_PATCH:PASS already-present=false');
