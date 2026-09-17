(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,classic=bank.find(function(v){return v.id==='classic';}),antiKing=bank.find(function(v){return v.id==='anti-king';});
  if(!classic||!antiKing)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function orient(line,side){var out=line.slice();if(side==='right'||side==='bottom')out.reverse();return out;}
  function visibleCount(line){var max=0,count=0;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];count+=1;}return count;}
  function visibleSum(line){var max=0,sum=0;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];sum+=line[i];}return sum;}
  function allSides(solution,mode){var clues=[];for(var i=0;i<9;i+=1){[['row','left'],['col','top']].forEach(function(spec,si){var axis=spec[0],side=spec[1],line=orient(lineAt(solution,axis,i),side),cl={axis:axis,index:i,side:side};if(mode==='sum')cl.sum=visibleSum(line);else if(mode==='mixed'){var count=visibleCount(line),first=line[0];cl.value=((i+si)%2===0)?count:first;}else cl.count=visibleCount(line);clues.push(cl);});}return clues;}
  var classicSolution=classic.solution.map(function(row){return row.slice();});
  var nonTouchSolution=antiKing.solution.map(function(row){return row.slice();});
  bank.push({
    id:'skyscraper-sums',title:'Skyscraper Sums Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. Digits are building heights. Each outside clue is the sum of the heights of all buildings visible from that direction; taller buildings hide lower buildings behind them.',
    kind:'skyscrapersums',data:{clues:allSides(classicSolution,'sum')},puzzle:blank(),solution:classicSolution
  });
  bank.push({
    id:'skyscraper-mixed',title:'Mixed Information Skyscraper Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. Each outside clue gives either the number of visible buildings from that direction or the height of the nearest building. Which interpretation applies is not indicated.',
    kind:'skyscrapermixed',data:{clues:allSides(classicSolution,'mixed')},puzzle:blank(),solution:classicSolution
  });
  bank.push({
    id:'skyscraper-nontouching',title:'Non-touching Skyscraper Sudoku',family:'Outside clues',
    rule:'Normal Sudoku and skyscraper visibility rules apply. In addition, equal-height buildings may not touch diagonally.',
    kind:'skyscrapernontouching',data:{clues:allSides(nonTouchSolution,'count')},puzzle:blank(),solution:nonTouchSolution
  });
}(typeof window!=='undefined'?window:globalThis));
