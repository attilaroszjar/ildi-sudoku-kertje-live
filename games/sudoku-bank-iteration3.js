(function (root) {
  'use strict';
  if (!root.SudokuBank || !root.SudokuBank.length) return;
  var bank = root.SudokuBank;
  function cp(x) { return JSON.parse(JSON.stringify(x)); }
  function find(id) { return bank.find(function (v) { return v.id === id; }); }
  function add(id, title, family, rule, kind, data, solution) {
    var classic = find('classic');
    bank.push({ id:id, title:title, family:family, rule:rule, kind:kind, data:cp(data || {}), puzzle:cp(classic.puzzle), solution:cp(solution || classic.solution) });
  }
  function mergeData() {
    var out = {};
    Array.prototype.slice.call(arguments).forEach(function (data) {
      Object.keys(data || {}).forEach(function (key) {
        if (Array.isArray(data[key])) out[key] = (out[key] || []).concat(cp(data[key]));
        else out[key] = cp(data[key]);
      });
    });
    return out;
  }
  function combo(id, title, sources, rule) {
    var first = find(sources[0]), parts = sources.map(find);
    if (!first || parts.some(function (x) { return !x; })) return;
    bank.push({
      id:id, title:title, family:'Combinations', rule:rule,
      kind:'combined', kinds:parts.map(function (v) { return v.kind; }),
      data:mergeData.apply(null, parts.map(function (v) { return v.data; })),
      puzzle:cp(first.puzzle), solution:cp(first.solution)
    });
  }

  var dutch = [[5,0],[5,1],[6,1],[6,2],[6,3],[5,3],[5,4]];
  add('dutch-whispers','Dutch Whispers','Lines','Adjacent digits along each orange line differ by at least 4.','dutchwhispers',{lines:[dutch]});

  var nabner = [[0,0],[0,1],[1,1],[2,1],[2,0]];
  add('nabner','Nabner Line','Lines','Digits on a Nabner line do not repeat, and no two digits anywhere on the line are consecutive.','nabner',{lines:[nabner]});

  var lockout = [[0,0],[1,0],[2,0],[3,0],[4,0]];
  add('lockout','Lockout Line','Lines','The two diamond endpoints are different; every digit between them lies strictly outside the numerical range spanned by the endpoints.','lockout',{lines:[{cells:lockout}]});

  var base = find('classic').solution, frame=[];
  function sum3(values){return values[0]+values[1]+values[2];}
  for(var r=0;r<9;r+=1){frame.push({axis:'row',index:r,side:'left',sum:sum3(base[r].slice(0,3))});frame.push({axis:'row',index:r,side:'right',sum:sum3(base[r].slice(6).reverse())});}
  for(var c=0;c<9;c+=1){var col=base.map(function(row){return row[c];});frame.push({axis:'col',index:c,side:'top',sum:sum3(col.slice(0,3))});frame.push({axis:'col',index:c,side:'bottom',sum:sum3(col.slice(6).reverse())});}
  add('frame','Frame Sudoku','Outside clues','Each outside clue is the sum of the nearest three digits in that row or column.','frame',{clues:frame});

  combo('killer-thermo','Killer Thermo',['killer','thermo'],'Killer cage sums and non-repetition apply together with strictly increasing thermometer lines.');
  combo('killer-arrow','Killer Arrow',['killer','arrow'],'Killer cage sums apply together with arrows whose shaft digits sum to the circle.');
  combo('killer-palindrome','Killer Palindrome',['killer','palindrome'],'Killer cage sums apply together with palindrome lines that read the same in both directions.');
  combo('killer-zipper','Killer Zipper',['killer','zipper'],'Killer cage sums apply together with zipper lines: equidistant pairs sum to the centre digit.');
  combo('killer-entropic','Killer Entropic',['killer','entropic'],'Killer cage sums apply together with entropic lines containing one low, middle, and high digit in every three consecutive cells.');
  combo('killer-modular','Killer Modular',['killer','modular'],'Killer cage sums apply together with modular lines containing one digit from each residue class in every three consecutive cells.');
  combo('killer-renban','Killer Renban',['killer','renban'],'Killer cage sums apply together with Renban lines whose digits form a consecutive set in any order.');
  combo('killer-dutch-whispers','Killer Dutch Whispers',['killer','dutch-whispers'],'Killer cage sums apply together with Dutch Whisper lines where adjacent digits differ by at least 4.');
  combo('killer-lockout','Killer Lockout',['killer','lockout'],'Killer cage sums apply together with Lockout lines whose interior digits lie outside the endpoint range.');
}(typeof window !== 'undefined' ? window : globalThis));
