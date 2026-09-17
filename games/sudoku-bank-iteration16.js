(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,base=bank[0].solution.map(function(r){return r.slice();});
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function visible(line){var max=0,count=0;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];count+=1;}return count;}
  function ray(r,c,dr,dc,includeStart){var out=[],rr=includeStart?r:r+dr,cc=includeStart?c:c+dc;for(;rr>=0&&rr<9&&cc>=0&&cc<9;rr+=dr,cc+=dc)out.push([rr,cc]);return out;}
  function values(cells){return cells.map(function(p){return base[p[0]][p[1]];});}
  var dirs=[[-1,0,'↑'],[1,0,'↓'],[0,-1,'←'],[0,1,'→']],inside=[];
  for(var r=0;r<9;r+=1)for(var c=0;c<9;c+=1)for(var di=0;di<dirs.length;di+=1){var d=dirs[di],cells=ray(r,c,d[0],d[1],false);if(cells.length>=2&&visible(values(cells))===base[r][c])inside.push({source:[r,c],dir:[d[0],d[1]],arrow:d[2],cells:cells});}
  /* Keep a readable, distributed subset; each clue remains solution-derived. */
  inside=inside.filter(function(cl,i){return [0,2,5,7,9,11,13,15,17,19,21,23,25,27,29].indexOf(i)>=0;});
  var diagonal=[],dd=[[1,1,'↘'],[1,-1,'↙'],[-1,1,'↗'],[-1,-1,'↖']];
  for(r=0;r<9;r+=1)for(c=0;c<9;c+=1)if(r===0||r===8||c===0||c===8)for(di=0;di<dd.length;di+=1){d=dd[di];var pr=r-d[0],pc=c-d[1];if(pr>=0&&pr<9&&pc>=0&&pc<9)continue;cells=ray(r,c,d[0],d[1],true);if(cells.length>=4)diagonal.push({start:[r,c],dir:[d[0],d[1]],arrow:d[2],cells:cells,count:visible(values(cells))});}
  diagonal=diagonal.filter(function(cl,i){return i%3!==1;});
  bank.push({id:'inside-skyscrapers',title:'Inside Skyscrapers Sudoku',family:'Outside clues',rule:'Standard Sudoku rules apply. A digit in a cell with an arrow gives the number of skyscrapers visible from that cell in the arrow direction; the clue cell itself is the viewpoint and is not counted.',kind:'insideskyscrapers',data:{sightClues:inside},puzzle:blank(),solution:base});
  bank.push({id:'diagonal-skyscrapers',title:'Diagonal Skyscraper Sudoku',family:'Outside clues',rule:'Standard Sudoku rules apply. Outside clues give the number of skyscrapers visible along the indicated diagonal sightline. Taller buildings hide shorter buildings behind them; digits may repeat along a diagonal if Sudoku allows it.',kind:'diagonalskyscrapers',data:{sightClues:diagonal},puzzle:blank(),solution:base});
}(typeof window!=='undefined'?window:globalThis));
