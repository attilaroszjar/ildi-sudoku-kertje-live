(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  root.SudokuBank.push({
    id:'hashiwokakero',title:'Bridges / Hashiwokakero',family:'Japanese logic',kind:'bridges',
    rule:'Connect all numbered islands with horizontal or vertical bridges. Each island must have exactly as many bridges as its number; at most two bridges may connect a pair of islands, bridges may not cross, and all islands must belong to one connected network.',
    data:{source:'BrainBashers Daily Bridges; Nikoli Hashiwokakero rules',inputMode:'bridges',size:7},
    puzzle:[],solution:[]
  });
}(typeof window!=='undefined'?window:globalThis));
