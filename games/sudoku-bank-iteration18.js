(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  var solution=[
    [5,1,7,3,2,4,6],
    [3,2,4,6,7,1,5],
    [6,7,5,4,3,2,1],
    [7,3,2,1,6,5,4],
    [2,4,1,7,5,6,3],
    [1,6,3,5,4,7,2],
    [4,5,6,2,1,3,7]
  ];
  var clues=[
    {axis:'col',index:1,side:'top',count:3},
    {axis:'col',index:6,side:'top',count:2},
    {axis:'row',index:1,side:'left',count:4},
    {axis:'row',index:2,side:'right',count:6},
    {axis:'row',index:4,side:'left',count:3},
    {axis:'row',index:6,side:'left',count:4},
    {axis:'col',index:0,side:'bottom',count:2},
    {axis:'col',index:4,side:'bottom',count:5}
  ];
  var dominoes=[
    [[1,1],[2,1]],
    [[3,5],[3,6]],
    [[5,1],[5,2]],
    [[5,3],[5,4]],
    [[5,5],[5,6]]
  ];
  root.SudokuBank.push({
    id:'domino-skyscrapers',
    title:'Domino Skyscrapers',
    family:'Outside clues',
    rule:'Fill the 7×7 Latin grid with digits 1–7 so every digit appears exactly once in each row and column. Outside clues give the number of visible skyscrapers from that direction. Every marked domino has the same sum of its two digits.',
    kind:'dominoskyscrapers',
    data:{clues:clues,dominoes:dominoes,source:'Logic Masters India — Puzzle Jackpot (A4 Domino Skyscrapers)'},
    puzzle:Array.from({length:7},function(){return Array(7).fill(0);}),
    solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
