(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,base=bank.find(function(v){return v.id==='classic';});
  if(!base)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  var solution=base.solution.map(function(row){return row.slice();});
  var axia=[];
  for(var r=0;r<9;r+=1)for(var c=0;c<9;c+=1){
    var value=solution[r][c],ok=true;
    for(var dr=-1;dr<=1;dr+=2)for(var dc=-1;dc<=1;dc+=2)for(var k=1;;k+=1){
      var rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=9||cc<0||cc>=9)break;if(solution[rr][cc]===value)ok=false;
    }
    if(ok)axia.push([r,c]);
  }
  axia=axia.filter(function(_,index){return index%2===0;});
  bank.push({id:'axia',title:'Axia Sudoku',family:'Cell marks',rule:'Normal Sudoku rules apply. A digit in an Axia-marked cell may not appear again anywhere on either diagonal extending from that cell. Unmarked cells do not create this restriction.',kind:'axia',data:{axia:axia},puzzle:blank(),solution:solution});

  var couples=[];
  for(r=0;r<9;r+=1)for(c=0;c<9;c+=1){
    if(c<8)couples.push({a:[r,c],b:[r,c+1],same:(solution[r][c]%2)===(solution[r][c+1]%2)});
    if(r<8)couples.push({a:[r,c],b:[r+1,c],same:(solution[r][c]%2)===(solution[r+1][c]%2)});
  }
  couples=couples.filter(function(_,index){return index%4===0;});
  bank.push({id:'couples',title:'Couples Sudoku',family:'Cell relations',rule:'Normal Sudoku rules apply. Cells separated by ~ have the same parity (both odd or both even). Cells separated by a slashed ~ have different parity.',kind:'couples',data:{couples:couples},puzzle:blank(),solution:solution});
}(typeof window!=='undefined'?window:globalThis));
