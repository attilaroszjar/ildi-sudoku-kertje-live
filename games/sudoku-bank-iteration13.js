(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,base=bank.find(function(v){return v.id==='classic';});
  if(!base)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function evenSandwichDigits(line){
    var out=[];
    for(var i=1;i<line.length-1;i+=1)if(line[i-1]%2===0&&line[i+1]%2===0)out.push(line[i]);
    return out.sort(function(a,b){return a-b;});
  }
  function evenSandwichClues(solution){
    var clues=[];
    for(var i=0;i<9;i+=1){
      clues.push({axis:'row',index:i,side:'left',digits:evenSandwichDigits(lineAt(solution,'row',i))});
      clues.push({axis:'col',index:i,side:'top',digits:evenSandwichDigits(lineAt(solution,'col',i))});
    }
    return clues;
  }
  var classicSolution=base.solution.map(function(row){return row.slice();});
  var topHeavySolution=[
    [9,8,7,6,5,4,3,2,1],[5,4,1,7,3,2,8,9,6],[6,3,2,8,1,9,7,5,4],
    [1,6,9,3,8,7,5,4,2],[4,7,8,1,2,5,6,3,9],[3,2,5,4,9,6,1,8,7],
    [8,9,3,2,6,1,4,7,5],[7,5,6,9,4,8,2,1,3],[2,1,4,5,7,3,9,6,8]
  ];
  bank.push({
    id:'even-sandwich',title:'Even Sandwich Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. The clues to the left and above list every digit in that row or column whose two immediate neighbours in the same line are both even. All such digits are given; a blank clue means there are none.',
    kind:'evensandwich',data:{clues:evenSandwichClues(classicSolution)},puzzle:blank(),solution:classicSolution
  });
  bank.push({
    id:'top-heavy-parity',title:'Top-Heavy Parity Sudoku',family:'Cell relations',
    rule:'Normal Sudoku rules apply. Whenever two vertically adjacent digits have the same parity, the upper digit must be larger than the lower digit.',
    kind:'topheavyparity',data:{},puzzle:blank(),solution:topHeavySolution
  });
}(typeof window!=='undefined'?window:globalThis));
