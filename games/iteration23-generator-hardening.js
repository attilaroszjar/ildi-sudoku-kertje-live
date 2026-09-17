(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function visibleCount(a){var m=0,n=0;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];n++;}return n;}
  function orientedLine(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,d=variant.data||{},max=d.maxDigit||3,copies=d.copiesPerLine||2;
    var rows=Array.from({length:n},function(){return Array(max+1).fill(0);}),cols=Array.from({length:n},function(){return Array(max+1).fill(0);});
    var stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function cluesValid(){var clues=d.clues||[];for(var i=0;i<clues.length;i++){var line=orientedLine(grid,clues[i]);if(line.every(Boolean)&&visibleCount(line)!==clues[i].count)return false;}return true;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c];if(value<1||value>max)return stats;rows[r][value]++;cols[c][value]++;if(rows[r][value]>copies||cols[c][value]>copies)return stats;}
    if(!cluesValid())return stats;
    function visit(){
      if(stats.solutions>=2)return;stats.nodes++;
      var br=-1,bc=-1,best=null;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var allowed=[];
        for(var digit=1;digit<=max;digit++)if(rows[rr][digit]<copies&&cols[cc][digit]<copies){grid[rr][cc]=digit;if(cluesValid())allowed.push(digit);grid[rr][cc]=0;}
        if(best===null||allowed.length<best.length){br=rr;bc=cc;best=allowed;if(allowed.length<=1)break;}
      }
      if(br<0){for(var i=0;i<n;i++)for(var digit=1;digit<=max;digit++)if(rows[i][digit]!==copies||cols[i][digit]!==copies)return;stats.solutions++;return;}
      if(!best.length){stats.deadEnds++;return;}if(best.length>1)stats.branches++;
      for(var i=0;i<best.length;i++){var digit=best[i];grid[br][bc]=digit;rows[br][digit]++;cols[bc][digit]++;visit();rows[br][digit]--;cols[bc][digit]--;grid[br][bc]=0;if(stats.solutions>=2)return;}
    }
    visit();return stats;
  }
  generator.iteration23SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&variant.id==='double-skyscrapers'){
      var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution});
      var stats=searchStats(out.puzzle,measured);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
  if(root.ClassicHumanRuntimeGenerator)root.ClassicHumanRuntimeGenerator.install(generator);
})(typeof window!=='undefined'?window:globalThis);
