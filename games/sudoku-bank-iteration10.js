(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,base=bank.find(function(v){return v.id==='classic';});
  if(!base)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function runningCellCount(line){
    var used=Array(line.length).fill(false);
    for(var i=0;i<line.length-1;i+=1)if(Math.abs(line[i]-line[i+1])===1){used[i]=true;used[i+1]=true;}
    return used.filter(Boolean).length;
  }
  function ascendingSequenceCount(line){
    var count=0,inRun=false;
    for(var i=0;i<line.length-1;i+=1){
      if(line[i]<line[i+1]){if(!inRun)count+=1;inRun=true;}else inRun=false;
    }
    return count;
  }
  function cluesFor(solution,measure){
    var clues=[];
    for(var i=0;i<9;i+=1){
      clues.push({axis:'row',index:i,side:'left',count:measure(lineAt(solution,'row',i))});
      clues.push({axis:'col',index:i,side:'top',count:measure(lineAt(solution,'col',i))});
    }
    return clues;
  }
  var solution=base.solution.map(function(row){return row.slice();});
  bank.push({
    id:'running-cells',title:'Running Cells Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. The clue to the left of each row or above each column gives the number of cells in that line that belong to at least one orthogonally adjacent consecutive-digit run (a neighboring pair differs by 1).',
    kind:'runningcells',data:{clues:cluesFor(solution,runningCellCount)},puzzle:blank(),solution:solution
  });
  bank.push({
    id:'ascending-sequences',title:'Ascending Sequences Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. The clue to the left of each row or above each column gives the number of maximal left-to-right or top-to-bottom strictly increasing sequences of length at least two. Digits in a sequence need not be consecutive.',
    kind:'ascendingsequences',data:{clues:cluesFor(solution,ascendingSequenceCount)},puzzle:blank(),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
