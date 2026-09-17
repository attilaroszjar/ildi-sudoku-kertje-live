(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function dims(n){if(n===6)return[2,3];if(n===12)return[3,4];if(n===16)return[4,4];var q=Math.sqrt(n)|0;return[q,q];}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function rotate(grid){var n=grid.length;return Array.from({length:n},function(_,r){return Array.from({length:n},function(_,c){return grid[n-1-c][r];});});}
  function rotated(grid,turns){var out=clone(grid);for(var i=0;i<turns;i++)out=rotate(out);return out;}
  function searchStats(source){
    var grid=clone(source),n=grid.length,d=dims(n),bh=d[0],bw=d[1],boxCols=n/bw,full=(1<<n)-1;
    var rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0},r,c;
    for(r=0;r<n;r++)for(c=0;c<n;c++){
      var value=grid[r][c];if(!value)continue;
      var bit=1<<(value-1),box=Math.floor(r/bh)*boxCols+Math.floor(c/bw);
      if((rows[r]|cols[c]|boxes[box])&bit){stats.deadEnds++;return stats;}
      rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;
    }
    function visit(){
      if(stats.solutions>=2)return;
      stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var box=Math.floor(rr/bh)*boxCols+Math.floor(cc/bw),mask=full&~(rows[rr]|cols[cc]|boxes[box]),count=bitCount(mask);
        if(count<best){br=rr;bc=cc;bm=mask;best=count;if(count<=1)break;}
      }
      if(br<0){stats.solutions++;return;}
      if(!bm){stats.deadEnds++;return;}
      if(best>1)stats.branches++;
      var box=Math.floor(br/bh)*boxCols+Math.floor(bc/bw);
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);
        grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;
        visit();
        rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;
        if(stats.solutions>=2)return;
      }
    }
    visit();return stats;
  }
  function permuteDigits(base,seed,salt){
    var n=base.length,random=rng((seed^salt)>>>0),digits=Array.from({length:n},function(_,i){return i+1;});shuffle(digits,random);
    return base.map(function(row){return row.map(function(v){return digits[v-1];});});
  }
  function mini6Solution(seed){
    var base=[[1,2,3,4,5,6],[4,5,6,1,2,3],[3,6,2,5,1,4],[5,1,4,3,6,2],[2,3,1,6,4,5],[6,4,5,2,3,1]];
    return permuteDigits(base,seed,0x4d494e36);
  }
  function sudoku12Solution(seed){
    var base=[
      [1,2,3,4,5,6,7,8,9,10,11,12],
      [5,6,9,7,10,11,4,12,1,2,3,8],
      [10,11,12,8,1,9,2,3,5,4,6,7],
      [4,7,8,2,3,12,6,10,11,1,5,9],
      [3,5,1,9,7,4,8,11,10,6,12,2],
      [6,10,11,12,2,1,5,9,4,7,8,3],
      [12,8,2,10,11,3,1,6,7,5,9,4],
      [7,9,4,6,8,5,12,2,3,11,1,10],
      [11,1,5,3,4,10,9,7,8,12,2,6],
      [2,3,6,5,9,7,10,1,12,8,4,11],
      [8,4,7,11,12,2,3,5,6,9,10,1],
      [9,12,10,1,6,8,11,4,2,3,7,5]
    ];
    return permuteDigits(base,seed,0x31325831);
  }
  function rotationSafeUnique(grid){for(var t=0;t<4;t++)if(generator.countSolutions(rotated(grid,t),2)!==1)return false;return true;}
  function makeRotationSafe(variant,seed,difficulty,solution,target,salt,family){
    var grid=clone(solution),random=rng((seed^salt)>>>0),n=solution.length,order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random),clues=n*n;
    for(var i=0;i<order.length&&clues>target;i++){
      var idx=order[i],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];grid[r][c]=0;
      if(!rotationSafeUnique(grid))grid[r][c]=old;else clues--;
    }
    if(!rotationSafeUnique(grid))throw new Error(variant.id+' rotation-safe uniqueness failure');
    var out=JSON.parse(JSON.stringify(variant));out.solution=solution;out.puzzle=grid;out.generation={seed:seed>>>0,clues:clues,unique:true,verification:'rotation-safe-solver-verified',generatorFamily:family,difficultyScore:null,mode:'seeded-unique',variantEssential:false,rotationSafe:true};return out;
  }
  function makeMini6(variant,seed,difficulty){
    var target=difficulty==='gentle'?28:(difficulty==='expert'?20:24);
    return makeRotationSafe(variant,seed,difficulty,mini6Solution(seed>>>0),target,0x434c5545,'mini6-rotation-safe-unique-removal');
  }
  function makeSudoku12(variant,seed,difficulty){
    var reference=baseMake.call(generator,variant,seed,difficulty),target=reference.generation&&reference.generation.clues;
    if(!target)target=reference.puzzle.reduce(function(sum,row){return sum+row.filter(Boolean).length;},0);
    var out=makeRotationSafe(variant,seed,difficulty,sudoku12Solution(seed>>>0),target,0x3132434c,'sudoku12-rotation-safe-unique-removal');
    var stats=searchStats(out.puzzle);out.generation.searchStats=stats;out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;return out;
  }
  generator.largeGridSearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='mini-6')return makeMini6(variant,seed,difficulty||'focused');
    if(variant&&variant.id==='sudoku-12x12')return makeSudoku12(variant,seed,difficulty||'focused');
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&variant.id==='sudoku-16x16'){
      var stats=searchStats(out.puzzle);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily='large-unique-removal-mrv';
    }
    return out;
  };
  generator.makeRotationSafeMini6=makeMini6;
  generator.makeRotationSafeSudoku12=makeSudoku12;
})(typeof window!=='undefined'?window:globalThis);
