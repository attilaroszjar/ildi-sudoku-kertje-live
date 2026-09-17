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
if(current.includes('parks2LinePatternCspV9')){
  console.log('SKYSCRAPER_PARKS2_LINE_PATTERN_CSP_V9_PATCH:PASS already-present=true');
  process.exit(0);
}

const replacement=`  var parks2LinePatternCacheV9=null;
  function parks2PreparedLinePatternsV9(variant){
    var d=variant.data||{},n=(variant.solution&&variant.solution.length)||8,park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    var clues=Array.isArray(d.clues)?d.clues:[];
    var key=[n,park,maxDigit,parksPerLine,JSON.stringify(clues.map(function(cl){return [cl.axis,cl.index,cl.side,cl.count];}))].join('|');
    if(parks2LinePatternCacheV9&&parks2LinePatternCacheV9.key===key)return parks2LinePatternCacheV9;
    if(n!==8||maxDigit!==6||parksPerLine!==2)return null;
    var rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    for(var ci=0;ci<clues.length;ci++){var cl=clues[ci];if(cl.axis==='row')rowClues[cl.index].push(cl);else if(cl.axis==='col')colClues[cl.index].push(cl);}
    function visible(seq){return parks2VisibleCount(seq,park);}
    function matches(seq,list){for(var i=0;i<list.length;i++){var cl=list[i],line=(cl.side==='right'||cl.side==='bottom')?seq.slice().reverse():seq;if(visible(line)!==cl.count)return false;}return true;}
    var patterns=[],work=Array(n).fill(0),used=Array(maxDigit+1).fill(false);
    function build(pos,parksLeft){
      if(pos===n){if(parksLeft===0)patterns.push(work.slice());return;}
      if(parksLeft>0){work[pos]=park;build(pos+1,parksLeft-1);}
      for(var digit=1;digit<=maxDigit;digit++)if(!used[digit]){used[digit]=true;work[pos]=digit;build(pos+1,parksLeft);used[digit]=false;}
    }
    build(0,parksPerLine);
    var rowBase=Array(n),colBase=Array(n);
    for(var r=0;r<n;r++){rowBase[r]=[];for(var pi=0;pi<patterns.length;pi++)if(matches(patterns[pi],rowClues[r]))rowBase[r].push(pi);}
    for(var c=0;c<n;c++){colBase[c]=[];for(var pj=0;pj<patterns.length;pj++)if(matches(patterns[pj],colClues[c]))colBase[c].push(pj);}
    parks2LinePatternCacheV9={key:key,n:n,park:park,patterns:patterns,rowBase:rowBase,colBase:colBase};
    return parks2LinePatternCacheV9;
  }

  function countParks2Solutions(source,variant,limit,ignoreClues,forbid){
    if(ignoreClues){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,true);
      throw new Error('Parks2 line-pattern CSP requires cellwise fallback for ignoreClues');
    }
    var prepared=parks2PreparedLinePatternsV9(variant);
    if(!prepared){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,false);
      throw new Error('Parks2 line-pattern CSP requires generic fallback');
    }
    limit=Math.max(1,Number(limit)||2);
    var n=prepared.n,patterns=prepared.patterns,rowDomains=prepared.rowBase.map(function(x){return x.slice();}),colDomains=prepared.colBase.map(function(x){return x.slice();});
    function filterDomain(domain,pos,allowedMask){var out=[];for(var i=0;i<domain.length;i++){var p=patterns[domain[i]],bit=1<<p[pos];if(allowedMask&bit)out.push(domain[i]);}return out;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var g=source[r][c];if(!g)continue;var mask=1<<g;
      rowDomains[r]=filterDomain(rowDomains[r],c,mask);colDomains[c]=filterDomain(colDomains[c],r,mask);
      if(!rowDomains[r].length||!colDomains[c].length)return 0;
    }
    if(forbid){
      var fr=forbid.r,fc=forbid.c,fv=forbid.value,allow=((1<<(prepared.park+1))-2)&~(1<<fv);
      rowDomains[fr]=filterDomain(rowDomains[fr],fc,allow);colDomains[fc]=filterDomain(colDomains[fc],fr,allow);
      if(!rowDomains[fr].length||!colDomains[fc].length)return 0;
    }
    function positionMask(domain,pos){var mask=0;for(var i=0;i<domain.length;i++)mask|=1<<patterns[domain[i]][pos];return mask;}
    function propagate(rows,cols){
      var changed=true;
      while(changed){
        changed=false;
        var rowMasks=Array(n),colMasks=Array(n);
        for(var r=0;r<n;r++){if(!rows[r].length)return false;rowMasks[r]=Array(n);for(var c=0;c<n;c++)rowMasks[r][c]=positionMask(rows[r],c);}
        for(var c=0;c<n;c++){if(!cols[c].length)return false;colMasks[c]=Array(n);for(var r=0;r<n;r++)colMasks[c][r]=positionMask(cols[c],r);}
        for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++){
          var allowed=rowMasks[rr][cc]&colMasks[cc][rr];if(!allowed)return false;
          if(allowed!==rowMasks[rr][cc]){var nr=filterDomain(rows[rr],cc,allowed);if(nr.length!==rows[rr].length){rows[rr]=nr;changed=true;if(!nr.length)return false;}}
          if(allowed!==colMasks[cc][rr]){var nc=filterDomain(cols[cc],rr,allowed);if(nc.length!==cols[cc].length){cols[cc]=nc;changed=true;if(!nc.length)return false;}}
        }
      }
      return true;
    }
    var found=0,deadMemo=new Set();
    function stateKey(rows,cols){var parts=[];for(var i=0;i<n;i++)parts.push('r'+i+':'+rows[i].length+':'+rows[i][0]+':'+rows[i][rows[i].length-1]);for(var j=0;j<n;j++)parts.push('c'+j+':'+cols[j].length+':'+cols[j][0]+':'+cols[j][cols[j].length-1]);return parts.join('|');}
    function visit(rows,cols){
      if(found>=limit)return;
      if(!propagate(rows,cols))return;
      var bestR=-1,bestC=-1,bestMask=0,bestCount=99;
      for(var r=0;r<n;r++)for(var c=0;c<n;c++){
        var mask=positionMask(rows[r],c)&positionMask(cols[c],r),count=bitCount(mask);
        if(count>1&&count<bestCount){bestR=r;bestC=c;bestMask=mask;bestCount=count;if(count===2)break;}
      }
      if(bestR<0){found++;return;}
      var key=stateKey(rows,cols);if(deadMemo.has(key))return;
      var before=found;
      for(var bits=bestMask;bits&&found<limit;bits&=bits-1){
        var one=bits&-bits,nr=rows.map(function(x){return x.slice();}),nc=cols.map(function(x){return x.slice();});
        nr[bestR]=filterDomain(nr[bestR],bestC,one);nc[bestC]=filterDomain(nc[bestC],bestR,one);visit(nr,nc);
      }
      if(found===before)deadMemo.add(key);
    }
    visit(rowDomains,colDomains);
    return found;
  }
  // parks2LinePatternCspV9
`;
text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_LINE_PATTERN_CSP_V9_PATCH:PASS already-present=false');
