(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  var base=bank.find(function(v){return v.id==='classic';});
  if(!base)return;
  var solution=base.solution.map(function(row){return row.slice();});

  bank.push({
    id:'reflection',title:'Reflection Sudoku',family:'Lines',
    rule:'Normal Sudoku rules apply. Lines that start with the same symbol contain the same digits in the same order from that symbol onward, for as long as both lines continue.',
    kind:'reflection',data:{reflectionGroups:[
      {symbol:'●',lines:[[[1,4],[2,3],[3,2]],[[5,3],[6,4],[7,5]]]},
      {symbol:'◆',lines:[[[0,4],[0,5],[0,6]],[[3,3],[4,3],[5,3]]]},
      {symbol:'✦',lines:[[[0,0],[0,1],[0,2]],[[1,5],[1,6],[1,7]]]}
    ]},puzzle:blank(),solution:solution
  });

  bank.push({
    id:'slingshot',title:'Slingshot Sudoku',family:'Cell relations',
    rule:'Normal Sudoku rules apply. Each slingshot marks an adjacent source cell and a direction. If the slingshot cell contains N, the source digit must appear again N cells away from the slingshot in the arrow direction.',
    kind:'slingshot',data:{slingshots:[
      {cell:[0,1],source:[1,1],dir:[0,1]},
      {cell:[0,2],source:[0,3],dir:[1,0]},
      {cell:[1,7],source:[0,7],dir:[0,-1]},
      {cell:[2,4],source:[2,3],dir:[1,0]},
      {cell:[3,7],source:[3,6],dir:[-1,0]},
      {cell:[4,1],source:[4,2],dir:[1,0]},
      {cell:[5,4],source:[6,4],dir:[0,-1]},
      {cell:[6,6],source:[6,5],dir:[-1,0]},
      {cell:[8,0],source:[7,0],dir:[0,1]}
    ]},puzzle:blank(),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
