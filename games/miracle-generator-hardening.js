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

(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.SkyscraperParksExpertCarveHardening)return;
  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var VERIFICATION='skyscraper-parks-hybrid-exact-v1';
  var POLICY='contract-driven-local-irreducibility';
  var PROOF='monotone-nonuniqueness-from-single-pass';
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function clueCount(grid){var count=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])count++;return count;}
  function carveExpert(out){
    if(!out||!out.puzzle||!out.generation)throw new Error('Skyscraper Parks expert source missing generation payload');
    if(typeof generator.countParkSolutions!=='function')throw new Error('Skyscraper Parks exact verifier unavailable');
    var grid=cloneGrid(out.puzzle),n=grid.length,order=[];
    var actualSeed=Number.isInteger(out.generation.actualSeed)?out.generation.actualSeed:(out.generation.seed>>>0);
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
    shuffle(order,rng((actualSeed^0x4C4F4341)>>>0));
    var startClues=order.length,accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];
      if(!old)continue;grid[rr][cc]=0;
      if(generator.countParkSolutions(grid,out,2,false)===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalClues=clueCount(grid);
    if(generator.countParkSolutions(grid,out,2,false)!==1)throw new Error('Skyscraper Parks contract carve lost uniqueness');
    if(generator.countParkSolutions(grid,out,2,true)<=1)throw new Error('Skyscraper Parks contract carve lost variant essentiality');
    out.puzzle=grid;
    out.generation=Object.assign({},out.generation,{clues:finalClues,sourceClues:startClues,acceptedRemovals:accepted,rejectedRemovals:rejected,policy:POLICY,verification:VERIFICATION,locallyIrreducibleUnderProductionContract:true,localIrreducibilityProof:PROOF,generatorFamily:'skyscraper-parks-contract-driven-expert-carve',difficultyCalibration:Object.assign({},out.generation.difficultyCalibration||{},{sourceClues:startClues,targetClues:null,stopCondition:'no-remaining-single-clue-removal-preserves-variant-uniqueness',clueFloor:false,runtimeCutoff:false})});
    return out;
  }
  generator.make=function(variant,seed,difficulty){var out=baseMake.call(generator,variant,seed,difficulty);if(variant&&variant.id==='skyscraper-parks'&&difficulty==='expert')return carveExpert(out);return out;};
  root.SkyscraperParksExpertCarveHardening={verification:VERIFICATION,policy:POLICY,proof:PROOF,clueFloor:false,runtimeCutoff:false};
})(typeof window!=='undefined'?window:globalThis);

(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.MiracleGeneratorHardening)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  var MAX_ATTEMPTS=12,NODE_LIMIT=200000;
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function valid(grid,r,c,value){
    var dr,dc,rr,cc,other;
    for(dr=-1;dr<=1;dr++)for(dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;rr=r+dr;cc=c+dc;
      if(rr>=0&&rr<9&&cc>=0&&cc<9&&grid[rr][cc]===value)return false;
    }
    var km=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
    for(var i=0;i<km.length;i++){rr=r+km[i][0];cc=c+km[i][1];if(rr>=0&&rr<9&&cc>=0&&cc<9&&grid[rr][cc]===value)return false;}
    var orth=[[1,0],[-1,0],[0,1],[0,-1]];
    for(i=0;i<orth.length;i++){rr=r+orth[i][0];cc=c+orth[i][1];if(rr<0||rr>=9||cc<0||cc>=9)continue;other=grid[rr][cc];if(other&&Math.abs(other-value)===1)return false;}
    return true;
  }
  function seededSolution(seed,nodeLimit){
    var grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,nodes=0,random=rng((seed^0x4D495241)>>>0),solved=false;
    function candidates(r,c){var box=Math.floor(r/3)*3+Math.floor(c/3),mask=full&~(rows[r]|cols[c]|boxes[box]),out=[];for(var m=mask;m;m&=m-1){var one=m&-m,d=1+Math.round(Math.log(one)/Math.LN2);if(valid(grid,r,c,d))out.push(d);}return out;}
    function visit(){
      if(solved||nodes++>=nodeLimit)return;
      var bestLength=10,ties=[];
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var cand=candidates(r,c);
        if(!cand.length)return;
        if(cand.length<bestLength){bestLength=cand.length;ties=[{r:r,c:c,cand:cand}];}
        else if(cand.length===bestLength)ties.push({r:r,c:c,cand:cand});
      }
      if(!ties.length){solved=true;return;}
      var chosen=ties[Math.floor(random()*ties.length)],br=chosen.r,bc=chosen.c,best=chosen.cand;
      shuffle(best,random);var box=Math.floor(br/3)*3+Math.floor(bc/3);
      for(var i=0;i<best.length&&!solved;i++){
        var d=best[i],one=1<<(d-1);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;
        visit();
        if(!solved){rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;}
      }
    }
    visit();return solved?{solution:grid,nodes:nodes,cellTieBreak:'seeded-mrv-ties'}:null;
  }
  function makeMiracle(variant,seed,difficulty){
    var requested=seed>>>0;
    for(var attempt=0;attempt<MAX_ATTEMPTS;attempt++){
      var actual=(requested^0x4D495241^Math.imul(attempt+1,0x9E3779B1))>>>0,built=seededSolution(actual,NODE_LIMIT);if(!built)continue;
      var working=clone(variant);working.solution=built.solution;
      if(generator.countVariantSolutions(working.solution,working,2)!==1)continue;
      var out=baseMake.call(generator,working,actual,difficulty),g=out&&out.generation;if(!g||g.unique!==true||g.variantEssential!==true)continue;
      if(generator.countVariantSolutions(out.puzzle,out,2)!==1||generator.countSolutions(out.puzzle,2)<=1)continue;
      out.solution=built.solution;out.generation=Object.assign({},g,{seed:requested,requestedSeed:requested,actualSeed:actual,solutionAttempt:attempt,solutionNodes:built.nodes,solutionNodeLimit:NODE_LIMIT,maxSolutionAttempts:MAX_ATTEMPTS,solutionCellTieBreak:built.cellTieBreak,generatorFamily:'miracle-seeded-full-solution-exact-verified'});return out;
    }
    throw new Error('Miracle generation exhausted after '+MAX_ATTEMPTS+' deterministic attempts');
  }
  generator.make=function(variant,seed,difficulty){if(variant&&variant.id==='miracle')return makeMiracle(variant,seed>>>0,difficulty||'focused');return baseMake.call(generator,variant,seed,difficulty);};
  generator.makeSeededMiracleSolution=seededSolution;
  root.MiracleGeneratorHardening={maxAttempts:MAX_ATTEMPTS,nodeLimit:NODE_LIMIT,cellTieBreak:'seeded-mrv-ties'};
})(typeof window!=='undefined'?window:globalThis);
