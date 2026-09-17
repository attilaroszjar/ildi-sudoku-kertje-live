export const GENERATOR_AUDIT_STATUS = Object.freeze({
  CATEGORY_A: 'CATEGORY_A',
  RECONCILE: 'RECONCILE',
  PARTIAL: 'PARTIAL',
  LEGACY: 'LEGACY',
  STATIC_GENERIC: 'STATIC_GENERIC'
});

export const CATEGORY_A_IDS = new Set([
  'classic',
  'diagonal','hyper','disjoint-groups','kropki','xv','consecutive','greater','odd-even',
  'whispers','renban','between','zipper','dutch-whispers','parity-line','nabner','palindrome',
  'lockout','entropic','modular','thermo','slow-thermo','region-sum','argyle','arrow',
  'killer','asterisk','magic-square','killer-thermo','killer-arrow','killer-palindrome',
  'killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout',
  'little-killer','clone','quadruple','fortress','x-sums','rossini','sandwich','jigsaw',
  'anti-king','anti-knight','nonconsecutive','miracle',
  'skyscraper','diagonal-skyscrapers','inside-skyscrapers','killer-skyscrapers','product-skyscrapers',
  'skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','skyscraper-sums','sum-skyscraper-parks',
  'even-sandwich','next-to-nine','numbered-rooms',
  'battenburg','minmax','quad-sums','top-heavy-parity',
  'couples','reflection','slingshot','bishopsgate','axia',
  'ascending-sequences','running-cells','anti-queen-9',
  'center-dot','frame','sukaku'
]);

export const RECONCILE_IDS = new Set([]);

export const LEGACY_IDS = new Set([]);

export const STATIC_GENERIC_IDS = new Set([]);

export const EXPECTED_77_SUMMARY = Object.freeze({
  CATEGORY_A: 77,
  RECONCILE: 0,
  PARTIAL: 0,
  LEGACY: 0,
  STATIC_GENERIC: 0
});

export function canonicalGeneratorAuditStatus(id){
  const matches=[];
  if(CATEGORY_A_IDS.has(id))matches.push(GENERATOR_AUDIT_STATUS.CATEGORY_A);
  if(RECONCILE_IDS.has(id))matches.push(GENERATOR_AUDIT_STATUS.RECONCILE);
  if(LEGACY_IDS.has(id))matches.push(GENERATOR_AUDIT_STATUS.LEGACY);
  if(STATIC_GENERIC_IDS.has(id))matches.push(GENERATOR_AUDIT_STATUS.STATIC_GENERIC);
  if(matches.length>1)throw new Error(`conflicting canonical generator audit states for ${id}: ${matches.join(', ')}`);
  return matches[0]||GENERATOR_AUDIT_STATUS.PARTIAL;
}

export function summarizeGeneratorAudit(ids){
  const unique=[...new Set(ids)];
  if(unique.length!==ids.length)throw new Error(`duplicate Sudoku generator audit ids: rows=${ids.length} unique=${unique.length}`);
  const statuses=Object.values(GENERATOR_AUDIT_STATUS);
  const byStatus=Object.fromEntries(statuses.map(status=>[status,0]));
  for(const id of unique)byStatus[canonicalGeneratorAuditStatus(id)]++;
  if(unique.length===77){
    for(const [status,expected] of Object.entries(EXPECTED_77_SUMMARY)){
      if(byStatus[status]!==expected)throw new Error(`canonical 77 summary drift for ${status}: expected=${expected} actual=${byStatus[status]}`);
    }
  }
  return {variants:unique.length,byStatus};
}
