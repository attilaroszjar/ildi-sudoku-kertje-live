BEGIN;

CREATE TABLE IF NOT EXISTS corpus.classic_fingerprints (
  domain text NOT NULL,
  fingerprint text NOT NULL,
  campaign_id bigint NOT NULL REFERENCES search.campaigns(id) ON DELETE CASCADE,
  seed bigint NOT NULL CHECK (seed >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, fingerprint),
  UNIQUE (campaign_id, seed)
);

CREATE INDEX IF NOT EXISTS classic_fingerprints_campaign_idx
  ON corpus.classic_fingerprints (campaign_id, seed);

CREATE TABLE IF NOT EXISTS corpus.classic_brutal_records (
  campaign_id bigint NOT NULL REFERENCES search.campaigns(id) ON DELETE CASCADE,
  seed bigint NOT NULL CHECK (seed >= 0),
  fingerprint text NOT NULL,
  clue_count smallint NOT NULL CHECK (clue_count BETWEEN 0 AND 81),
  record_hash text NOT NULL,
  puzzle_hash text NOT NULL,
  trace_hash text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  hardest_technique text,
  dependency_depth integer NOT NULL CHECK (dependency_depth >= 0),
  record jsonb NOT NULL,
  materialized_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, seed),
  UNIQUE (record_hash),
  FOREIGN KEY (campaign_id, seed)
    REFERENCES corpus.classic_fingerprints(campaign_id, seed)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS classic_brutal_records_score_idx
  ON corpus.classic_brutal_records (score DESC, dependency_depth DESC);

CREATE OR REPLACE FUNCTION corpus.claim_classic_fingerprint(
  p_domain text,
  p_fingerprint text,
  p_campaign_id bigint,
  p_seed bigint
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_campaign_id bigint;
  v_seed bigint;
BEGIN
  IF p_domain IS NULL OR length(p_domain) = 0 THEN
    RAISE EXCEPTION 'domain is required';
  END IF;
  IF p_fingerprint IS NULL OR length(p_fingerprint) = 0 THEN
    RAISE EXCEPTION 'fingerprint is required';
  END IF;
  IF p_seed < 0 THEN
    RAISE EXCEPTION 'seed must be non-negative';
  END IF;

  INSERT INTO corpus.classic_fingerprints(domain, fingerprint, campaign_id, seed)
  VALUES (p_domain, p_fingerprint, p_campaign_id, p_seed)
  ON CONFLICT (domain, fingerprint) DO NOTHING;

  SELECT campaign_id, seed
    INTO v_campaign_id, v_seed
    FROM corpus.classic_fingerprints
   WHERE domain = p_domain
     AND fingerprint = p_fingerprint;

  RETURN v_campaign_id = p_campaign_id AND v_seed = p_seed;
END;
$$;

CREATE OR REPLACE FUNCTION corpus.materialize_classic_brutal_record(
  p_campaign_id bigint,
  p_seed bigint,
  p_fingerprint text,
  p_clue_count smallint,
  p_record jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_fingerprint text;
  v_inserted integer;
BEGIN
  SELECT fingerprint
    INTO v_owner_fingerprint
    FROM corpus.classic_fingerprints
   WHERE campaign_id = p_campaign_id
     AND seed = p_seed
   FOR SHARE;

  IF NOT FOUND OR v_owner_fingerprint <> p_fingerprint THEN
    RAISE EXCEPTION 'fingerprint ownership mismatch for campaign %, seed %', p_campaign_id, p_seed;
  END IF;

  IF p_record->>'puzzleHash' IS NULL OR p_record->>'traceHash' IS NULL OR p_record->>'recordHash' IS NULL THEN
    RAISE EXCEPTION 'accepted record hashes are required';
  END IF;
  IF p_record->>'band' <> 'brutal' OR p_record->>'targetBand' <> 'brutal' THEN
    RAISE EXCEPTION 'accepted record must be brutal';
  END IF;

  INSERT INTO corpus.classic_brutal_records(
    campaign_id,
    seed,
    fingerprint,
    clue_count,
    record_hash,
    puzzle_hash,
    trace_hash,
    score,
    hardest_technique,
    dependency_depth,
    record
  ) VALUES (
    p_campaign_id,
    p_seed,
    p_fingerprint,
    p_clue_count,
    p_record->>'recordHash',
    p_record->>'puzzleHash',
    p_record->>'traceHash',
    (p_record->>'score')::integer,
    p_record->>'hardestTechnique',
    COALESCE((p_record->>'dependencyDepth')::integer, 0),
    p_record
  )
  ON CONFLICT (campaign_id, seed) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

COMMIT;
