(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var G=root.SudokuGenerator,baseMake=G.make;
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,r){for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function target(d){return d==='gentle'?40:(d==='expert'?27:32);}
  function salt(d){return d==='gentle'?0x4D53474E:(d==='expert'?0x4D534558:0x4D534643);}
  function makeLoShu(random){
    var base=[[8,1,6],[3,5,7],[4,9,2]],turn=Math.floor(random()*8),a=base.map(function(r){return r.slice();});
    function rot(x){return [[x[2][0],x[1][0],x[0][0]],[x[2][1],x[1][1],x[0][1]],[x[2][2],x[1][2],x[0][2]]];}
    if(turn>=4){a=a.map(function(r){return r.slice().reverse();});turn-=4;}while(turn--)a=rot(a);return a;
  }
  function freshSolution(seed){
    var random=rng(seed^0x4D534C53),grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,magic=makeLoShu(random);
    for(var r=3;r<=5;r++)for(var c=3;c<=5;c++){var v=magic[r-3][c-3],b=1<<(v-1),box=4;grid[r][c]=v;rows[r]|=b;cols[c]|=b;boxes[box]|=b;}
    function fill(){var br=-1,bc=-1,bm=0,best=10;for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){var box=Math.floor(r/3)*3+Math.floor(c/3),m=full&~(rows[r]|cols[c]|boxes[box]),k=0;for(var z=m;z;z&=z-1)k++;if(k<best){best=k;br=r;bc=c;bm=m;if(k<=1)break;}}if(br<0)return true;if(!bm)return false;var digits=[];for(var m=bm;m;m&=m-1)digits.push(m&-m);shuffle(digits,random);var box=Math.floor(br/3)*3+Math.floor(bc/3);for(var i=0;i<digits.length;i++){var one=digits[i],d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;if(fill())return true;rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;}return false;}
    if(!fill())throw new Error('Magic Square fresh solution exhausted');return grid;
  }
  function makeMagic(variant,seed,difficulty){
    difficulty=difficulty||'focused';var mixed=((seed>>>0)^salt(difficulty))>>>0,out=clone(variant),solution=freshSolution(mixed);out.solution=solution;
    var goal=target(difficulty),grid=solution.map(function(r){return r.slice();}),order=shuffle(Array.from({length:81},function(_,i){return i;}),rng(mixed^0x4D534352)),clues=81;
    for(var i=0;i<order.length&&clues>goal;i++){var idx=order[i],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;if(G.countIteration4SpecialSolutions(grid,out,2,{})!==1)grid[r][c]=old;else clues--;}
    var essential=G.countSolutions(grid,2)>1;
    if(!essential){var more=shuffle(order.slice(),rng(mixed^0x4D534553));for(i=0;i<more.length&&!essential;i++){idx=more[i];r=Math.floor(idx/9);c=idx%9;if(!grid[r][c])continue;old=grid[r][c];grid[r][c]=0;if(G.countIteration4SpecialSolutions(grid,out,2,{})!==1)grid[r][c]=old;else{clues--;essential=G.countSolutions(grid,2)>1;}}}
    if(clues<goal){var restore=shuffle(Array.from({length:81},function(_,i){return i;}),rng(mixed^0x4D535253));for(i=0;i<restore.length&&clues<goal;i++){idx=restore[i];r=Math.floor(idx/9);c=idx%9;if(grid[r][c])continue;grid[r][c]=solution[r][c];if(G.countSolutions(grid,2)===1)grid[r][c]=0;else clues++;}}
    var stats={},unique=G.countIteration4SpecialSolutions(grid,out,2,stats)===1;essential=G.countSolutions(grid,2)>1;
    if(!unique||!essential||clues!==goal)throw new Error('Magic Square candidate contract failed');
    out.puzzle=grid;out.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'magic-square-fresh-lo-shu-mrv',difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,solutionGeneration:'fresh-lo-shu-seeded'};return out;
  }
  G.make=function(variant,seed,difficulty){if(variant&&variant.id==='magic-square')return makeMagic(variant,seed,difficulty);return baseMake.call(this,variant,seed,difficulty);};
  root.MagicSquareGeneratorHardening={freshSolution:freshSolution,makeMagic:makeMagic};
})(globalThis);
