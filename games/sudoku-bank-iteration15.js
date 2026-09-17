(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function parksSolution(){
    var out=[];
    for(var r=0;r<9;r+=1){var row=[];for(var c=0;c<9;c+=1)row.push(((r+c*2)%9)+1);out.push(row);}
    return out;
  }
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function orient(line,side){var out=line.slice();if(side==='right'||side==='bottom')out.reverse();return out;}
  function buildings(line){return line.filter(function(v){return v!==9;});}
  function visibleCount(line){var max=0,count=0;buildings(line).forEach(function(v){if(v>max){max=v;count+=1;}});return count;}
  function visibleSum(line){var max=0,sum=0;buildings(line).forEach(function(v){if(v>max){max=v;sum+=v;}});return sum;}
  function clues(solution,mode){
    var out=[],sides=[['row','left'],['row','right'],['col','top'],['col','bottom']];
    for(var i=0;i<9;i+=1)sides.forEach(function(spec){var line=orient(lineAt(solution,spec[0],i),spec[1]),cl={axis:spec[0],index:i,side:spec[1]};if(mode==='sum')cl.sum=visibleSum(line);else cl.count=visibleCount(line);out.push(cl);});
    return out;
  }
  var solution=parksSolution();
  bank.push({
    id:'skyscraper-parks',title:'Skyscrapers Parks',family:'Grid',
    rule:'Fill every row and column with building heights 1–8 exactly once plus one park. Parks are empty ground: they do not count as buildings and do not block the view. Outside clues give the number of visible buildings.',
    kind:'skyscraperparks',data:{parkValue:9,clues:clues(solution,'count'),latinOnly:true},puzzle:blank(),solution:solution
  });
  bank.push({
    id:'sum-skyscraper-parks',title:'Sum Skyscrapers Parks',family:'Grid',
    rule:'Fill every row and column with building heights 1–8 exactly once plus one park. Parks do not block the view. Each outside clue is the sum of the heights of all visible buildings from that direction.',
    kind:'sumskyscraperparks',data:{parkValue:9,clues:clues(solution,'sum'),latinOnly:true},puzzle:blank(),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
