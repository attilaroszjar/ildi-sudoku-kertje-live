(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank;
  function blank(n){return Array.from({length:n},function(){return Array(n).fill(0);});}
  function isChecker(solution,r,c){
    var a=solution[r-1][c-1]%2,b=solution[r-1][c]%2,d=solution[r][c-1]%2,e=solution[r][c]%2;
    return a===e&&b===d&&a!==b;
  }
  var base=bank.find(function(v){return v.id==='classic';});
  if(base){
    var solution=base.solution.map(function(row){return row.slice();}),marks=[];
    for(var r=1;r<9;r+=1)for(var c=1;c<9;c+=1)if(isChecker(solution,r,c))marks.push([r,c]);
    bank.push({
      id:'battenburg',title:'Battenburg Sudoku',family:'Cell marks',
      rule:'Normal Sudoku rules apply. Every 2x2 area whose odd and even digits form a checkerboard pattern is marked with a Battenburg clue; unmarked 2x2 areas may not form that pattern.',
      kind:'battenburg',data:{battenburg:marks,allGiven:true},puzzle:blank(9),solution:solution
    });
  }
}(typeof window!=='undefined'?window:globalThis));
