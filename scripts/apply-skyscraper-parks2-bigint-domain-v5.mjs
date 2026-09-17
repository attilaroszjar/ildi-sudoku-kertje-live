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
if(current.includes('parks2BigIntDomainV5')){
  console.log('SKYSCRAPER_PARKS2_BIGINT_DOMAIN_V5_PATCH:PASS already-present=true');
  process.exit(0);
}

const replacement=`  function countParks2Solutions(source,variant,limit,ignoreClues){
    var n=source.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    if(ignoreClues){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,true);
      throw new Error('Parks2 BigInt solver requires cellwise fallback for ignoreClues');
    }
    if(n!==8||maxDigit!==6||parksPerLine!==2){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,false);
      throw new Error('Parks2 BigInt solver requires generic fallback for non-8x8 variants');
    }
    limit=Math.max(1,Number(limit)||2);
    var clues=Array.isArray(d.clues)?d.clues:[];
    var rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    for(var ci=0;ci<clues.length;ci++){
      var cl=clues[ci];
      if(cl.axis==='row')rowClues[cl.index].push(cl);
      else if(cl.axis==='col')colClues[cl.index].push(cl);
    }
    function visible(seq){return parks2VisibleCount(seq,park);}
    function oriented(seq,cl){var out=seq.slice();if(cl.side==='right'||cl.side==='bottom')out.reverse();return out;}
    function matchesClues(seq,list){for(var i=0;i<list.length;i++)if(visible(oriented(seq,list[i]))!==list[i].count)return false;return true;}
    function matchesRowGivens(seq,row){for(var c=0;c<n;c++){var g=source[row][c];if(g&&g!==seq[c])return false;}return true;}
    function matchesColGivens(seq,col){for(var r=0;r<n;r++){var g=source[r][col];if(g&&g!==seq[r])return false;}return true;}

    var patterns=[],work=Array(n).fill(0),used=Array(maxDigit+1).fill(false);
    function build(pos,parksLeft){
      if(pos===n){if(parksLeft===0)patterns.push(work.slice());return;}
      if(parksLeft>0){work[pos]=park;build(pos+1,parksLeft-1);}
      for(var digit=1;digit<=maxDigit;digit++)if(!used[digit]){used[digit]=true;work[pos]=digit;build(pos+1,parksLeft);used[digit]=false;}
    }
    build(0,parksPerLine);

    var compat=Array.from({length:n},function(){return Array(maxDigit+2).fill(0n);});
    for(var pi=0;pi<patterns.length;pi++){
      var bit=1n<<BigInt(pi),p=patterns[pi];
      for(var pos=0;pos<n;pos++)compat[pos][p[pos]]|=bit;
    }

    var rowDomains=Array(n),colDomains=Array(n);
    for(var r=0;r<n;r++){
      var list=[];
      for(var i=0;i<patterns.length;i++)if(matchesRowGivens(patterns[i],r)&&matchesClues(patterns[i],rowClues[r]))list.push(i);
      if(!list.length)return 0;rowDomains[r]=list;
    }
    for(var c=0;c<n;c++){
      var mask=0n;
      for(var j=0;j<patterns.length;j++)if(matchesColGivens(patterns[j],c)&&matchesClues(patterns[j],colClues[c]))mask|=1n<<BigInt(j);
      if(mask===0n)return 0;colDomains[c]=mask;
    }

    var rowOrder=Array.from({length:n},function(_,i){return i;}).sort(function(a,b){return rowDomains[a].length-rowDomains[b].length;});
    var found=0;
    function visit(depth,currentCols){
      if(found>=limit)return;
      if(depth===n){found++;return;}
      var row=rowOrder[depth],domain=rowDomains[row];
      for(var di=0;di<domain.length&&found<limit;di++){
        var p=patterns[domain[di]],next=Array(n),ok=true;
        for(var c=0;c<n;c++){
          var m=currentCols[c]&compat[row][p[c]];
          if(m===0n){ok=false;break;}
          next[c]=m;
        }
        if(ok)visit(depth+1,next);
      }
    }
    visit(0,colDomains);
    return found;
  }
  // parks2BigIntDomainV5
`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_BIGINT_DOMAIN_V5_PATCH:PASS already-present=false');
