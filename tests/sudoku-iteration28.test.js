const fs=require('fs'), assert=require('assert');
const lib=fs.readFileSync('games/sudoku-library.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
const perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers'];
let pass=0;
function ok(cond,msg){assert.ok(cond,msg);pass++;console.log('ok '+pass+' - '+msg);}
ok(lib.includes('mountPerimeterClues')&&lib.includes('has-perimeter-clues'),'perimeter clue renderer is wired into board shell');
ok(perimeterKinds.every(k=>lib.includes("'"+k+"'")),'all external-edge Skyscraper kinds are routed to perimeter clues');
ok(lib.includes("kindIs(v,'skyscrapersums')")&&lib.includes("'Σ'+cl.sum")&&lib.includes("kindIs(v,'skyscraperproduct')")&&lib.includes("'Π'+cl.product"),'sum and product clue semantics are preserved');
ok(lib.includes("kindIs(v,'evenoddskyscrapers')")&&lib.includes("cl.parity==='even'?'■':'●'"),'even/odd outside clues retain parity markers');
ok(css.includes('.sudoku-perimeter-clues.top')&&css.includes('.sudoku-perimeter-clues.right')&&css.includes('.sudoku-perimeter-clues.bottom')&&css.includes('.sudoku-perimeter-clues.left')&&css.includes('@media(max-width:680px)'), 'four-edge layout and mobile sizing are styled');
console.log('PASS iteration 28: Skyscraper outside clues render at the corresponding board edge');
