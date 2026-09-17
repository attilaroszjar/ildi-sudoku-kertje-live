(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[5,6,7,8];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){
    var x=seed>>>0;
    return function(){
      x=(x+0x6D2B79F5)>>>0;
      var t=x;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function shuffle(a,random){
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(random()*(i+1));
      var t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }

  function components(grid){
    var n=grid.length,seen={},out=[],dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var v=grid[r][c],key=r+','+c;
      if(!v||seen[key])continue;
      var q=[[r,c]],cells=[];seen[key]=1;
      while(q.length){
        var p=q.pop();cells.push(p);
        for(var d=0;d<dirs.length;d++){
          var rr=p[0]+dirs[d][0],cc=p[1]+dirs[d][1],k=rr+','+cc;
          if(rr>=0&&cc>=0&&rr<n&&cc<n&&!seen[k]&&grid[rr][cc]===v){
            seen[k]=1;q.push([rr,cc]);
          }
        }
      }
      out.push({value:v,cells:cells});
    }
    return out;
  }

  function fullValid(grid){
    if(grid.some(function(row){return row.some(function(v){return !v;});}))return false;
    var cs=components(grid);
    for(var i=0;i<cs.length;i++)if(cs[i].cells.length!==cs[i].value)return false;
    return true;
  }

  function targetClues(n,difficulty){
    var total=n*n;
    if(difficulty==='gentle')return Math.max(n,Math.round(total*0.76));
    if(difficulty==='expert')return Math.max(n,Math.round(total*0.52));
    return Math.max(n,Math.round(total*0.63));
  }

  function rowPatterns(n){
    var out=[];
    function visit(left,parts){
      if(left===0){
        var row=[];
        for(var i=0;i<parts.length;i++)for(var j=0;j<parts[i];j++)row.push(parts[i]);
        out.push(row);return;
      }
      for(var size=1;size<=Math.min(6,left);size++){
        if(parts.length&&parts[parts.length-1]===size)continue;
        parts.push(size);visit(left-size,parts);parts.pop();
      }
    }
    visit(n,[]);return out;
  }

  var patternCache={};
  function patternsFor(n){if(!patternCache[n])patternCache[n]=rowPatterns(n);return patternCache[n];}

  function transformGrid(grid,turns,mirror){
    var out=clone(grid),n=out.length;
    if(mirror)out=out.map(function(row){return row.slice().reverse();});
    for(var t=0;t<turns;t++){
      var next=Array.from({length:n},function(){return Array(n).fill(0);});
      for(var r=0;r<n;r++)for(var c=0;c<n;c++)next[c][n-1-r]=out[r][c];
      out=next;
    }
    return out;
  }

  function buildSolution(n,random){
    var patterns=patternsFor(n),rows=[];
    if(!patterns.length)return null;
    function compatible(a,b){if(!a)return true;for(var c=0;c<n;c++)if(a[c]===b[c])return false;return true;}
    function visit(r){
      if(r===n)return true;
      var choices=shuffle(patterns.slice(),random);
      for(var i=0;i<choices.length;i++){
        var row=choices[i];if(!compatible(rows[r-1],row))continue;
        rows.push(row.slice());if(visit(r+1))return true;rows.pop();
      }
      return false;
    }
    if(!visit(0))return null;
    var transformed=transformGrid(rows,Math.floor(random()*4),random()<0.5);
    return fullValid(transformed)?transformed:null;
  }

  var regionUniverseCache=new Map();
  function regionUniverse(n,maxValue){
    var bySize=Array.from({length:maxValue+1},function(){return [];});
    function cellBit(i){return 1n<<BigInt(i);}
    var neighbors=Array.from({length:n*n},function(_,i){
      var r=Math.floor(i/n),c=i%n,out=[];
      if(r>0)out.push(i-n);if(r+1<n)out.push(i+n);if(c>0)out.push(i-1);if(c+1<n)out.push(i+1);return out;
    });
    for(var k=1;k<=maxValue;k++){
      var current=new Map();
      for(var i=0;i<n*n;i++){var m=cellBit(i);current.set(m.toString(),m);}
      if(k===1){bySize[k]=Array.from(current.values());continue;}
      for(var step=1;step<k;step++){
        var next=new Map();
        current.forEach(function(mask){
          var frontier=0n;
          for(var x=0;x<n*n;x++)if(mask&cellBit(x)){
            var ns=neighbors[x];for(var y=0;y<ns.length;y++)frontier|=cellBit(ns[y]);
          }
          frontier&=~mask;
          for(var j=0;j<n*n;j++)if(frontier&cellBit(j)){
            var nm=mask|cellBit(j),key=nm.toString();if(!next.has(key))next.set(key,nm);
          }
        });
        current=next;
      }
      bySize[k]=Array.from(current.values());
    }
    return {bySize:bySize,neighbors:neighbors,cellBit:cellBit};
  }

  function countRegionExact(puzzle,limit,stats){
    limit=Math.max(1,Number(limit)||2);stats=stats||{};
    var n=puzzle.length,maxClue=1;
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)maxClue=Math.max(maxClue,Number(puzzle[r][c])||0);
    var maxValue=Math.max(6,maxClue),cacheKey=n+':'+maxValue;
    if(!regionUniverseCache.has(cacheKey))regionUniverseCache.set(cacheKey,regionUniverse(n,maxValue));
    var universe=regionUniverseCache.get(cacheKey),bySize=universe.bySize,neighbors=universe.neighbors,cellBit=universe.cellBit;
    var clues=[];for(r=0;r<n;r++)for(c=0;c<n;c++)clues.push(Number(puzzle[r][c])||0);
    var candidates=[],byCell=Array.from({length:n*n},function(){return [];});
    for(var k=1;k<=maxValue;k++)for(var ui=0;ui<bySize[k].length;ui++){
      var mask=bySize[k][ui],valid=true,adj=0n;
      for(var i=0;i<n*n&&valid;i++)if(mask&cellBit(i)){
        var clue=clues[i];if(clue&&clue!==k){valid=false;break;}
        var ns=neighbors[i];for(var ni=0;ni<ns.length;ni++)if(!(mask&cellBit(ns[ni])))adj|=cellBit(ns[ni]);
      }
      if(!valid)continue;
      for(i=0;i<n*n&&valid;i++)if(!(mask&cellBit(i))&&clues[i]===k){
        ns=neighbors[i];for(ni=0;ni<ns.length;ni++)if(mask&cellBit(ns[ni])){valid=false;break;}
      }
      if(!valid)continue;
      var idx=candidates.length;candidates.push({mask:mask,size:k,adj:adj});
      for(i=0;i<n*n;i++)if(mask&cellBit(i))byCell[i].push(idx);
    }
    var full=(1n<<BigInt(n*n))-1n,blocked=Array(maxValue+1).fill(0n),found=0,nodes=0,branches=0;
    function search(covered){
      if(found>=limit)return;nodes++;
      if(covered===full){found++;return;}
      var bestList=null;
      for(var cell=0;cell<n*n;cell++)if(!(covered&cellBit(cell))){
        var list=[];
        for(var bi=0;bi<byCell[cell].length;bi++){
          var ci=byCell[cell][bi],cand=candidates[ci];
          if(cand.mask&covered)continue;if(cand.mask&blocked[cand.size])continue;list.push(ci);
        }
        if(!list.length)return;
        if(bestList===null||list.length<bestList.length){bestList=list;if(list.length===1)break;}
      }
      if(bestList.length>1)branches++;
      for(var li=0;li<bestList.length;li++){
        cand=candidates[bestList[li]];var old=blocked[cand.size];blocked[cand.size]=old|cand.adj;
        search(covered|cand.mask);blocked[cand.size]=old;if(found>=limit)return;
      }
    }
    search(0n);stats.nodes=nodes;stats.branches=branches;stats.candidates=candidates.length;stats.solutions=found;return found;
  }
  generator.countFillominoRegionSolutions=countRegionExact;

  function initialCarve(solution,seed,difficulty){
    var n=solution.length,grid=clone(solution),random=rng(seed>>>0);
    var order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random);
    var target=targetClues(n,difficulty),clues=n*n;
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n,saved=grid[r][c];grid[r][c]=0;
      if(generator.countFillominoSolutions(grid,2)!==1)grid[r][c]=saved;else clues--;
    }
    return generator.countFillominoSolutions(grid,2)===1?{puzzle:grid,clues:clues}:null;
  }

  function expertIrreducibleCarve(grid,seed){
    var n=grid.length,out=clone(grid),order=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(out[r][c])order.push(r*n+c);
    shuffle(order,rng(((seed>>>0)^0xF11E0A1D)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,saved=out[rr][cc];if(!saved)continue;
      out[rr][cc]=0;
      if(countRegionExact(out,2)===1)accepted++;else{out[rr][cc]=saved;rejected++;}
    }
    var clues=0;for(r=0;r<n;r++)for(c=0;c<n;c++)if(out[r][c])clues++;
    return {puzzle:out,clues:clues,accepted:accepted,rejected:rejected};
  }

  function build(seed,n,difficulty){
    var wanted=3,candidates=[],seen={};
    for(var attempt=0;attempt<240&&candidates.length<wanted;attempt++){
      var random=rng(((seed>>>0)^0x50334649^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var solution=buildSolution(n,random);if(!solution)continue;
      var topology=JSON.stringify(solution);if(seen[topology])continue;seen[topology]=1;
      var carved=initialCarve(solution,((seed>>>0)^Math.imul(attempt+1,0x27D4EB2D))>>>0,difficulty);if(!carved)continue;
      candidates.push({puzzle:carved.puzzle,solution:solution,clues:carved.clues,topology:topology});
    }
    if(!candidates.length)return null;
    candidates.sort(function(a,b){if(a.clues!==b.clues)return a.clues-b.clues;return a.topology<b.topology?-1:(a.topology>b.topology?1:0);});
    var picked=difficulty==='expert'?candidates[0]:(difficulty==='gentle'?candidates[candidates.length-1]:candidates[Math.floor((candidates.length-1)/2)]);
    if(difficulty==='expert'){
      var hardened=expertIrreducibleCarve(picked.puzzle,seed>>>0);
      picked=Object.assign({},picked,{puzzle:hardened.puzzle,clues:hardened.clues,acceptedRemovals:hardened.accepted,rejectedRemovals:hardened.rejected});
    }
    return picked;
  }

  function makeFillomino(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');if(cache.has(key))return clone(cache.get(key));
    var built=build(seed>>>0,n,difficulty);if(!built)throw new Error('Fillomino multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);
    var out=clone(variant);out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});out.puzzle=built.puzzle;out.solution=built.solution;
    out.generation={seed:seed>>>0,clues:built.clues,unique:true,verification:difficulty==='expert'?'fillomino-region-exact-local-irreducible':'solver-verified',generatorFamily:'fillomino-multisize-procedural-partition',difficultyScore:n*n-built.clues,mode:'seeded-variant-essential',variantEssential:true,boardSize:n};
    if(difficulty==='expert'){
      out.generation.policy='contract-driven-local-irreducibility';
      out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
      out.generation.locallyIrreducibleUnderProductionContract=true;
      out.generation.acceptedRemovals=built.acceptedRemovals||0;out.generation.rejectedRemovals=built.rejectedRemovals||0;
    }
    cache.set(key,clone(out));return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='fillomino';});
  if(variant){
    variant.data=variant.data||{};var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-fillomino'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='fillomino')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);if(supported.indexOf(requested)<0)requested=6;
    return makeFillomino(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};root.IldiP3SizeSupport.fillomino=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
