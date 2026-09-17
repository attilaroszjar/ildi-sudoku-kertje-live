(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'akari',title:'Akari / Light Up',family:'Japanese logic',kind:'akari',
    rule:'Place bulbs in white cells so every white cell is illuminated horizontally or vertically. Bulbs may not shine on each other. A number in a black cell tells exactly how many orthogonally adjacent bulbs it has; unnumbered black cells only block light.',
    data:{source:'Nikoli Akari / Light Up rules',inputMode:'akari',size:6},
    puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
