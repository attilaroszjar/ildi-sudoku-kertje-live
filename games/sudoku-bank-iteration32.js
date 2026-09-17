(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'fillomino',title:'Fillomino',family:'Japanese logic',kind:'fillomino',
    rule:'Divide the grid into orthogonally connected groups. Every cell contains a number equal to the size of its group. Groups with the same number may not touch orthogonally, because they would form one larger group.',
    data:{source:'BrainBashers Daily Fillomino rules',inputMode:'fillomino',size:6,maxValue:6},
    puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
