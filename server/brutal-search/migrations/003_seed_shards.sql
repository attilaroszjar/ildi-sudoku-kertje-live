BEGIN;

CREATE OR REPLACE FUNCTION search.ensure_shards(
  p_campaign_id bigint,
  p_seed_start bigint,
  p_seed_end bigint
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_shard_size bigint;
  v_inserted integer;
BEGIN
  IF p_seed_start < 0 OR p_seed_end <= p_seed_start THEN
    RAISE EXCEPTION 'invalid seed range [%..%)', p_seed_start, p_seed_end;
  END IF;

  SELECT shard_size
    INTO v_shard_size
    FROM search.campaigns
   WHERE id = p_campaign_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign % not found', p_campaign_id;
  END IF;

  IF mod(p_seed_start, v_shard_size) <> 0 THEN
    RAISE EXCEPTION 'seed_start % must align to shard_size %', p_seed_start, v_shard_size;
  END IF;

  INSERT INTO search.shards (
    campaign_id,
    shard_id,
    seed_start,
    seed_end,
    next_seed
  )
  SELECT
    p_campaign_id,
    floor(seed / v_shard_size)::bigint,
    seed,
    least(seed + v_shard_size, p_seed_end),
    seed
  FROM generate_series(
    p_seed_start,
    p_seed_end - 1,
    v_shard_size
  ) AS seed
  ON CONFLICT (campaign_id, shard_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMIT;
