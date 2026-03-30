const pool = require('./database');

const migrateV3 = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Running v3 migrations...');

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // ============================================================
    // 1. LINE_FREEZERS TABLE — per-freezer pump configuration
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS line_freezers (
        id SERIAL PRIMARY KEY,
        line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
        freezer_number INTEGER NOT NULL,
        pump_count INTEGER NOT NULL DEFAULT 1,
        asset_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(line_id, freezer_number)
      );
    `);

    // ============================================================
    // 2. AUDIT_LOG TABLE — immutable compliance trail
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL,
        changed_by VARCHAR(100) NOT NULL,
        reason TEXT,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)`);

    // ============================================================
    // 3. MASTER_ACCOUNTS TABLE — individual master owner accounts
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ============================================================
    // 4. MASTER_CONFIG TABLE — system configuration key-value store
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by VARCHAR(100)
      );
    `);

    // ============================================================
    // 5. PRODUCTION_ORDERS — add PO number + review fields
    // ============================================================
    await client.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS po_number VARCHAR(50) NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
    await client.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100)`);

    // Update status check constraint to include 'reviewed'
    await client.query(`ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS production_orders_status_check`);
    await client.query(`
      ALTER TABLE production_orders ADD CONSTRAINT production_orders_status_check
        CHECK (status IN ('active', 'completed', 'reviewed'))
    `);

    // ============================================================
    // 6. MEASUREMENTS — add pump, idempotency, versioning, OOC ack
    // ============================================================
    await client.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS pump_number INTEGER NOT NULL DEFAULT 1`);
    await client.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`);
    await client.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS status_overall VARCHAR(16) DEFAULT 'in_control'`);
    await client.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS alert_acknowledged_at TIMESTAMP`);
    await client.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS alert_acknowledged_by VARCHAR(50)`);

    // client_id for idempotency — needs special handling for existing rows
    const clientIdExists = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'measurements' AND column_name = 'client_id'
    `);
    if (clientIdExists.rows.length === 0) {
      // Add column with default for existing rows
      await client.query(`ALTER TABLE measurements ADD COLUMN client_id UUID DEFAULT gen_random_uuid()`);
      // Backfill existing rows with unique UUIDs
      await client.query(`UPDATE measurements SET client_id = gen_random_uuid() WHERE client_id IS NULL`);
      // Now make it NOT NULL
      await client.query(`ALTER TABLE measurements ALTER COLUMN client_id SET NOT NULL`);
    }

    // ============================================================
    // 7. LINES — add asset_id
    // ============================================================
    await client.query(`ALTER TABLE lines ADD COLUMN IF NOT EXISTS asset_id VARCHAR(50)`);

    // ============================================================
    // 8. INDEXES — performance for 5-year data volume
    // ============================================================
    await client.query(`CREATE INDEX IF NOT EXISTS idx_measurements_composite ON measurements(line_id, shift_date, freezer_number, pump_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_measurements_po_recorded ON measurements(production_order_id, recorded_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_measurements_pump ON measurements(freezer_number, pump_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_production_orders_po_number ON production_orders(po_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shift_reports_created_desc ON shift_reports(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_measurement_images_mid ON measurement_images(measurement_id)`);
    await client.query(`ALTER TABLE shift_reports ADD COLUMN IF NOT EXISTS production_order_id INTEGER`);
    await client.query(`ALTER TABLE shift_reports ADD COLUMN IF NOT EXISTS po_number VARCHAR(50)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shift_reports_po_number ON shift_reports(po_number)`);

    // Unique index on client_id for idempotency
    // Use IF NOT EXISTS pattern via checking pg_indexes
    const clientIdxExists = await client.query(`
      SELECT indexname FROM pg_indexes WHERE indexname = 'idx_measurements_client_id'
    `);
    if (clientIdxExists.rows.length === 0) {
      await client.query(`CREATE UNIQUE INDEX idx_measurements_client_id ON measurements(client_id)`);
    }

    // ============================================================
    // 9. SEED LINE_FREEZERS from existing lines data
    // ============================================================
    const existingFreezerRows = await client.query(`SELECT COUNT(*) as cnt FROM line_freezers`);
    if (parseInt(existingFreezerRows.rows[0].cnt) === 0) {
      console.log('Seeding line_freezers from existing lines...');
      const linesResult = await client.query(`SELECT id, name, freezer_count FROM lines`);
      for (const line of linesResult.rows) {
        // Klondike 2 and 3 (line_2, line_3) have dual pumps
        const pumpCount = (line.name === 'line_2' || line.name === 'line_3') ? 2 : 1;
        for (let f = 1; f <= line.freezer_count; f++) {
          await client.query(
            `INSERT INTO line_freezers (line_id, freezer_number, pump_count)
             VALUES ($1, $2, $3)
             ON CONFLICT (line_id, freezer_number) DO NOTHING`,
            [line.id, f, pumpCount]
          );
        }
      }
      console.log('Line freezers seeded successfully');
    }

    await client.query('COMMIT');
    console.log('V3 migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('V3 migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = migrateV3;
