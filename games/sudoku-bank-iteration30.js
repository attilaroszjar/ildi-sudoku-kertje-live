(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'hitori',title:'Hitori',family:'Japanese logic',kind:'hitori',
    rule:'Shade cells so that no number appears more than once in any row or column. Black cells may not touch horizontally or vertically, and all unshaded cells must remain connected.',
    data:{source:'BrainBashers Daily Hitori; Nikoli Hitori rules',inputMode:'shade'},
    puzzle:[[1,2,3,4,5,6],[2,3,4,5,6,1],[3,4,5,6,1,2],[4,5,6,1,2,3],[5,6,1,2,3,4],[6,1,2,3,4,5]],
    solution:Array.from({length:6},function(){return Array(6).fill(0);})
  });
}(typeof window!=='undefined'?window:globalThis));
