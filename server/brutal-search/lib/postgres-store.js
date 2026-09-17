import pg from 'pg';

const { Pool } = pg;

const COUNTER_ORDER = [
  'searchedCount',
  'generatedCount',
  'invalidCount',
  'structuralRejectCount',
  'duplicateCount',
  'nonUniqueCount',
  'prescreenRejectCount',
  'fullAuditCount',
  'brutalRejectCount',
  'diversityRejectCount',
  'candidateCount',
  'acceptedCount',
];

function mapCampaign(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    status: row.status,
    targetCount: Number(row.target_count),
    acceptedCount: Number(row.accepted_count),
  };
}

function mapShard(row) {
  if (!row) return null;
  return {
    campaignId: Number(row.campaign_id),
    shardId: Number(row.shard_id),
    seedStart: Number(row.seed_start),
    seedEnd: Number(row.seed_end),
    nextSeed: Number(row.next_seed),
    leaseExpiresAt: row.lease_expires_at,
  };
}

function safeSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('seed must be a non-negative safe integer');
  return seed;
}

export function createPostgresStore({ connectionString, maxConnections = 2 }) {
  if (!connectionString) throw new TypeError('connectionString is required');
  if (!Number.isInteger(maxConnections) || maxConnections < 1 || maxConnections > 2) {
    throw new RangeError('maxConnections must be 1 or 2');
  }

  const pool = new Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'ildi-sudoku-brutal-search',
  });

  return {
    async getCampaign(campaignId) {
      const { rows } = await pool.query(
        'SELECT id, status, target_count, accepted_count FROM search.campaigns WHERE id = $1',
        [campaignId],
      );
      return mapCampaign(rows[0]);
    },

    async createPilotCampaign({ seedStart, seedEnd, targetCount = 999999 }) {
      safeSeed(seedStart);
      safeSeed(seedEnd);
      if (seedEnd <= seedStart) throw new RangeError('seedEnd must be greater than seedStart');
      if (!Number.isSafeInteger(targetCount) || targetCount < 1) throw new RangeError('targetCount must be positive');
      const token = `${Date.now()}-${process.pid}-${seedStart}-${seedEnd}`;
      const configuration = { kind: 'bounded-pilot', seedStart, seedEnd };
      const { rows } = await pool.query(
        `INSERT INTO search.campaigns(
           name, variant, target_band, target_count,
           generator_version, seed_space_version, solver_version,
           rating_model_version, policy_version, shard_size, status,
           configuration, started_at
         ) VALUES (
           $1, 'classic', 'brutal', $2,
           'classic-runtime-v1|classic-brutal-phase-b-v1', $3,
           'classic-human-v1', 'classic-rating-v2', 'bounded-pilot-v1',
           $4, 'RUNNING', $5::jsonb, now()
         )
         RETURNING id, status, target_count, accepted_count`,
        [`bounded-pilot-${token}`, targetCount, `micro-${token}`, Math.max(1, seedEnd - seedStart), JSON.stringify(configuration)],
      );
      return mapCampaign(rows[0]);
    },

    async finalizePilotCampaign({ campaignId, acceptedCount, report, status = 'COMPLETE' }) {
      if (!Number.isSafeInteger(acceptedCount) || acceptedCount < 0) throw new RangeError('acceptedCount must be non-negative');
      if (!['COMPLETE', 'FAILED', 'PAUSED'].includes(status)) throw new RangeError('invalid pilot final status');
      const { rows } = await pool.query(
        `UPDATE search.campaigns
            SET accepted_count = $2,
                status = $3,
                finished_at = now(),
                configuration = configuration || jsonb_build_object('pilotReport', $4::jsonb)
          WHERE id = $1
        RETURNING id, status, target_count, accepted_count`,
        [campaignId, acceptedCount, status, JSON.stringify(report ?? {})],
      );
      return mapCampaign(rows[0]);
    },

    async markTargetReached(campaignId) {
      const { rows } = await pool.query(
        `UPDATE search.campaigns
            SET status = 'TARGET_REACHED', finished_at = COALESCE(finished_at, now())
          WHERE id = $1 AND accepted_count >= target_count
        RETURNING id, status, target_count, accepted_count`,
        [campaignId],
      );
      return mapCampaign(rows[0]);
    },

    async claimShard({ campaignId, workerId, leaseSeconds }) {
      const { rows } = await pool.query(
        'SELECT * FROM search.claim_shard($1, $2, $3)',
        [campaignId, workerId, leaseSeconds],
      );
      return mapShard(rows[0]);
    },

    async checkpointShard({ campaignId, shardId, workerId, nextSeed, counters = {} }) {
      const deltas = COUNTER_ORDER.map((name) => {
        const value = counters[name] ?? 0;
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new RangeError(`${name} must be a non-negative safe integer`);
        }
        return value;
      });
      const params = [campaignId, shardId, workerId, nextSeed, ...deltas];
      const placeholders = params.map((_, index) => `$${index + 1}`).join(', ');
      const { rows } = await pool.query(
        `SELECT (search.checkpoint_shard(${placeholders})).*`,
        params,
      );
      return mapShard(rows[0]);
    },

    async claimClassicFingerprint({ domain, fingerprint, campaignId, seed }) {
      if (typeof domain !== 'string' || domain.length === 0) throw new TypeError('domain is required');
      if (typeof fingerprint !== 'string' || fingerprint.length === 0) throw new TypeError('fingerprint is required');
      safeSeed(seed);
      const { rows } = await pool.query(
        'SELECT corpus.claim_classic_fingerprint($1, $2, $3, $4) AS claimed',
        [domain, fingerprint, campaignId, seed],
      );
      return rows[0]?.claimed === true;
    },

    async materializeClassicBrutalRecord({ campaignId, seed, fingerprint, clueCount, record }) {
      safeSeed(seed);
      if (typeof fingerprint !== 'string' || fingerprint.length === 0) throw new TypeError('fingerprint is required');
      if (!Number.isInteger(clueCount) || clueCount < 0 || clueCount > 81) throw new RangeError('clueCount must be 0..81');
      if (!record || typeof record !== 'object') throw new TypeError('record is required');
      const { rows } = await pool.query(
        'SELECT corpus.materialize_classic_brutal_record($1, $2, $3, $4, $5::jsonb) AS inserted',
        [campaignId, seed, fingerprint, clueCount, JSON.stringify(record)],
      );
      return rows[0]?.inserted === true;
    },

    async countClassicCorpus(campaignId) {
      const { rows } = await pool.query(
        `SELECT
           (SELECT count(*)::bigint FROM corpus.classic_fingerprints WHERE campaign_id = $1) AS fingerprints,
           (SELECT count(*)::bigint FROM corpus.classic_brutal_records WHERE campaign_id = $1) AS records`,
        [campaignId],
      );
      return {
        fingerprints: Number(rows[0]?.fingerprints ?? 0),
        records: Number(rows[0]?.records ?? 0),
      };
    },

    async close() {
      await pool.end();
    },
  };
}
