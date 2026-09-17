(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.SkyscraperParksArcRuntime)return;
  var generator=root.SudokuGenerator;
  var fallback=generator.countParkSolutions;
  var baseMake=generator.make;
  var VERIFICATION='skyscraper-parks-arc-exact-v1';
  if(typeof fallback!=='function'||typeof baseMake!=='function')return;
  var cache=new WeakMap();
  function visible(line,park){var max=0,count=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;count++;}}return count;}
  function cluePair(variant,axis,index){var clues=(variant.data&&variant.data.clues)||[],near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom',a=null,b=null;for(var i=0;i<clues.length;i++){var cl=clues[i];if(cl.axis!==axis||cl.index!==index)continue;if(cl.side===near)a=cl.count;else if(cl.side===far)b=cl.count;}if(!Number.isInteger(a)||!Number.isInteger(b))return null;return[a,b];}
  function key(a,b){return a+','+b;}
  function build(variant){
    var n=variant.solution&&variant.solution.length||9,park=(variant.data&&variant.data.parkValue)||n,needed={},rowPairs=Array(n),colPairs=Array(n),i;
    for(i=0;i<n;i++){rowPairs[i]=cluePair(variant,'row',i);colPairs[i]=cluePair(variant,'col',i);if(!rowPairs[i]||!colPairs[i])return null;needed[key(rowPairs[i][0],rowPairs[i][1])]=1;needed[key(colPairs[i][0],colPairs[i][1])]=1;}
    var buckets={};Object.keys(needed).forEach(function(k){buckets[k]=[];});
    var perm=Array(n).fill(0),used=Array(n+1).fill(false);
    function emit(pos){if(pos===n){var a=visible(perm,park),b=visible(perm.slice().reverse(),park),bucket=buckets[key(a,b)];if(bucket)bucket.push(Uint8Array.from(perm));return;}for(var d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
    emit(0);
    return{n:n,rowDomains:rowPairs.map(function(p){return buckets[key(p[0],p[1])];}),colDomains:colPairs.map(function(p){return buckets[key(p[0],p[1])];})};
  }
  function getBuilt(variant){var built=cache.get(variant);if(!built){built=build(variant);if(built)cache.set(variant,built);}return built;}
  function initialActive(domain,line,n){var out=[];outer:for(var i=0;i<domain.length;i++){var p=domain[i];for(var k=0;k<n;k++)if(line[k]&&line[k]!==p[k])continue outer;out.push(i);}return out;}
  function digitSupport(domain,active,pos){var mask=0;for(var i=0;i<active.length;i++)mask|=1<<(domain[active[i]][pos]-1);return mask;}
  function filterLine(domain,active,allowed,n){var next=[];outer:for(var i=0;i<active.length;i++){var p=domain[active[i]];for(var k=0;k<n;k++)if(!(allowed[k]&(1<<(p[k]-1))))continue outer;next.push(active[i]);}return next;}
  function cloneState(state){return{rows:state.rows.map(function(a){return a.slice();}),cols:state.cols.map(function(a){return a.slice();})};}
  function countArc(source,variant,limit,stats){
    var built=getBuilt(variant);if(!built)return fallback(source,variant,limit,false);
    var n=built.n,rowDomains=built.rowDomains,colDomains=built.colDomains;
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;stats.propagationRounds=0;stats.domainPrunes=0;stats.maxDepth=0;
    var state={rows:Array(n),cols:Array(n)};
    for(var r=0;r<n;r++){state.rows[r]=initialActive(rowDomains[r],source[r],n);if(!state.rows[r].length)return 0;}
    for(var c=0;c<n;c++){var line=Array.from({length:n},function(_,rr){return source[rr][c];});state.cols[c]=initialActive(colDomains[c],line,n);if(!state.cols[c].length)return 0;}
    function propagate(s){var changed=true;while(changed){changed=false;stats.propagationRounds++;
      var colSupport=Array.from({length:n},function(_,cc){return Array.from({length:n},function(_,rr){return digitSupport(colDomains[cc],s.cols[cc],rr);});});
      for(var rr=0;rr<n;rr++){var allowed=Array.from({length:n},function(_,cc){return colSupport[cc][rr];}),next=filterLine(rowDomains[rr],s.rows[rr],allowed,n);if(!next.length)return false;if(next.length!==s.rows[rr].length){stats.domainPrunes+=s.rows[rr].length-next.length;s.rows[rr]=next;changed=true;}}
      var rowSupport=Array.from({length:n},function(_,rr){return Array.from({length:n},function(_,cc){return digitSupport(rowDomains[rr],s.rows[rr],cc);});});
      for(var cc=0;cc<n;cc++){var allowedCol=Array.from({length:n},function(_,rr){return rowSupport[rr][cc];}),nextCol=filterLine(colDomains[cc],s.cols[cc],allowedCol,n);if(!nextCol.length)return false;if(nextCol.length!==s.cols[cc].length){stats.domainPrunes+=s.cols[cc].length-nextCol.length;s.cols[cc]=nextCol;changed=true;}}
    }return true;}
    var found=0,cap=limit||2;
    function visit(s,depth){stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(found>=cap)return;if(!propagate(s)){stats.deadEnds++;return;}var axis=null,line=-1,best=Infinity;
      for(var rr=0;rr<n;rr++){var rk=s.rows[rr].length;if(rk>1&&rk<best){axis='row';line=rr;best=rk;}}
      for(var cc=0;cc<n;cc++){var ck=s.cols[cc].length;if(ck>1&&ck<best){axis='col';line=cc;best=ck;}}
      if(axis===null){found++;stats.solutions=found;return;}stats.branches++;
      var choices=(axis==='row'?s.rows[line]:s.cols[line]).slice();for(var i=0;i<choices.length;i++){var child=cloneState(s);if(axis==='row')child.rows[line]=[choices[i]];else child.cols[line]=[choices[i]];visit(child,depth+1);if(found>=cap)return;}
    }
    visit(state,0);stats.solutions=found;return found;
  }
  generator.countParkSolutions=function(source,variant,limit,ignoreClues,stats){
    if(ignoreClues||!variant||variant.kind!=='skyscraperparks')return fallback(source,variant,limit,ignoreClues);
    return countArc(source,variant,limit||2,stats);
  };
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(generator,variant,seed,difficulty);
    if(variant&&variant.id==='skyscraper-parks'&&out&&out.generation)out.generation.verification=VERIFICATION;
    return out;
  };
  root.SkyscraperParksArcRuntime={countArc:countArc,fallback:fallback,verification:VERIFICATION};
})(typeof window!=='undefined'?window:globalThis);
