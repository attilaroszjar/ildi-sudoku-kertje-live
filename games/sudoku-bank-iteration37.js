(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'nonogram',title:'Nonogram / Picross',family:'Japanese logic',kind:'nonogram',
    rule:'Fill cells so that each row and column matches its ordered run-length clues. Each clue number gives the length of one consecutive block of filled cells; separate blocks have at least one empty cell between them.',
    data:{source:'Nonogram/Picross standard run-length rules; independently implemented',inputMode:'nonogram',size:8},puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
