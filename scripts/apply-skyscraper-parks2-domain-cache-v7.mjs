import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function countParks2Solutions(source,variant,limit,ignoreClues');
const end=text.indexOf('\n  function makeParks2Puzzle',start);
if(start<0||end<0)throw new Error('Parks2 solver block not found');
const current=text.slice(start,end);
if(current.includes('parks2DomainCacheV7')){
  console.log('SKYSCRAPER_PARKS2_DOMAIN_CACHE_V7_PATCH:PASS already-present=true');
  process.exit(0);
}
if(!current.includes('parks2AlternativeWitnessV6'))throw new Error('Parks2 alternative-witness v6 solver not found');

const replacement=`  var parks2DomainCacheV7=null;
  function parks2PreparedDomainsV7(variant){
    var d=variant.data||{},n=(variant.solution&&variant.solution.length)||8,park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    var clues=Array.isArray(d.clues)?d.clues:[];
    var clueKey=JSON.stringify(clues.map(function(cl){return [cl.axis,cl.index,cl.side,cl.count];}));
    var key=[n,park,maxDigit,parksPerLine,clueKey].join('|');
    if(parks2DomainCacheV7&&parks2DomainCacheV7.key===key)return parks2DomainCacheV7;
    if(n!==8||maxDigit!==6||parksPerLine!==2)return null;

    var rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    for(var ci=0;ci<clues.length;ci++){
      var cl=clues[ci];
      if(cl.axis==='row')rowClues[cl.index].push(cl);
      else if(cl.axis==='col')colClues[cl.index].push(cl);
    }
    function visible(seq){return parks2VisibleCount(seq,park);}
    function oriented(seq,cl){var out=seq.slice();if(cl.side==='right'||cl.side==='bottom')out.reverse();return out;}
    function matches(seq,list){for(var i=0;i<list.length;i++)if(visible(oriented(seq,list[i]))!==list[i].count)return false;return true;}

    var patterns=[],work=Array(n).fill(0),used=Array(maxDigit+1).fill(false);
    function build(pos,parksLeft){
      if(pos===n){if(parksLeft===0)patterns.push(work.slice());return;}
      if(parksLeft>0){work[pos]=park;build(pos+1,parksLeft-1);}
      for(var digit=1;digit<=maxDigit;digit++)if(!used[digit]){used[digit]=true;work[pos]=digit;build(pos+1,parksLeft);used[digit]=false;}
    }
    build(0,parksPerLine);

    var compat=Array.from({length:n},function(){return Array(park+1).fill(0n);});
    var allMask=0n;
    for(var pi=0;pi<patterns.length;pi++){
      var bit=1n<<BigInt(pi),p=patterns[pi];allMask|=bit;
      for(var pos=0;pos<n;pos++)compat[pos][p[pos]]|=bit;
    }
    var rowBase=Array(n).fill(0n),colBase=Array(n).fill(0n);
    for(var r=0;r<n;r++){
      var rm=0n;for(var ri=0;ri<patterns.length;ri++)if(matches(patterns[ri],rowClues[r]))rm|=1n<<BigInt(ri);rowBase[r]=rm;
    }
    for(var c=0;c<n;c++){
      var cm=0n;for(var cj=0;cj<patterns.length;cj++)if(matches(patterns[cj],colClues[c]))cm|=1n<<BigInt(cj);colBase[c]=cm;
    }
    parks2DomainCacheV7={key:key,n:n,park:park,maxDigit:maxDigit,patterns:patterns,compat:compat,allMask:allMask,rowBase:rowBase,colBase:colBase};
    return parks2DomainCacheV7;
  }

  function countParks2Solutions(source,variant,limit,ignoreClues,forbid){
    if(ignoreClues){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,true);
      throw new Error('Parks2 cached solver requires cellwise fallback for ignoreClues');
    }
    var prepared=parks2PreparedDomainsV7(variant);
    if(!prepared){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,false);
      throw new Error('Parks2 cached solver requires generic fallback');
    }
    limit=Math.max(1,Number(limit)||2);
    var n=prepared.n,patterns=prepared.patterns,compat=prepared.compat,allMask=prepared.allMask;
    var rowDomains=prepared.rowBase.slice(),colDomains=prepared.colBase.slice();

    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var g=source[r][c];
      if(g){rowDomains[r]&=compat[c][g];colDomains[c]&=compat[r][g];}
    }
    if(forbid){
      var fr=forbid.r,fc=forbid.c,fv=forbid.value;
      var allowedRow=allMask^compat[fc][fv],allowedCol=allMask^compat[fr][fv];
      rowDomains[fr]&=allowedRow;colDomains[fc]&=allowedCol;
    }
    for(var q=0;q<n;q++)if(rowDomains[q]===0n||colDomains[q]===0n)return 0;

    function bitsToIndices(mask){var out=[];for(var i=0;i<patterns.length;i++)if(mask&(1n<<BigInt(i)))out.push(i);return out;}
    var rowLists=Array(n);for(var rr=0;rr<n;rr++)rowLists[rr]=bitsToIndices(rowDomains[rr]);
    var rowOrder=Array.from({length:n},function(_,i){return i;}).sort(function(a,b){return rowLists[a].length-rowLists[b].length;});
    var found=0;
    function visit(depth,currentCols){
      if(found>=limit)return;
      if(depth===n){found++;return;}
      var row=rowOrder[depth],domain=rowLists[row];
      for(var di=0;di<domain.length&&found<limit;di++){
        var p=patterns[domain[di]],next=Array(n),ok=true;
        for(var cc=0;cc<n;cc++){
          var m=currentCols[cc]&compat[row][p[cc]];
          if(m===0n){ok=false;break;}
          next[cc]=m;
        }
        if(ok)visit(depth+1,next);
      }
    }
    visit(0,colDomains);
    return found;
  }
  // parks2AlternativeWitnessV6
  // parks2DomainCacheV7
`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_DOMAIN_CACHE_V7_PATCH:PASS already-present=false');
