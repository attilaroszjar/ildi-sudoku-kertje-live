(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'futoshiki',title:'Futoshiki',family:'Japanese logic',kind:'futoshiki',
    rule:'Fill every row and column with 1–6 exactly once. Every inequality sign between adjacent cells must be true; the pointed/narrow side faces the smaller number.',
    data:{source:'BrainBashers Daily Futoshiki rules',inputMode:'futoshiki',size:6,inputMax:6},
    puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
