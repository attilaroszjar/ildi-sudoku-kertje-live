(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'masyu',title:'Masyu',family:'Japanese logic',kind:'masyu',
    rule:'Draw one non-intersecting orthogonal loop through every circled cell. At a white circle the loop goes straight and must turn in at least one adjacent cell. At a black circle the loop turns, and it must go straight through both adjacent cells before and after the circle.',
    data:{source:'World Puzzle Federation Puzzle GP standard Masyu rules; independently implemented',inputMode:'masyu',size:4},puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
