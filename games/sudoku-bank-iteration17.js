(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,classic=bank.find(function(v){return v.id==='classic';}),killer=bank.find(function(v){return v.id==='killer';});
  if(!classic||!killer)return;
  var base=classic.solution.map(function(r){return r.slice();});
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function line(axis,index,side){var a=axis==='row'?base[index].slice():base.map(function(r){return r[index];});if(side==='right'||side==='bottom')a.reverse();return a;}
  function visibleCount(a){var max=0,count=0;for(var i=0;i<a.length;i+=1)if(a[i]>max){max=a[i];count+=1;}return count;}
  function visibleProduct(a){var max=0,product=1;for(var i=0;i<a.length;i+=1)if(a[i]>max){max=a[i];product*=a[i];}return product;}
  function clues(measure,key){var out=[];for(var r=0;r<9;r+=1){var side=r%2?'right':'left';var cl={axis:'row',index:r,side:side};cl[key]=measure(line('row',r,side));out.push(cl);}for(var c=0;c<9;c+=1){var side2=c%2?'bottom':'top';var cl2={axis:'col',index:c,side:side2};cl2[key]=measure(line('col',c,side2));out.push(cl2);}return out;}
  var productClues=clues(visibleProduct,'product');
  var killerClues=clues(visibleCount,'count');
  var cages=JSON.parse(JSON.stringify(killer.data.cages));
  bank.push({
    id:'product-skyscrapers',title:'Product Skyscrapers Sudoku',family:'Outside clues',
    rule:'Standard Sudoku rules apply. Each outside clue is the product of the heights of all skyscrapers visible from that direction. Taller buildings hide shorter buildings behind them.',
    kind:'skyscraperproduct',data:{clues:productClues},puzzle:blank(),solution:base
  });
  bank.push({
    id:'killer-skyscrapers',title:'Killer Skyscrapers Sudoku',family:'Cages',
    rule:'Standard Sudoku, Killer cage, and Skyscraper rules all apply. Digits do not repeat in a cage and sum to its clue; outside clues give the number of visible skyscrapers from that direction.',
    kind:'killerskyscrapers',data:{clues:killerClues,cages:cages},puzzle:blank(),solution:base
  });
}(typeof window!=='undefined'?window:globalThis));
