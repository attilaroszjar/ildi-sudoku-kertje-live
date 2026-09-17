(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'slitherlink',title:'Slitherlink',family:'Japanese logic',kind:'slitherlink',
    rule:'Draw one single non-intersecting loop along the grid edges. A number in a cell tells exactly how many of its four edges belong to the loop. The loop may not branch and every drawn edge must belong to the same loop.',
    data:{source:'World Puzzle Federation Puzzle GP Slitherlink rules',inputMode:'slitherlink',size:5},
    puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
