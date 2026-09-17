(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.SkyscraperParksHybridRuntime)return;
  var generator=root.SudokuGenerator;
  var legacyCount=generator.countParkSolutions;
  if(typeof legacyCount!=='function')return;
  var THRESHOLD=15;
  var cache=new WeakMap();
  function bitCount(x){var c=0;while(x){x&=x-1;c++;}return c;}
  function clueCount(grid){var n=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])n++;return n;}
  function visible(line,park){var max=0,count=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;count++;}}return count;}
  function cluePair(variant,axis,index){var clues=(variant.data&&variant.data.clues)||[],near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom',a=null,b=null;for(var i=0;i<clues.length;i++){var cl=clues[i];if(cl.axis!==axis||cl.index!==index)continue;if(cl.side===near)a=cl.count;else if(cl.side===far)b=cl.count;}if(!Number.isInteger(a)||!Number.isInteger(b))return null;return[a,b];}
  function key(a,b){return a+','+b;}
  function build(variant){
    var n=variant.solution&&variant.solution.length||9,park=(variant.data&&variant.data.parkValue)||n,needed={},i;
    var rowPairs=Array(n),colPairs=Array(n);
    for(i=0;i<n;i++){rowPairs[i]=cluePair(variant,'row',i);colPairs[i]=cluePair(variant,'col',i);if(!rowPairs[i]||!colPairs[i])return null;needed[key(rowPairs[i][0],rowPairs[i][1])]=1;needed[key(colPairs[i][0],colPairs[i][1])]=1;}
    var buckets={};Object.keys(needed).forEach(function(k){buckets[k]=[];});
    var perm=Array(n).fill(0),used=Array(n+1).fill(false);
    function emit(pos){if(pos===n){var a=visible(perm,park),rev=perm.slice().reverse(),b=visible(rev,park),bucket=buckets[key(a,b)];if(bucket)bucket.push(Uint8Array.from(perm));return;}for(var d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
    emit(0);
    function buildIndex(domain){var wordCount=Math.ceil(domain.length/32),all=new Uint32Array(wordCount),byPos=Array.from({length:n},function(){return Array.from({length:n+1},function(){return new Uint32Array(wordCount);});});for(var j=0;j<domain.length;j++){all[j>>>5]|=1<<(j&31);for(var p=0;p<n;p++)byPos[p][domain[j][p]][j>>>5]|=1<<(j&31);}return{all:all,byPos:byPos,wordCount:wordCount};}
    return{n:n,park:park,full:(1<<n)-1,rowIndex:rowPairs.map(function(p){return buildIndex(buckets[key(p[0],p[1])]);}),colIndex:colPairs.map(function(p){return buildIndex(buckets[key(p[0],p[1])]);})};
  }
  function getBuilt(variant){var built=cache.get(variant);if(!built){built=build(variant);if(built)cache.set(variant,built);}return built;}
  function cloneBits(bits){return bits.slice();}
  function intersect(bits,mask){var any=false;for(var w=0;w<bits.length;w++){bits[w]&=mask[w];if(bits[w])any=true;}return any;}
  function supportMask(active,index,pos,n){var mask=0;for(var d=1;d<=n;d++){var hit=index.byPos[pos][d];for(var w=0;w<active.length;w++)if(active[w]&hit[w]){mask|=1<<(d-1);break;}}return mask;}
  function buildSupport(active,index,line,n){var out=Array(n).fill(0);for(var p=0;p<n;p++)out[p]=line[p]?1<<(line[p]-1):supportMask(active,index,p,n);return out;}
  function countSparse(source,variant,limit){
    var built=getBuilt(variant);if(!built)return legacyCount(source,variant,limit,false);
    var n=built.n,full=built.full,grid=source.map(function(r){return r.slice();}),rowActive=built.rowIndex.map(function(x){return cloneBits(x.all);}),colActive=built.colIndex.map(function(x){return cloneBits(x.all);});
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var v=grid[r][c];if(!v)continue;if(!intersect(rowActive[r],built.rowIndex[r].byPos[c][v]))return 0;if(!intersect(colActive[c],built.colIndex[c].byPos[r][v]))return 0;}
    var rowCache=Array(n),colCache=Array(n);
    for(r=0;r<n;r++)rowCache[r]=buildSupport(rowActive[r],built.rowIndex[r],grid[r],n);
    for(c=0;c<n;c++){var line=Array.from({length:n},function(_,rr){return grid[rr][c];});colCache[c]=buildSupport(colActive[c],built.colIndex[c],line,n);}
    var found=0;
    function visit(){
      if(found>=limit)return;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){var mask=rowCache[rr][cc]&colCache[cc][rr]&full,count=bitCount(mask);if(!count)return;if(count<best){br=rr;bc=cc;bm=mask;best=count;if(count===1)break;}}
      if(br<0){found++;return;}
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2),prevRA=rowActive[br],prevCA=colActive[bc],prevRC=rowCache[br],prevCC=colCache[bc],nextR=cloneBits(prevRA),nextC=cloneBits(prevCA);if(intersect(nextR,built.rowIndex[br].byPos[bc][d])&&intersect(nextC,built.colIndex[bc].byPos[br][d])){grid[br][bc]=d;rowActive[br]=nextR;colActive[bc]=nextC;rowCache[br]=buildSupport(nextR,built.rowIndex[br],grid[br],n);var colLine=Array.from({length:n},function(_,x){return grid[x][bc];});colCache[bc]=buildSupport(nextC,built.colIndex[bc],colLine,n);visit();grid[br][bc]=0;rowActive[br]=prevRA;colActive[bc]=prevCA;rowCache[br]=prevRC;colCache[bc]=prevCC;}if(found>=limit)return;}
    }
    visit();return found;
  }
  generator.countParkSolutions=function(source,variant,limit,ignoreClues){
    if(ignoreClues||!variant||variant.kind!=='skyscraperparks'||clueCount(source)>THRESHOLD)return legacyCount(source,variant,limit,ignoreClues);
    return countSparse(source,variant,limit||2);
  };
  root.SkyscraperParksHybridRuntime={threshold:THRESHOLD,legacyCount:legacyCount,countSparse:countSparse,clueCount:clueCount};
})(typeof window!=='undefined'?window:globalThis);
