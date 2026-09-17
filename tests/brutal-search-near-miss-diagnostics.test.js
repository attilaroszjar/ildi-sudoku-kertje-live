import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRUTAL_MIN_SCORE,
  classifyAudit,
  compactRating,
  createSeedDiagnostic,
  summarizeDiagnostics,
} from '../server/brutal-search/lib/near-miss-diagnostics.js';

function rating(overrides = {}) {
  return {
    score: 231,
    rawScore: 231,
    band: 'expert',
    scoreStatus: 'PROVISIONAL_UNCALIBRATED',
    hardestTechnique: 'xy-wing',
    advancedSteps: 3,
    dependencyDepth: 4,
    usesServerPreferred: true,
    totalSteps: 61,
    placements: 49,
    eliminations: 27,
    trace: [{ deliberately: 'not retained' }],
    ...overrides,
  };
}

test('compact rating captures required near-miss metrics without trace', () => {
  const out = compactRating(rating());
  assert.equal(BRUTAL_MIN_SCORE, 240);
  assert.equal(out.distanceToBrutal, 9);
  assert.equal(out.hardestTechnique, 'xy-wing');
  assert.equal(out.advancedSteps, 3);
  assert.equal(out.dependencyDepth, 4);
  assert.equal(out.usesServerPreferred, true);
  assert.equal(out.totalSteps, 61);
  assert.equal(out.placements, 49);
  assert.equal(out.eliminations, 27);
  assert.equal('trace' in out, false);
});

test('audit outcomes distinguish solved Expert, incomplete and other rejection', () => {
  assert.equal(classifyAudit({ reason: 'BAND_MISMATCH', solveStatus: 'SOLVED_LOGICALLY', rating: rating() }), 'SOLVED_EXPERT');
  assert.equal(classifyAudit({ reason: 'UNRATED_INCOMPLETE', solveStatus: 'STALLED', rating: rating({ score: null, band: null }) }), 'STALLED_INCOMPLETE');
  assert.equal(classifyAudit({ reason: 'INVALID' }), 'OTHER_AUDIT_REJECT');
  assert.equal(classifyAudit({ reason: 'ACCEPTED' }), 'ACCEPTED');
});

test('summary aggregates prescreen survivors and bounded nearest samples', () => {
  const entries = [
    createSeedDiagnostic({ seed: 7, fingerprint: 'a', prescreen: { pass: true, status: 'STALLED', rating: rating({ score: null, band: null }) }, audit: { reason: 'BAND_MISMATCH', solveStatus: 'SOLVED_LOGICALLY', rating: rating({ score: 231 }) } }),
    createSeedDiagnostic({ seed: 8, fingerprint: 'b', prescreen: { pass: true, status: 'SOLVED_LOGICALLY', rating: rating({ score: 180 }) }, audit: { reason: 'BAND_MISMATCH', solveStatus: 'SOLVED_LOGICALLY', rating: rating({ score: 220 }) } }),
    createSeedDiagnostic({ seed: 9, fingerprint: 'c', prescreen: { pass: true, status: 'STALLED', rating: rating({ score: null, band: null }) }, audit: { reason: 'UNRATED_INCOMPLETE', solveStatus: 'STALLED', rating: rating({ score: null, band: null }) } }),
  ];
  const out = summarizeDiagnostics(entries, { sampleLimit: 2 });
  assert.equal(out.prescreenSurvivors, 3);
  assert.equal(out.fullAudits, 3);
  assert.equal(out.auditOutcome.SOLVED_EXPERT, 2);
  assert.equal(out.auditOutcome.STALLED_INCOMPLETE, 1);
  assert.equal(out.scoreHistogram['220_239'], 2);
  assert.equal(out.serverPreferredCount, 3);
  assert.deepEqual(out.nearMissSamples.map((entry) => entry.seed), [7, 8]);
  assert.equal(JSON.stringify(out).includes('deliberately'), false);
});
