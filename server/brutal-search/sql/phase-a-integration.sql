\set ON_ERROR_STOP on
BEGIN;

INSERT INTO search.campaigns (
  name, variant, target_band, target_count,
  generator_version, seed_space_version, solver_version,
  rating_model_version, policy_version, shard_size
) VALUES (
  'phase-a-integration', 'classic', 'brutal', 2,
  'test-generator-v1', 'test-seeds-v1', 'test-solver-v1',
  'test-rating-v1', 'test-policy-v1', 100
)
RETURNING id \gset

SELECT search.ensure_shards(:id, 0, 250) AS inserted \gset
\if :inserted != 3
  \echo 'PHASE_A_DB_GATE:FAIL:seed-count'
  \quit 1
\endif

SELECT count(*) AS shard_count
FROM search.shards
WHERE campaign_id = :id
\gset
\if :shard_count != 3
  \echo 'PHASE_A_DB_GATE:FAIL:shard-count'
  \quit 1
\endif

SELECT * FROM search.claim_shard(:id, 'worker-a', 300) \gset
\if :'shard_id' != '0'
  \echo 'PHASE_A_DB_GATE:FAIL:first-claim'
  \quit 1
\endif

SELECT (search.checkpoint_shard(
  :id, :shard_id, 'worker-a', 40,
  40, 40, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0
)).next_seed AS checkpoint_seed \gset
\if :checkpoint_seed != 40
  \echo 'PHASE_A_DB_GATE:FAIL:checkpoint'
  \quit 1
\endif

UPDATE search.shards
SET status = 'LEASED', lease_owner = 'expired-worker', lease_expires_at = now() - interval '1 second'
WHERE campaign_id = :id AND shard_id = 0;

SELECT * FROM search.claim_shard(:id, 'worker-b', 300) \gset
\if :'shard_id' != '0'
  \echo 'PHASE_A_DB_GATE:FAIL:stale-reclaim'
  \quit 1
\endif
\if :'next_seed' != '40'
  \echo 'PHASE_A_DB_GATE:FAIL:resume-checkpoint'
  \quit 1
\endif

SELECT (search.checkpoint_shard(
  :id, :shard_id, 'worker-b', 100,
  60, 60, 0, 59, 0, 0, 0, 0, 0, 0, 1, 1
)).next_seed AS checkpoint_seed \gset
\if :checkpoint_seed != 100
  \echo 'PHASE_A_DB_GATE:FAIL:first-accept'
  \quit 1
\endif

SELECT * FROM search.claim_shard(:id, 'worker-c', 300) \gset
\if :'shard_id' != '1'
  \echo 'PHASE_A_DB_GATE:FAIL:second-shard'
  \quit 1
\endif

SELECT (search.checkpoint_shard(
  :id, :shard_id, 'worker-c', 200,
  100, 100, 0, 99, 0, 0, 0, 0, 0, 0, 1, 1
)).next_seed AS checkpoint_seed \gset
\if :checkpoint_seed != 200
  \echo 'PHASE_A_DB_GATE:FAIL:target-checkpoint'
  \quit 1
\endif

SELECT status, accepted_count FROM search.campaigns WHERE id = :id \gset
\if :'status' != 'TARGET_REACHED'
  \echo 'PHASE_A_DB_GATE:FAIL:target-status'
  \quit 1
\endif
\if :accepted_count != 2
  \echo 'PHASE_A_DB_GATE:FAIL:target-count'
  \quit 1
\endif

SELECT count(*) AS further_claims
FROM search.claim_shard(:id, 'worker-d', 300)
\gset
\if :further_claims != 0
  \echo 'PHASE_A_DB_GATE:FAIL:claim-after-target'
  \quit 1
\endif

ROLLBACK;
\echo 'PHASE_A_DB_GATE:PASS'
