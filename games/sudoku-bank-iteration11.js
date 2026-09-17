(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,classic=bank.find(function(v){return v.id==='classic';});
  if(!classic)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function extremaFor(solution){
    var out=[];
    for(var r=0;r<9;r+=1)for(var c=0;c<9;c+=1){
      var neighbours=[],dirs=[[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(function(d){var rr=r+d[0],cc=c+d[1];if(rr>=0&&rr<9&&cc>=0&&cc<9)neighbours.push(solution[rr][cc]);});
      if(neighbours.every(function(x){return solution[r][c]<x;}))out.push({cell:[r,c],type:'min'});
      else if(neighbours.every(function(x){return solution[r][c]>x;}))out.push({cell:[r,c],type:'max'});
    }
    return out;
  }
  var bishopSolution=[
    [1,2,3,4,5,6,7,8,9],
    [9,6,8,2,7,3,4,1,5],
    [5,7,4,8,1,9,2,3,6],
    [6,1,2,5,9,4,8,7,3],
    [7,3,9,6,8,1,5,2,4],
    [8,4,5,7,3,2,9,6,1],
    [2,9,6,1,4,7,3,5,8],
    [4,5,7,3,6,8,1,9,2],
    [3,8,1,9,2,5,6,4,7]
  ];
  bank.push({
    id:'bishopsgate',title:'Bishopsgate Sudoku',family:'Anti-constraints',
    rule:'Normal Sudoku rules apply. On the highlighted checkerboard colour only, equal digits may not see each other along any diagonal (a chess bishop move). The other checkerboard colour has no bishop restriction.',
    kind:'bishopsgate',data:{parity:0},puzzle:blank(),solution:bishopSolution
  });
  var minmaxSolution=classic.solution.map(function(row){return row.slice();});
  bank.push({
    id:'minmax',title:'Min / Max Sudoku',family:'Cell marks',
    rule:'Normal Sudoku rules apply. A cell marked as a minimum is smaller than every orthogonally adjacent cell; a cell marked as a maximum is larger than every orthogonally adjacent cell.',
    kind:'minmax',data:{extrema:extremaFor(minmaxSolution)},puzzle:blank(),solution:minmaxSolution
  });
}(typeof window!=='undefined'?window:globalThis));
