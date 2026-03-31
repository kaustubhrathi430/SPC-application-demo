const pool = require('./database');

async function migrateV4() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_lists (
        id SERIAL PRIMARY KEY,
        list_key VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_recipients (
        id SERIAL PRIMARY KEY,
        list_key VARCHAR(50) NOT NULL REFERENCES email_lists(list_key) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(list_key, email)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        queue_type VARCHAR(50) NOT NULL,
        dedupe_key VARCHAR(150) NOT NULL UNIQUE,
        mailing_list_key VARCHAR(50) NOT NULL REFERENCES email_lists(list_key),
        subject TEXT NOT NULL,
        body_text TEXT,
        body_html TEXT,
        recipient_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        attachment_name TEXT NOT NULL,
        attachment_path TEXT NOT NULL,
        attachment_mime VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
        attachment_sha256 VARCHAR(64),
        attachment_size_bytes BIGINT,
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
        locked_at TIMESTAMP,
        locked_by VARCHAR(100),
        last_error TEXT,
        response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP,
        failed_at TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_recipients_list_key ON email_recipients(list_key, active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_status_next_attempt ON email_queue(status, next_attempt_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_dedupe_key ON email_queue(dedupe_key)`);

    await client.query(
      `INSERT INTO email_lists (list_key, display_name, description, enabled)
       VALUES
         ('shift_report', 'Shift Report Recipients', 'Recipients for shift report PDF delivery', true),
         ('daily_digest', 'Daily Digest Recipients', 'Recipients for daily digest PDF delivery', true)
       ON CONFLICT (list_key) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           description = EXCLUDED.description,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()`
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('V4 migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = migrateV4;
