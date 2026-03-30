const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const HEALTH_TABLES = [
  'measurements',
  'shift_reports',
  'production_orders',
  'audit_log',
  'measurement_images',
  'skus',
  'lines',
  'line_freezers',
  'master_accounts',
  'master_config',
];

function getDiskSnapshot(targetPath) {
  try {
    if (typeof fs.statfsSync !== 'function') {
      return null;
    }
    const stats = fs.statfsSync(targetPath);
    return {
      path: targetPath,
      free_bytes: stats.bsize * stats.bavail,
      total_bytes: stats.bsize * stats.blocks,
    };
  } catch {
    return null;
  }
}

function listBackupFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const files = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        const stats = fs.statSync(entryPath);
        files.push({
          path: entryPath,
          size_bytes: stats.size,
          created_at: stats.mtime.toISOString(),
          mtimeMs: stats.mtimeMs,
        });
      }
    }
  }

  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

async function buildSystemHealthSnapshot() {
  const db = typeof pool.getDatabaseHealth === 'function'
    ? await pool.getDatabaseHealth()
    : { status: 'unknown', connected: false, latency_ms: null, last_error: null };

  const counts = {};
  for (const table of HEALTH_TABLES) {
    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
    counts[table] = parseInt(countResult.rows[0].total, 10);
  }

  const backupRoot = process.env.SPC_BACKUP_ROOT || '/backups';
  const backups = listBackupFiles(backupRoot);

  return {
    status: db.status === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    db,
    disk: {
      data: getDiskSnapshot('/data'),
      backups: getDiskSnapshot(backupRoot),
    },
    row_counts: counts,
    last_backup: backups[0] || null,
    app_version: process.env.APP_VERSION || 'dev',
  };
}

module.exports = {
  buildSystemHealthSnapshot,
};
