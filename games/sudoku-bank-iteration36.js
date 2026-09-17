(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'nurikabe',title:'Nurikabe',family:'Japanese logic',kind:'nurikabe',
    rule:'Shade cells black to form one connected sea. Every white island contains exactly one number and has exactly that many cells. Different islands may not touch orthogonally, and no 2×2 block may be entirely black.',
    data:{source:'World Puzzle Federation Nurikabe rules',inputMode:'nurikabe',size:5},puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
