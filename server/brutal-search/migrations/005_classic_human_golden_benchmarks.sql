BEGIN;

CREATE TABLE IF NOT EXISTS calibration.classic_human_golden_benchmarks (
  benchmark_key text PRIMARY KEY,
  display_name text NOT NULL,
  puzzle text NOT NULL UNIQUE CHECK (puzzle ~ '^[0-9]{81}$'),
  clue_count integer NOT NULL CHECK (clue_count BETWEEN 17 AND 81),
  expected_unique boolean NOT NULL DEFAULT true,
  creator text,
  published_year integer,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  purpose text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit.classic_human_golden_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  benchmark_key text NOT NULL REFERENCES calibration.classic_human_golden_benchmarks(benchmark_key),
  profile text NOT NULL CHECK (profile IN ('production-brutal','max-capability')),
  solver_version text NOT NULL,
  rater_version text NOT NULL,
  solve_status text NOT NULL,
  exact_solution_count integer NOT NULL CHECK (exact_solution_count BETWEEN 0 AND 2),
  score integer,
  raw_score integer,
  band text,
  score_status text,
  hardest_technique text,
  advanced_steps integer NOT NULL DEFAULT 0,
  dependency_depth integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 0,
  placements integer NOT NULL DEFAULT 0,
  eliminations integer NOT NULL DEFAULT 0,
  uses_server_preferred boolean NOT NULL DEFAULT false,
  uses_server_only boolean NOT NULL DEFAULT false,
  rating jsonb NOT NULL DEFAULT '{}'::jsonb,
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_grid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classic_human_golden_runs_lookup_idx
  ON audit.classic_human_golden_runs (benchmark_key, profile, created_at DESC);

INSERT INTO calibration.classic_human_golden_benchmarks
  (benchmark_key, display_name, puzzle, clue_count, expected_unique, creator, published_year, provenance, purpose)
VALUES
  (
    'ai-escargot-2006',
    'AI Escargot',
    '100007090030020008009600500005300900010080002600004000300000010040000007007000300',
    23,
    true,
    'Arto Inkala',
    2006,
    '{"class":"external-famous-hard","source":"published AI Escargot benchmark; independently rechecked before ingestion","reference":"AI Escargot / Arto Inkala (2006)"}'::jsonb,
    'Golden external difficulty benchmark for Classic Human solver correctness/completeness auditing.'
  ),
  (
    'inkala-2012',
    'Arto Inkala 2012 hardest Sudoku',
    '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
    21,
    true,
    'Arto Inkala',
    2012,
    '{"class":"external-famous-hard","source":"widely published Inkala 2012 benchmark; independently rechecked before ingestion","reference":"Arto Inkala hardest Sudoku (2012)"}'::jsonb,
    'Golden external difficulty benchmark for Classic Human solver correctness/completeness auditing.'
  )
ON CONFLICT (benchmark_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  puzzle = EXCLUDED.puzzle,
  clue_count = EXCLUDED.clue_count,
  expected_unique = EXCLUDED.expected_unique,
  creator = EXCLUDED.creator,
  published_year = EXCLUDED.published_year,
  provenance = EXCLUDED.provenance,
  purpose = EXCLUDED.purpose,
  active = true,
  updated_at = now();

GRANT SELECT ON calibration.classic_human_golden_benchmarks TO ildi_sudoku_worker;
GRANT SELECT, INSERT ON audit.classic_human_golden_runs TO ildi_sudoku_worker;
GRANT USAGE, SELECT ON SEQUENCE audit.classic_human_golden_runs_id_seq TO ildi_sudoku_worker;

COMMIT;
