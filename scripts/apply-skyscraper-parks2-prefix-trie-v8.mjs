import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  var parks2DomainCacheV7=');
const end=text.indexOf('\n  function makeParks2Puzzle',start);
if(start<0||end<0)throw new Error('Parks2 v7 solver block not found');
const current=text.slice(start,end);
if(current.includes('parks2PrefixTrieV8')){
  console.log('SKYSCRAPER_PARKS2_PREFIX_TRIE_V8_PATCH:PASS already-present=true');
  process.exit(0);
}
if(!current.includes('parks2DomainCacheV7'))throw new Error('Parks2 domain cache v7 solver not found');

const replacement=`  var parks2PrefixTrieCacheV8=null;
  function parks2PreparedTrieV8(variant){
    var d=variant.data||{},n=(variant.solution&&variant.solution.length)||8,park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    var clues=Array.isArray(d.clues)?d.clues:[];
    var clueKey=JSON.stringify(clues.map(function(cl){return [cl.axis,cl.index,cl.side,cl.count];}));
    var key=[n,park,maxDigit,parksPerLine,clueKey].join('|');
    if(parks2PrefixTrieCacheV8&&parks2PrefixTrieCacheV8.key===key)return parks2PrefixTrieCacheV8;
    if(n!==8||maxDigit!==6||parksPerLine!==2)return null;

    var rowClues=Array.from({length:n},function(){return [];});
    var colClues=Array.from({length:n},function(){return [];});
    for(var ci=0;ci<clues.length;ci++){
      var cl=clues[ci];
      if(cl.axis==='row')rowClues[cl.index].push(cl);
      else if(cl.axis==='col')colClues[cl.index].push(cl);
    }
    function visible(seq){return parks2VisibleCount(seq,park);}
    function matches(seq,list){
      for(var i=0;i<list.length;i++){
        var cl=list[i],line=seq;
        if(cl.side==='right'||cl.side==='bottom')line=seq.slice().reverse();
        if(visible(line)!==cl.count)return false;
      }
      return true;
    }

    var patterns=[],work=Array(n).fill(0),used=Array(maxDigit+1).fill(false);
    function build(pos,parksLeft){
      if(pos===n){if(parksLeft===0)patterns.push(work.slice());return;}
      if(parksLeft>0){work[pos]=park;build(pos+1,parksLeft-1);}
      for(var digit=1;digit<=maxDigit;digit++)if(!used[digit]){
        used[digit]=true;work[pos]=digit;build(pos+1,parksLeft);used[digit]=false;
      }
    }
    build(0,parksPerLine);

    var rowBase=Array(n);
    for(var r=0;r<n;r++){
      var rows=[];for(var ri=0;ri<patterns.length;ri++)if(matches(patterns[ri],rowClues[r]))rows.push(patterns[ri]);
      if(!rows.length)return null;rowBase[r]=rows;
    }

    function makeTrie(list){
      var nodes=[{next:Array(park+1).fill(-1)}];
      for(var i=0;i<list.length;i++){
        var node=0,p=list[i];
        for(var pos=0;pos<n;pos++){
          var value=p[pos],next=nodes[node].next[value];
          if(next<0){next=nodes.length;nodes[node].next[value]=next;nodes.push({next:Array(park+1).fill(-1)});}
          node=next;
        }
      }
      return nodes;
    }
    var colTries=Array(n);
    for(var c=0;c<n;c++){
      var cols=[];for(var pi=0;pi<patterns.length;pi++)if(matches(patterns[pi],colClues[c]))cols.push(patterns[pi]);
      if(!cols.length)return null;colTries[c]=makeTrie(cols);
    }

    parks2PrefixTrieCacheV8={key:key,n:n,park:park,maxDigit:maxDigit,rowBase:rowBase,colTries:colTries};
    return parks2PrefixTrieCacheV8;
  }

  function countParks2Solutions(source,variant,limit,ignoreClues,forbid){
    if(ignoreClues){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,true);
      throw new Error('Parks2 trie solver requires cellwise fallback for ignoreClues');
    }
    var prepared=parks2PreparedTrieV8(variant);
    if(!prepared){
      if(typeof countParks2SolutionsCellwise==='function')return countParks2SolutionsCellwise(source,variant,limit,false);
      throw new Error('Parks2 trie solver requires generic fallback');
    }
    limit=Math.max(1,Number(limit)||2);
    var n=prepared.n,rowDomains=Array(n),colTries=prepared.colTries;
    for(var r=0;r<n;r++){
      var base=prepared.rowBase[r],list=[];
      outer:for(var i=0;i<base.length;i++){
        var p=base[i];
        for(var c=0;c<n;c++){
          var g=source[r][c];if(g&&g!==p[c])continue outer;
          if(forbid&&r===forbid.r&&c===forbid.c&&p[c]===forbid.value)continue outer;
        }
        list.push(p);
      }
      if(!list.length)return 0;rowDomains[r]=list;
    }

    var found=0,memo=Array.from({length:n},function(){return new Set();});
    function visit(row,states){
      if(found>=limit)return;
      if(row===n){found++;return;}
      var key=states.join(',');
      if(memo[row].has(key))return;
      var before=found,domain=rowDomains[row];
      for(var di=0;di<domain.length&&found<limit;di++){
        var p=domain[di],nextStates=Array(n),ok=true;
        for(var c=0;c<n;c++){
          var next=colTries[c][states[c]].next[p[c]];
          if(next<0){ok=false;break;}
          nextStates[c]=next;
        }
        if(ok)visit(row+1,nextStates);
      }
      if(found===before)memo[row].add(key);
    }
    visit(0,Array(n).fill(0));
    return found;
  }
  // parks2AlternativeWitnessV6
  // parks2DomainCacheV7
  // parks2PrefixTrieV8
`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_PREFIX_TRIE_V8_PATCH:PASS already-present=false');
