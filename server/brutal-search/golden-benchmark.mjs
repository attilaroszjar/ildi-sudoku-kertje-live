import pg from 'pg';
import {
  GOLDEN_PROFILES,
  compactGoldenResult,
  evaluateGoldenPuzzle,
} from './lib/golden-benchmark-audit.js';

const { Pool } = pg;

function requireConnectionString() {
  const value = process.env.ILDI_SUDOKU_RESEARCH_DATABASE_URL;
  if (!value) throw new Error('ILDI_SUDOKU_RESEARCH_DATABASE_URL is required');
  return value;
}

async function loadBenchmarks(client) {
  const { rows } = await client.query(`
    SELECT benchmark_key, display_name, puzzle, expected_unique
    FROM calibration.classic_human_golden_benchmarks
    WHERE active = true
    ORDER BY benchmark_key
  `);
  return rows;
}

async function persistRun(client, benchmark, result) {
  await client.query(`
    INSERT INTO audit.classic_human_golden_runs (
      benchmark_key, profile, solver_version, rater_version, solve_status,
      exact_solution_count, score, raw_score, band, score_status,
      hardest_technique, advanced_steps, dependency_depth, total_steps,
      placements, eliminations, uses_server_preferred, uses_server_only,
      rating, trace, final_grid, stall_diagnostics
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb,$21,$22::jsonb
    )
  `, [
    benchmark.benchmark_key,
    result.profile,
    result.solverVersion,
    result.raterVersion,
    result.solveStatus,
    result.exactSolutionCount,
    result.score,
    result.rawScore,
    result.band,
    result.scoreStatus,
    result.hardestTechnique,
    result.advancedSteps,
    result.dependencyDepth,
    result.totalSteps,
    result.placements,
    result.eliminations,
    result.usesServerPreferred,
    result.usesServerOnly,
    JSON.stringify(result.rating),
    JSON.stringify(result.trace),
    result.finalGrid,
    JSON.stringify(result.stallDiagnostics || {}),
  ]);
}

async function main() {
  const pool = new Pool({ connectionString: requireConnectionString(), max: 2 });
  try {
    const client = await pool.connect();
    try {
      const benchmarks = await loadBenchmarks(client);
      if (benchmarks.length !== 2) throw new Error(`expected 2 active golden benchmarks, found ${benchmarks.length}`);
      const compact = [];
      for (const benchmark of benchmarks) {
        for (const profile of [GOLDEN_PROFILES.PRODUCTION_BRUTAL, GOLDEN_PROFILES.MAX_CAPABILITY]) {
          const result = evaluateGoldenPuzzle(benchmark.puzzle, profile);
          if (benchmark.expected_unique && result.exactSolutionCount !== 1) {
            throw new Error(`${benchmark.benchmark_key} uniqueness mismatch: ${result.exactSolutionCount}`);
          }
          await persistRun(client, benchmark, result);
          compact.push(compactGoldenResult(benchmark, result));
        }
      }
      console.log('CLASSIC_HUMAN_GOLDEN:PASS');
      console.log(`CLASSIC_HUMAN_GOLDEN_REPORT:${JSON.stringify(compact)}`);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`CLASSIC_HUMAN_GOLDEN:FAIL:${error.message}`);
  process.exitCode = 1;
});
