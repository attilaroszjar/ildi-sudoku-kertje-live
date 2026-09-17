BEGIN;

CREATE SCHEMA IF NOT EXISTS search;
CREATE SCHEMA IF NOT EXISTS corpus;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS calibration;
CREATE SCHEMA IF NOT EXISTS production;

CREATE TABLE IF NOT EXISTS search.campaigns (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  variant text NOT NULL,
  target_band text NOT NULL,
  target_count integer NOT NULL CHECK (target_count > 0),
  generator_version text NOT NULL,
  seed_space_version text NOT NULL,
  solver_version text NOT NULL,
  rating_model_version text NOT NULL,
  policy_version text NOT NULL,
  shard_size bigint NOT NULL CHECK (shard_size > 0),
  status text NOT NULL DEFAULT 'READY' CHECK (status IN ('READY','RUNNING','TARGET_REACHED','PAUSED','FAILED','COMPLETE')),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  UNIQUE (variant, target_band, generator_version, seed_space_version, solver_version, rating_model_version, policy_version)
);

CREATE TABLE IF NOT EXISTS search.shards (
  campaign_id bigint NOT NULL REFERENCES search.campaigns(id) ON DELETE CASCADE,
  shard_id bigint NOT NULL,
  seed_start bigint NOT NULL,
  seed_end bigint NOT NULL,
  next_seed bigint NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','LEASED','DONE','FAILED')),
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  searched_count bigint NOT NULL DEFAULT 0,
  generated_count bigint NOT NULL DEFAULT 0,
  invalid_count bigint NOT NULL DEFAULT 0,
  structural_reject_count bigint NOT NULL DEFAULT 0,
  duplicate_count bigint NOT NULL DEFAULT 0,
  non_unique_count bigint NOT NULL DEFAULT 0,
  prescreen_reject_count bigint NOT NULL DEFAULT 0,
  full_audit_count bigint NOT NULL DEFAULT 0,
  brutal_reject_count bigint NOT NULL DEFAULT 0,
  diversity_reject_count bigint NOT NULL DEFAULT 0,
  candidate_count bigint NOT NULL DEFAULT 0,
  accepted_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, shard_id),
  CHECK (seed_start >= 0 AND seed_end > seed_start),
  CHECK (next_seed >= seed_start AND next_seed <= seed_end),
  CHECK ((status = 'LEASED') = (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS search_shards_claim_idx
  ON search.shards (campaign_id, status, shard_id)
  WHERE status IN ('PENDING','LEASED');
CREATE INDEX IF NOT EXISTS search_shards_lease_idx
  ON search.shards (lease_expires_at)
  WHERE status = 'LEASED';

COMMIT;
