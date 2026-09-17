(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  var N=6,CLUE=6;
  function baseGrid(){var out=[];for(var r=0;r<N;r++){var row=[];for(var c=0;c<N;c++)row.push(((r+c)%N)+1);out.push(row);}return out;}
  function arrow(dir){return dir[0]===-1?'↑':dir[0]===1?'↓':dir[1]===-1?'←':'→';}
  function visible(line){var max=0,count=0;for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}return count;}
  var solution=baseGrid(),dirs=[[0,-1],[0,1],[-1,0],[1,0],[0,-1],[-1,0]],clues=[];
  for(var r=0;r<N;r++)for(var c=0;c<N;c++)if(solution[r][c]===CLUE){
    var dir=dirs[r],cells=[];for(var k=1;k<N;k++)cells.push([(r+dir[0]*k+N*10)%N,(c+dir[1]*k+N*10)%N]);
    clues.push({cell:[r,c],dir:dir.slice(),arrow:arrow(dir),count:visible(cells.map(function(p){return solution[p[0]][p[1]];})),cells:cells});
  }
  var puzzle=Array.from({length:N},function(){return Array(N).fill(0);});clues.forEach(function(cl){puzzle[cl.cell[0]][cl.cell[1]]=CLUE;});
  root.SudokuBank.push({
    id:'toroidal-skyscrapers',title:'Toroidal Skyscrapers',family:'Grid',kind:'toroidalskyscrapers',
    rule:'Fill the non-clue cells of the 6×6 toroidal grid with 1–5 so every row and column contains each building height exactly once. Each grey arrow clue is a viewpoint, not a building. Starting beside it in the arrow direction, continue across the wrapped edge until returning to the clue; the clue number gives how many buildings are visible, with taller buildings hiding shorter ones.',
    data:{latinOnly:true,inputMax:5,maxDigit:5,clueValue:CLUE,toroidalClues:clues,source:'World Puzzle Championship 2013 Instruction Booklet — Puzzle 9, Toroidal Skyscrapers'},
    puzzle:puzzle,solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
