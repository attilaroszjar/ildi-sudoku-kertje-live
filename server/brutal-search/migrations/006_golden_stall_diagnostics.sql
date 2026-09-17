BEGIN;

ALTER TABLE audit.classic_human_golden_runs
  ADD COLUMN IF NOT EXISTS stall_diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT, INSERT ON audit.classic_human_golden_runs TO ildi_sudoku_worker;
GRANT USAGE, SELECT ON SEQUENCE audit.classic_human_golden_runs_id_seq TO ildi_sudoku_worker;

COMMIT;
