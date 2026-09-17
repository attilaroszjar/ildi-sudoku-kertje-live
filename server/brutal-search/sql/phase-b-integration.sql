\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_campaign_id bigint;
  v_claim_first boolean;
  v_claim_replay boolean;
  v_claim_duplicate boolean;
  v_materialized boolean;
  v_materialized_replay boolean;
  v_fingerprint_count bigint;
  v_record_count bigint;
BEGIN
  INSERT INTO search.campaigns(
    name, variant, target_band, target_count,
    generator_version, seed_space_version, solver_version,
    rating_model_version, policy_version, shard_size, configuration
  ) VALUES (
    'phase-b-integration-gate', 'classic', 'brutal', 2,
    'phase-b-test-generator', 'phase-b-test-seeds', 'phase-b-test-solver',
    'phase-b-test-rating', 'phase-b-test-policy', 10, '{}'::jsonb
  )
  RETURNING id INTO v_campaign_id;

  SELECT corpus.claim_classic_fingerprint('phase-b-test', 'fp:alpha', v_campaign_id, 10::bigint)
    INTO v_claim_first;
  SELECT corpus.claim_classic_fingerprint('phase-b-test', 'fp:alpha', v_campaign_id, 10::bigint)
    INTO v_claim_replay;
  SELECT corpus.claim_classic_fingerprint('phase-b-test', 'fp:alpha', v_campaign_id, 11::bigint)
    INTO v_claim_duplicate;

  IF v_claim_first IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'first fingerprint claim must succeed';
  END IF;
  IF v_claim_replay IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'same campaign+seed replay must remain owned';
  END IF;
  IF v_claim_duplicate IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'different seed must see duplicate fingerprint';
  END IF;

  SELECT corpus.materialize_classic_brutal_record(
    v_campaign_id,
    10::bigint,
    'fp:alpha'::text,
    24::smallint,
    jsonb_build_object(
      'recordHash', 'record:test-alpha',
      'puzzleHash', 'puzzle:test-alpha',
      'traceHash', 'trace:test-alpha',
      'band', 'brutal',
      'targetBand', 'brutal',
      'score', 240,
      'hardestTechnique', 'aic',
      'dependencyDepth', 3
    )::jsonb
  ) INTO v_materialized;

  SELECT corpus.materialize_classic_brutal_record(
    v_campaign_id,
    10::bigint,
    'fp:alpha'::text,
    24::smallint,
    jsonb_build_object(
      'recordHash', 'record:test-alpha',
      'puzzleHash', 'puzzle:test-alpha',
      'traceHash', 'trace:test-alpha',
      'band', 'brutal',
      'targetBand', 'brutal',
      'score', 240,
      'hardestTechnique', 'aic',
      'dependencyDepth', 3
    )::jsonb
  ) INTO v_materialized_replay;

  IF v_materialized IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'first accepted materialization must insert';
  END IF;
  IF v_materialized_replay IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'accepted materialization replay must be idempotent';
  END IF;

  SELECT count(*) INTO v_fingerprint_count
    FROM corpus.classic_fingerprints
   WHERE campaign_id = v_campaign_id;
  SELECT count(*) INTO v_record_count
    FROM corpus.classic_brutal_records
   WHERE campaign_id = v_campaign_id;

  IF v_fingerprint_count <> 1 THEN
    RAISE EXCEPTION 'expected one compact fingerprint row, got %', v_fingerprint_count;
  END IF;
  IF v_record_count <> 1 THEN
    RAISE EXCEPTION 'expected one sparse accepted record, got %', v_record_count;
  END IF;
END;
$$;

SELECT 'PHASE_B_DB_GATE:PASS';
ROLLBACK;
