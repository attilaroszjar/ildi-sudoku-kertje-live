(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function antiQueenSolution(seed,digit){
    var random=rng(seed>>>0),grid=Array.from({length:9},function(){return Array(9).fill(0);});
    var queenDigit=digit||9,queenBit=1<<(queenDigit-1),full=511;
    var rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
    function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function placeQueens(){
      var usedCols=Array(9).fill(false),usedBoxes=Array(9).fill(false),usedDown=Array(17).fill(false),usedUp=Array(17).fill(false);
      var rowOrder=shuffle([0,1,2,3,4,5,6,7,8],random),nodes=0,limit=50000;
      function visit(k){
        if(++nodes>limit)return false;
        if(k===9)return true;
        var r=rowOrder[k],choices=[];
        for(var c=0;c<9;c++){
          var b=box(r,c),dd=r-c+8,du=r+c;
          if(!usedCols[c]&&!usedBoxes[b]&&!usedDown[dd]&&!usedUp[du])choices.push(c);
        }
        shuffle(choices,random);
        for(var i=0;i<choices.length;i++){
          var c=choices[i],b=box(r,c),dd=r-c+8,du=r+c;
          grid[r][c]=queenDigit;usedCols[c]=true;usedBoxes[b]=true;usedDown[dd]=true;usedUp[du]=true;
          if(visit(k+1))return true;
          grid[r][c]=0;usedCols[c]=false;usedBoxes[b]=false;usedDown[dd]=false;usedUp[du]=false;
        }
        return false;
      }
      return visit(0);
    }
    if(!placeQueens())return null;
    for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(grid[r][c]){var b=box(r,c);rows[r]|=queenBit;cols[c]|=queenBit;boxes[b]|=queenBit;}
    var nodes=0,limit=350000;
    function visit(){
      if(++nodes>limit)return false;
      var br=-1,bc=-1,bm=0,best=10,ties=[];
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var mask=(full&~queenBit)&~(rows[r]|cols[c]|boxes[box(r,c)]),count=bitCount(mask);
        if(!count)return false;
        if(count<best){best=count;ties=[[r,c,mask]];}
        else if(count===best)ties.push([r,c,mask]);
      }
      if(!ties.length)return true;
      var choice=ties[Math.floor(random()*ties.length)];br=choice[0];bc=choice[1];bm=choice[2];
      var candidates=[];for(var bits=bm;bits;bits&=bits-1)candidates.push(bits&-bits);shuffle(candidates,random);
      var b=box(br,bc);
      for(var i=0;i<candidates.length;i++){
        var bit=candidates[i],digitValue=1+Math.round(Math.log(bit)/Math.LN2);
        grid[br][bc]=digitValue;rows[br]|=bit;cols[bc]|=bit;boxes[b]|=bit;
        if(visit())return true;
        boxes[b]^=bit;cols[bc]^=bit;rows[br]^=bit;grid[br][bc]=0;
      }
      return false;
    }
    return visit()?grid:null;
  }
  function makeAntiQueen(variant,seed,difficulty){
    var digit=(variant.data&&variant.data.digit)||9;
    for(var attempt=0;attempt<16;attempt++){
      var actualSeed=((seed>>>0)^0x41513939^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var solution=antiQueenSolution((actualSeed^0x534f4c56)>>>0,digit);if(!solution)continue;
      var working=deepClone(variant);working.solution=solution;working.data=Object.assign({},working.data||{},{digit:digit});
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;
      out.solution=solution;out.data=working.data;out.generation.seed=seed>>>0;out.generation.transformationSeed=actualSeed;out.generation.generatorFamily='anti-queen-9-seeded-queen-placement-then-sudoku';
      if(typeof generator.iteration6SearchStats==='function'){
        var stats=generator.iteration6SearchStats(out.puzzle,out);out.generation.searchStats=stats;out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      }
      return out;
    }
    throw new Error('Anti-Queen-9 bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }
  generator.make=function(variant,seed,difficulty){return variant&&variant.id==='anti-queen-9'?makeAntiQueen(variant,seed,difficulty):baseMake.call(this,variant,seed,difficulty);};
})(typeof window!=='undefined'?window:globalThis);
