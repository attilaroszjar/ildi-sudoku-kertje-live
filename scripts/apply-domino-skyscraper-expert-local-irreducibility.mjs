import fs from 'node:fs';

const generatorPath='games/sudoku-generator.js';
const probePath='scripts/domino-skyscraper-expert-playability-frontier.mjs';

let generator=fs.readFileSync(generatorPath,'utf8');
let probe=fs.readFileSync(probePath,'utf8');

const oldGate="var expertLocalIrreducibility=variant.id==='classic-skyscrapers'&&difficulty==='expert';";
const newGate="var expertLocalIrreducibility=(variant.id==='classic-skyscrapers'||variant.id==='domino-skyscrapers')&&difficulty==='expert';";
if(generator.includes(oldGate)) generator=generator.replace(oldGate,newGate);
else if(!generator.includes(newGate)) throw new Error('expert local-irreducibility gate anchor not found');

const oldFamily="generatorFamily:variant.id==='classic-skyscrapers'?(expertLocalIrreducibility?'seeded-row-column-permutation-expert-local-irreducible':'seeded-row-column-permutation'):'seeded-latin-permutation-derived-dominoes',";
const newFamily="generatorFamily:variant.id==='classic-skyscrapers'?(expertLocalIrreducibility?'seeded-row-column-permutation-expert-local-irreducible':'seeded-row-column-permutation'):(expertLocalIrreducibility?'seeded-latin-permutation-derived-dominoes-expert-local-irreducible':'seeded-latin-permutation-derived-dominoes'),";
if(generator.includes(oldFamily)) generator=generator.replace(oldFamily,newFamily);
else if(!generator.includes(newFamily)) throw new Error('generator family anchor not found');

const probeAnchor="if(dominoes===0)failures.push('domino structure is empty');";
const probeAdd=`if(dominoes===0)failures.push('domino structure is empty');\nif(generated.generation?.verification!=='solver-verified-local-irreducible')failures.push(\`verification=\${generated.generation?.verification}, expected solver-verified-local-irreducible\`);\nif(!String(generated.generation?.generatorFamily||'').startsWith('seeded-latin-permutation-derived-dominoes-expert-local-irreducible'))failures.push(\`generatorFamily=\${generated.generation?.generatorFamily}, expected Domino expert local-irreducible family\`);\nif(generated.generation?.policy!=='contract-driven-local-irreducibility')failures.push(\`policy=\${generated.generation?.policy}, expected contract-driven-local-irreducibility\`);\nif(generated.generation?.localIrreducibilityProof!=='monotone-nonuniqueness-from-single-pass')failures.push(\`localIrreducibilityProof=\${generated.generation?.localIrreducibilityProof}, expected monotone proof\`);\nif(generated.generation?.locallyIrreducibleUnderProductionContract!==true)failures.push('locallyIrreducibleUnderProductionContract is not true');\nif(removable.length!==0)failures.push(\`\${removable.length} surviving givens remain individually removable\`);`;
if(probe.includes(probeAnchor) && !probe.includes("expected Domino expert local-irreducible family")) probe=probe.replace(probeAnchor,probeAdd);
else if(!probe.includes("expected Domino expert local-irreducible family")) throw new Error('probe assertion anchor not found');

fs.writeFileSync(generatorPath,generator);
fs.writeFileSync(probePath,probe);
console.log('DOMINO_SKYSCRAPER_EXPERT_LOCAL_IRREDUCIBILITY_PATCH:PASS');
