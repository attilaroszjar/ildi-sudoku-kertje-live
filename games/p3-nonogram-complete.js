(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[5,6,8,10];
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

  function clue(line){
    var out=[],run=0;
    for(var i=0;i<line.length;i++){
      if(line[i])run++;
      else if(run){out.push(run);run=0;}
    }
    if(run)out.push(run);
    return out.length?out:[0];
  }

  function cluesFor(grid){
    var n=grid.length;
    var rows=grid.map(clue);
    var cols=[];
    for(var c=0;c<n;c++){
      var line=[];
      for(var r=0;r<n;r++)line.push(grid[r][c]);
      cols.push(clue(line));
    }
    return {rows:rows,cols:cols};
  }

  function patternCount(n,cl){
    if(cl.length===1&&cl[0]===0)return 1;
    var blocks=cl.reduce(function(a,b){return a+b;},0);
    var gaps=cl.length-1;
    var free=n-blocks-gaps;
    if(free<0)return 0;
    var k=cl.length;
    var top=free+k;
    var choose=1;
    for(var i=1;i<=k;i++)choose=choose*(top-k+i)/i;
    return Math.max(1,Math.round(choose));
  }

  function ambiguity(puzzle){
    var n=puzzle.rows.length;
    var all=puzzle.rows.concat(puzzle.cols);
    return all.reduce(function(sum,cl){
      return sum+Math.log(1+patternCount(n,cl));
    },0);
  }

  function seededGrid(seed,n,density){
    var random=rng(seed>>>0);
    var grid=Array.from({length:n},function(){return Array(n).fill(0);});

    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var edge=Math.min(r,c,n-1-r,n-1-c);
      var bias=edge===0?-0.05:0;
      grid[r][c]=random()<Math.max(0.18,Math.min(0.82,density+bias))?1:0;
    }

    /* Avoid completely empty/full lines, which are visually weak and often trivial. */
    for(r=0;r<n;r++){
      var sum=grid[r].reduce(function(a,b){return a+b;},0);
      if(sum===0)grid[r][Math.floor(random()*n)]=1;
      else if(sum===n)grid[r][Math.floor(random()*n)]=0;
    }
    for(c=0;c<n;c++){
      var col=0;
      for(r=0;r<n;r++)col+=grid[r][c];
      if(col===0)grid[Math.floor(random()*n)][c]=1;
      else if(col===n)grid[Math.floor(random()*n)][c]=0;
    }

    return grid;
  }

  function candidateScore(puzzle){
    return ambiguity(puzzle);
  }

  function build(seed,n,difficulty){
    var targetCount=7;
    var candidates=[];
    var seen={};
    var densities=difficulty==='gentle'?[0.60,0.64,0.56]:
      (difficulty==='expert'?[0.43,0.47,0.39]:[0.50,0.54,0.46]);

    for(var attempt=0;attempt<700&&candidates.length<targetCount;attempt++){
      var density=densities[attempt%densities.length];
      var salt=((seed>>>0)^Math.imul(attempt+1,0x9E3779B1)^Math.imul(n,0x85EBCA6B))>>>0;
      var solution=seededGrid(salt,n,density);
      var topology=JSON.stringify(solution);
      if(seen[topology])continue;
      seen[topology]=1;

      var puzzle=cluesFor(solution);
      if(generator.countNonogramSolutions(puzzle,2)!==1)continue;

      candidates.push({
        puzzle:puzzle,
        solution:solution,
        score:candidateScore(puzzle),
        topology:topology
      });
    }

    if(!candidates.length)return null;

    candidates.sort(function(a,b){
      if(a.score!==b.score)return a.score-b.score;
      return a.topology<b.topology?-1:(a.topology>b.topology?1:0);
    });

    if(difficulty==='gentle')return candidates[0];
    if(difficulty==='expert')return candidates[candidates.length-1];
    return candidates[Math.floor((candidates.length-1)/2)];
  }

  function makeNonogram(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var built=build(seed>>>0,n,difficulty);
    if(!built)throw new Error('Nonogram multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {
      p3Size:n,
      p3SupportedSizes:supported.slice()
    });
    out.puzzle=built.puzzle;
    out.solution=built.solution;
    out.generation={
      seed:seed>>>0,
      clues:built.puzzle.rows.length+built.puzzle.cols.length,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'nonogram-multisize-seeded-bitmap',
      difficultyScore:Number(built.score.toFixed(3)),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };
    if(difficulty==='expert'){
      /* Standard Nonogram has one mandatory clue sequence for every row and column.
         Removing a run or a whole line clue changes the puzzle language rather than
         sparsifying an optional clue set, so clue-removal irreducibility is N/A. */
      out.generation.playabilityPolicy='full-line-clue-contract';
      out.generation.localIrreducibility='not-applicable-mandatory-line-clues';
      out.generation.removableClueAtoms=0;
      out.generation.expertSelection='highest-exact-unique-line-ambiguity';
    }

    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='nonogram';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-nonogram'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:8;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='nonogram')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=8;
    return makeNonogram(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.nonogram=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
