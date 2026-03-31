const pool = require('../config/database');
const {
  ensureDirectories,
  DEFAULT_POLL_INTERVAL_MS,
  queueDueDailyDigests,
  processEmailQueueOnce,
} = require('../services/emailService');

const WORKER_ID = process.env.EMAIL_WORKER_ID || `email-worker-${process.pid}`;
const POLL_INTERVAL_MS = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || String(DEFAULT_POLL_INTERVAL_MS), 10);

let running = false;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref?.();
  });
}

async function waitForEmailSchema(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await pool.query(
        `SELECT to_regclass('public.email_queue') AS email_queue,
                to_regclass('public.email_lists') AS email_lists`
      );
      if (result.rows[0]?.email_queue && result.rows[0]?.email_lists) {
        return true;
      }
    } catch (err) {
      if (!err || err.code !== '42P01') {
        throw err;
      }
    }
    await sleep(500);
  }
  return false;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await queueDueDailyDigests();
    const results = await processEmailQueueOnce(WORKER_ID);
    if (results.length > 0) {
      console.log(`[email-worker] processed ${results.length} job(s)`);
    }
  } catch (err) {
    console.error('[email-worker] tick failed:', err);
  } finally {
    running = false;
  }
}

async function start() {
  ensureDirectories();
  console.log('[email-worker] waiting for database...');
  await pool.waitForDatabase();
  const schemaReady = await waitForEmailSchema();
  if (!schemaReady) {
    console.warn('[email-worker] email schema is not ready yet; continuing to poll until migrations finish');
  }
  console.log(`[email-worker] started with poll interval ${POLL_INTERVAL_MS}ms`);

  await tick();
  setInterval(() => {
    tick().catch((err) => console.error('[email-worker] interval failure:', err));
  }, POLL_INTERVAL_MS).unref();
}

process.on('SIGTERM', async () => {
  try {
    await pool.closePool();
  } finally {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  try {
    await pool.closePool();
  } finally {
    process.exit(0);
  }
});

start().catch(async (err) => {
  console.error('[email-worker] failed to start:', err);
  try {
    await pool.closePool();
  } finally {
    process.exit(1);
  }
});
