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

  function makeCertifiedBase(seed,n){
    var random=rng(((seed>>>0)^0x52495050^Math.imul(n,0x85EBCA6B))>>>0);
    var digits=Array.from({length:n},function(_,i){return i+1;});
    shuffle(digits,random);
    var offset=Math.floor(random()*n);
    var vertical=!!(seed&1);
    var rooms=Array.from({length:n},function(){return Array(n).fill(0);});
    var solution=Array.from({length:n},function(){return Array(n).fill(0);});

    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      rooms[r][c]=vertical?c:r;
      solution[r][c]=digits[(r+c+offset)%n];
    }

    return {rooms:rooms,solution:solution,random:random,orientation:vertical?'columns':'rows'};
  }

  function targetHoleFraction(difficulty,n){
    var base=difficulty==='gentle'?0.18:(difficulty==='focused'?0.28:0.38);
    if(n>=8)base-=0.04;
    else if(n>=7)base-=0.02;
    return Math.max(0.14,base);
  }

  function makeRipple(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var base=makeCertifiedBase(seed,n);
    var rooms=base.rooms,solution=base.solution,random=base.random;
    var givens=solution.map(function(row){return row.slice();});
    var order=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)order.push([r,c]);
    shuffle(order,random);

    var target=Math.max(1,Math.floor(n*n*targetHoleFraction(difficulty,n)));
    var removed=0;
    for(var i=0;i<order.length&&removed<target;i++){
      var q=order[i],old=givens[q[0]][q[1]];
      givens[q[0]][q[1]]=0;
      var probe={size:n,rooms:rooms,givens:givens};
      if(generator.countRippleEffectSolutions(probe,2,{})===1)removed++;
      else givens[q[0]][q[1]]=old;
    }

    var puzzle={size:n,rooms:rooms,givens:givens};
    var stats={};
    var count=generator.countRippleEffectSolutions(puzzle,2,stats);
    if(count!==1){
      givens=solution.map(function(row){return row.slice();});
      puzzle={size:n,rooms:rooms,givens:givens};
      stats={};
      count=generator.countRippleEffectSolutions(puzzle,2,stats);
      removed=0;
    }
    if(count!==1)throw new Error('Ripple Effect certified base failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);

    var score=Number(stats.nodes||0)+Number(stats.branches||0)*3+Number(stats.deadEnds||0)*2;
    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=puzzle;
    out.solution=solution;
    out.generation={
      seed:seed>>>0,
      clues:n*n-removed,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'ripple-effect-multisize-certified-stripes',
      difficultyScore:score,
      searchStats:clone(stats),
      topologyFamily:base.orientation,
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };

    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='ripple-effect';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-ripple-effect'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:5;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='ripple-effect')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=5;
    return makeRipple(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport['ripple-effect']=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
