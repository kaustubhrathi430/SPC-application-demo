const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'spc_db',
  user: process.env.DB_USER || 'spc_user',
  password: process.env.DB_PASSWORD || 'spc_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const state = {
  connected: false,
  lastConnectedAt: null,
  lastCheckedAt: null,
  lastLatencyMs: null,
  lastError: null,
};

function markConnected(latencyMs) {
  state.connected = true;
  state.lastCheckedAt = new Date().toISOString();
  state.lastConnectedAt = state.lastCheckedAt;
  state.lastLatencyMs = latencyMs;
  state.lastError = null;
}

function markDisconnected(err) {
  state.connected = false;
  state.lastCheckedAt = new Date().toISOString();
  state.lastError = err ? err.message : 'Unknown database error';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

pool.on('error', (err) => {
  markDisconnected(err);
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function waitForDatabase(options = {}) {
  const {
    maxAttempts = 8,
    initialDelayMs = 500,
    maxDelayMs = 10000,
  } = options;

  let attempt = 1;
  let delayMs = initialDelayMs;

  while (attempt <= maxAttempts) {
    try {
      const startedAt = Date.now();
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      markConnected(Date.now() - startedAt);
      return { ...state };
    } catch (err) {
      markDisconnected(err);
      if (attempt === maxAttempts) {
        throw err;
      }
      console.warn(`Database connection attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs}ms.`);
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, maxDelayMs);
      attempt += 1;
    }
  }

  throw new Error('Database connection retry loop exhausted');
}

async function getDatabaseHealth() {
  try {
    const startedAt = Date.now();
    await pool.query('SELECT 1');
    markConnected(Date.now() - startedAt);
    return {
      status: 'ok',
      connected: true,
      latency_ms: state.lastLatencyMs,
      last_connected_at: state.lastConnectedAt,
      last_checked_at: state.lastCheckedAt,
      last_error: null,
    };
  } catch (err) {
    markDisconnected(err);
    return {
      status: 'error',
      connected: false,
      latency_ms: null,
      last_connected_at: state.lastConnectedAt,
      last_checked_at: state.lastCheckedAt,
      last_error: state.lastError,
    };
  }
}

async function closePool() {
  await pool.end();
}

module.exports = Object.assign(pool, {
  waitForDatabase,
  getDatabaseHealth,
  closePool,
});
