(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function orientedLine(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function visible(line){var m=0,n=0;for(var i=0;i<line.length;i++)if(line[i]>m){m=line[i];n++;}return n;}
  function parityAt(variant,r,c){var list=(variant.data&&variant.data.parityCells)||[];for(var i=0;i<list.length;i++)if(list[i].cell[0]===r&&list[i].cell[1]===c)return list[i].parity;return null;}
  function extraValid(grid,variant){
    var n=grid.length,r,c,p;
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(grid[r][c]){p=parityAt(variant,r,c);if(p&&((grid[r][c]%2?'odd':'even')!==p))return false;}
    var clues=(variant.data&&variant.data.clues)||[];
    for(var i=0;i<clues.length;i++){var cl=clues[i],line=orientedLine(grid,cl);if(line.every(Boolean)&&((visible(line)%2?'odd':'even')!==cl.parity))return false;}
    return true;
  }
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var v=grid[r][c],bit=1<<(v-1);if((rows[r]|cols[c])&bit)return stats;rows[r]|=bit;cols[c]|=bit;}
    if(!extraValid(grid,variant))return stats;
    function visit(){
      if(stats.solutions>=2)return;stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]),valid=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=d;if(extraValid(grid,variant))valid|=one;grid[rr][cc]=0;}
        var cnt=bitCount(valid);if(cnt<best){br=rr;bc=cc;bm=valid;best=cnt;if(cnt<=1)break;}
      }
      if(br<0){stats.solutions++;return;}if(!bm){stats.deadEnds++;return;}if(best>1)stats.branches++;
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}
    }
    visit();return stats;
  }
  function addSafeGivens(out,variant,wanted){
    var grid=clone(out.puzzle),solution=out.solution||variant.solution,n=grid.length,added=0;
    for(var r=0;r<n&&added<wanted;r++)for(var c=0;c<n&&added<wanted;c++)if(!grid[r][c]){
      grid[r][c]=solution[r][c];
      if(generator.countEvenOddSkyscraperSolutions(grid,Object.assign({},variant,{data:out.data||variant.data,solution:solution}),2,true)>1)added++;
      else grid[r][c]=0;
    }
    out.puzzle=grid;out.generation.clues=grid.flat().filter(Boolean).length;out.generation.variantEssential=generator.countEvenOddSkyscraperSolutions(grid,Object.assign({},variant,{data:out.data||variant.data,solution:solution}),2,true)>1;
  }
  generator.iteration20SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    if(!(variant&&variant.id==='evenodd-skyscrapers'))return baseMake.call(this,variant,seed,difficulty);
    var out=baseMake.call(this,variant,seed,'expert');
    if(difficulty==='focused')addSafeGivens(out,variant,2);
    else if(difficulty==='gentle')addSafeGivens(out,variant,4);
    var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution});
    var stats=searchStats(out.puzzle,measured);
    out.generation.searchStats=stats;
    out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
    out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-nested-measured';
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
