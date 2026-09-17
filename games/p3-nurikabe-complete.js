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

  function components(grid,value){
    var n=grid.length,seen={},out=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      if(grid[r][c]!==value||seen[r+','+c])continue;
      var q=[[r,c]],comp=[];seen[r+','+c]=1;
      while(q.length){
        var p=q.pop();comp.push(p);
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
          var rr=p[0]+d[0],cc=p[1]+d[1],k=rr+','+cc;
          if(rr>=0&&cc>=0&&rr<n&&cc<n&&grid[rr][cc]===value&&!seen[k]){
            seen[k]=1;q.push([rr,cc]);
          }
        });
      }
      out.push(comp);
    }
    return out;
  }

  function noSea2x2(sea){
    var n=sea.length;
    for(var r=0;r<n-1;r++)for(var c=0;c<n-1;c++){
      if(sea[r][c]&&sea[r+1][c]&&sea[r][c+1]&&sea[r+1][c+1])return false;
    }
    return true;
  }

  function seaConnected(sea){
    var comps=components(sea,1);
    if(!comps.length)return false;
    var count=0;
    for(var r=0;r<sea.length;r++)for(var c=0;c<sea.length;c++)if(sea[r][c])count++;
    return comps.length===1&&comps[0].length===count;
  }

  function islandComponents(sea){
    var land=sea.map(function(row){return row.map(function(x){return x?0:1;});});
    return components(land,1);
  }

  function growSea(seed,n,attempt,difficulty){
    var random=rng(((seed>>>0)^0x50334E55^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
    var sea=Array.from({length:n},function(){return Array(n).fill(0);});
    var start=[Math.floor(random()*n),Math.floor(random()*n)];
    sea[start[0]][start[1]]=1;
    var density=difficulty==='expert'?0.56:(difficulty==='gentle'?0.44:0.50);
    var target=Math.max(n+2,Math.round(n*n*density));
    var count=1;

    function frontier(){
      var out=[],seen={};
      for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(sea[r][c]){
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
          var rr=r+d[0],cc=c+d[1],k=rr+','+cc;
          if(rr>=0&&cc>=0&&rr<n&&cc<n&&!sea[rr][cc]&&!seen[k]){
            seen[k]=1;out.push([rr,cc]);
          }
        });
      }
      return shuffle(out,random);
    }

    while(count<target){
      var options=frontier(),placed=false;
      for(var i=0;i<options.length;i++){
        var p=options[i];
        sea[p[0]][p[1]]=1;
        if(noSea2x2(sea)){
          count++;placed=true;break;
        }
        sea[p[0]][p[1]]=0;
      }
      if(!placed)break;
    }

    if(count<Math.max(n+1,target-2)||!seaConnected(sea)||!noSea2x2(sea))return null;

    var islands=islandComponents(sea);
    if(islands.length<2)return null;
    if(islands.some(function(comp){return comp.length>Math.max(8,Math.ceil(n*n*0.28));}))return null;

    return {sea:sea,islands:islands,random:random};
  }

  function buildPuzzle(candidate){
    var n=candidate.sea.length;
    var puzzle=Array.from({length:n},function(){return Array(n).fill(null);});
    candidate.islands.forEach(function(comp){
      var q=comp[Math.floor(candidate.random()*comp.length)];
      puzzle[q[0]][q[1]]=comp.length;
    });
    return puzzle;
  }

  function seaCells(sea,random){
    var cells=[];
    for(var r=0;r<sea.length;r++)for(var c=0;c<sea.length;c++)if(sea[r][c])cells.push([r,c]);
    return shuffle(cells,random);
  }

  function starterFraction(difficulty,n){
    /*
     * Nurikabe's authoritative solver branches over every undecided cell.
     * Easy/focused puzzles retain a bounded deterministic sea fraction for
     * interactive generation. Expert starts from the same certified set but
     * is then exact-minimized below to a locally irreducible starter set.
     */
    var base=difficulty==='gentle'?0.88:(difficulty==='focused'?0.80:0.70);
    if(n>=8)base+=0.05;
    else if(n>=7)base+=0.03;
    return Math.min(0.93,base);
  }

  function minimizeExpertPreShade(puzzle,shaded){
    var kept=shaded.slice(),stats={},i=0;
    while(i<kept.length){
      var trial=kept.slice(0,i).concat(kept.slice(i+1));
      var trialStats={};
      if(generator.countNurikabeSolutions(puzzle,2,trialStats,trial)===1){
        kept=trial;
        stats=trialStats;
      }else{
        i++;
      }
    }
    stats={};
    var count=generator.countNurikabeSolutions(puzzle,2,stats,kept);
    return count===1?{preShaded:kept,stats:stats}:null;
  }

  function certifiedPreShade(puzzle,sea,random,difficulty){
    var cells=seaCells(sea,random),n=sea.length;
    var target=Math.min(cells.length,Math.max(1,Math.ceil(cells.length*starterFraction(difficulty,n))));
    var shaded=cells.slice(0,target);
    var stats={};
    var count=generator.countNurikabeSolutions(puzzle,2,stats,shaded);

    /* Add the remaining known sea in coarse batches only if still ambiguous. */
    var pos=target,batch=Math.max(2,Math.ceil(n/2));
    while(count!==1&&pos<cells.length){
      var stop=Math.min(cells.length,pos+batch);
      while(pos<stop)shaded.push(cells[pos++]);
      stats={};
      count=generator.countNurikabeSolutions(puzzle,2,stats,shaded);
    }

    if(count!==1)return null;
    if(difficulty==='expert')return minimizeExpertPreShade(puzzle,shaded);
    return {preShaded:shaded,stats:stats};
  }

  function build(seed,n,difficulty){
    var seen={};
    for(var attempt=0;attempt<20;attempt++){
      var candidate=growSea(seed,n,attempt,difficulty);
      if(!candidate)continue;
      var topology=JSON.stringify(candidate.sea);
      if(seen[topology])continue;
      seen[topology]=1;

      var puzzle=buildPuzzle(candidate);
      var certified=certifiedPreShade(puzzle,candidate.sea,candidate.random,difficulty);
      if(!certified)continue;

      return {
        puzzle:puzzle,
        solution:candidate.sea,
        preShaded:certified.preShaded,
        clues:candidate.islands.length,
        stats:certified.stats,
        score:Number(certified.stats.nodes||0)+Number(certified.stats.branches||0)*2+Number(certified.stats.deadEnds||0),
        topology:topology
      };
    }
    return null;
  }

  function makeNurikabe(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));
    var built=build(seed>>>0,n,difficulty);
    if(!built)throw new Error('Nurikabe multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=built.puzzle;
    out.solution=built.solution;
    out.preShaded=built.preShaded;
    out.generation={
      seed:seed>>>0,
      clues:built.clues+built.preShaded.length,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'nurikabe-multisize-sea-growth-bounded',
      difficultyScore:built.score,
      searchStats:clone(built.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n,
      localIrreducible:difficulty==='expert'
    };

    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='nurikabe';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-nurikabe'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:5;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='nurikabe')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=5;
    return makeNurikabe(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.nurikabe=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
