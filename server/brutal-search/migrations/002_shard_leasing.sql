BEGIN;

CREATE OR REPLACE FUNCTION search.claim_shard(
  p_campaign_id bigint,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 120
)
RETURNS TABLE (
  campaign_id bigint,
  shard_id bigint,
  seed_start bigint,
  seed_end bigint,
  next_seed bigint,
  lease_expires_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
    RAISE EXCEPTION 'worker id is required';
  END IF;
  IF p_lease_seconds < 10 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'lease seconds must be between 10 and 3600';
  END IF;

  UPDATE search.campaigns c
     SET status = 'TARGET_REACHED',
         finished_at = COALESCE(c.finished_at, v_now)
   WHERE c.id = p_campaign_id
     AND c.accepted_count >= c.target_count
     AND c.status <> 'TARGET_REACHED';

  RETURN QUERY
  WITH candidate AS (
    SELECT s.campaign_id, s.shard_id
      FROM search.shards s
      JOIN search.campaigns c ON c.id = s.campaign_id
     WHERE s.campaign_id = p_campaign_id
       AND c.status IN ('READY','RUNNING')
       AND c.accepted_count < c.target_count
       AND s.next_seed < s.seed_end
       AND (
         s.status = 'PENDING'
         OR (s.status = 'LEASED' AND s.lease_expires_at <= v_now)
       )
     ORDER BY s.shard_id
     FOR UPDATE OF s SKIP LOCKED
     LIMIT 1
  )
  UPDATE search.shards s
     SET status = 'LEASED',
         lease_owner = p_worker_id,
         lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
         attempt_count = s.attempt_count + 1,
         updated_at = v_now
    FROM candidate x
   WHERE s.campaign_id = x.campaign_id
     AND s.shard_id = x.shard_id
  RETURNING s.campaign_id, s.shard_id, s.seed_start, s.seed_end, s.next_seed, s.lease_expires_at;

  UPDATE search.campaigns c
     SET status = 'RUNNING',
         started_at = COALESCE(c.started_at, v_now)
   WHERE c.id = p_campaign_id
     AND c.status = 'READY'
     AND FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION search.checkpoint_shard(
  p_campaign_id bigint,
  p_shard_id bigint,
  p_worker_id text,
  p_next_seed bigint,
  p_searched_delta bigint DEFAULT 0,
  p_generated_delta bigint DEFAULT 0,
  p_invalid_delta bigint DEFAULT 0,
  p_structural_reject_delta bigint DEFAULT 0,
  p_duplicate_delta bigint DEFAULT 0,
  p_non_unique_delta bigint DEFAULT 0,
  p_prescreen_reject_delta bigint DEFAULT 0,
  p_full_audit_delta bigint DEFAULT 0,
  p_brutal_reject_delta bigint DEFAULT 0,
  p_diversity_reject_delta bigint DEFAULT 0,
  p_candidate_delta bigint DEFAULT 0,
  p_accepted_delta integer DEFAULT 0
)
RETURNS search.shards
LANGUAGE plpgsql
AS $$
DECLARE
  v_shard search.shards;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF LEAST(
    p_searched_delta,
    p_generated_delta,
    p_invalid_delta,
    p_structural_reject_delta,
    p_duplicate_delta,
    p_non_unique_delta,
    p_prescreen_reject_delta,
    p_full_audit_delta,
    p_brutal_reject_delta,
    p_diversity_reject_delta,
    p_candidate_delta,
    p_accepted_delta
  ) < 0 THEN
    RAISE EXCEPTION 'checkpoint deltas must be non-negative';
  END IF;

  SELECT *
    INTO v_shard
    FROM search.shards s
   WHERE s.campaign_id = p_campaign_id
     AND s.shard_id = p_shard_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shard not found';
  END IF;
  IF v_shard.status <> 'LEASED' OR v_shard.lease_owner <> p_worker_id THEN
    RAISE EXCEPTION 'worker does not own shard lease';
  END IF;
  IF p_next_seed < v_shard.next_seed OR p_next_seed > v_shard.seed_end THEN
    RAISE EXCEPTION 'checkpoint seed outside monotonic shard range';
  END IF;

  UPDATE search.shards s
     SET next_seed = p_next_seed,
         searched_count = s.searched_count + p_searched_delta,
         generated_count = s.generated_count + p_generated_delta,
         invalid_count = s.invalid_count + p_invalid_delta,
         structural_reject_count = s.structural_reject_count + p_structural_reject_delta,
         duplicate_count = s.duplicate_count + p_duplicate_delta,
         non_unique_count = s.non_unique_count + p_non_unique_delta,
         prescreen_reject_count = s.prescreen_reject_count + p_prescreen_reject_delta,
         full_audit_count = s.full_audit_count + p_full_audit_delta,
         brutal_reject_count = s.brutal_reject_count + p_brutal_reject_delta,
         diversity_reject_count = s.diversity_reject_count + p_diversity_reject_delta,
         candidate_count = s.candidate_count + p_candidate_delta,
         accepted_count = s.accepted_count + p_accepted_delta,
         status = CASE WHEN p_next_seed = s.seed_end THEN 'DONE' ELSE 'PENDING' END,
         lease_owner = NULL,
         lease_expires_at = NULL,
         updated_at = v_now
   WHERE s.campaign_id = p_campaign_id
     AND s.shard_id = p_shard_id
  RETURNING * INTO v_shard;

  IF p_accepted_delta > 0 THEN
    UPDATE search.campaigns c
       SET accepted_count = c.accepted_count + p_accepted_delta,
           status = CASE
             WHEN c.accepted_count + p_accepted_delta >= c.target_count THEN 'TARGET_REACHED'
             ELSE c.status
           END,
           finished_at = CASE
             WHEN c.accepted_count + p_accepted_delta >= c.target_count THEN COALESCE(c.finished_at, v_now)
             ELSE c.finished_at
           END
     WHERE c.id = p_campaign_id;
  END IF;

  RETURN v_shard;
END;
$$;

COMMIT;
