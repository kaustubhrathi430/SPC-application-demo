const pool = require('./database');

const migrateV2 = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Running v2 migrations...');

    // 1. Add best_buy_code to measurements
    await client.query(`
      ALTER TABLE measurements ADD COLUMN IF NOT EXISTS best_buy_code VARCHAR(50);
    `);

    // 2. Add production_order_id to measurements
    await client.query(`
      ALTER TABLE measurements ADD COLUMN IF NOT EXISTS production_order_id INTEGER;
    `);

    // 3. Add best_buy_code to shift_reports
    await client.query(`
      ALTER TABLE shift_reports ADD COLUMN IF NOT EXISTS best_buy_code VARCHAR(50);
    `);

    // 4. Create production_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id SERIAL PRIMARY KEY,
        line_id INTEGER NOT NULL REFERENCES lines(id),
        sku_id INTEGER NOT NULL REFERENCES skus(id),
        best_buy_code VARCHAR(50) NOT NULL,
        shift VARCHAR(5) NOT NULL,
        shift_date DATE NOT NULL,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. Indexes for production_orders
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_production_orders_line ON production_orders(line_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_production_orders_date ON production_orders(shift_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
    `);

    // 6. Index on measurements best_buy_code
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_measurements_best_buy ON measurements(best_buy_code);
    `);

    // 7. DROP old CHECK constraints FIRST (must happen before data migration)
    // This is safe to run multiple times - IF NOT EXISTS handles it
    console.log('Dropping old shift constraints...');
    await client.query(`ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_shift_check`);
    await client.query(`ALTER TABLE shift_reports DROP CONSTRAINT IF EXISTS shift_reports_shift_check`);

    // 8. Migrate existing shift data from Day/Night to A/B (only if old format exists)
    const oldRecords = await client.query(
      `SELECT COUNT(*) as cnt FROM measurements WHERE shift IN ('Day', 'Night')`
    );
    if (parseInt(oldRecords.rows[0].cnt) > 0) {
      console.log('Migrating existing Day/Night shifts to A/B...');
      await client.query(`UPDATE measurements SET shift = 'A' WHERE shift = 'Day'`);
      await client.query(`UPDATE measurements SET shift = 'B' WHERE shift = 'Night'`);
    }

    const oldReports = await client.query(
      `SELECT COUNT(*) as cnt FROM shift_reports WHERE shift IN ('Day', 'Night')`
    );
    if (parseInt(oldReports.rows[0].cnt) > 0) {
      console.log('Migrating existing shift report shifts to A/B...');
      await client.query(`UPDATE shift_reports SET shift = 'A' WHERE shift = 'Day'`);
      await client.query(`UPDATE shift_reports SET shift = 'B' WHERE shift = 'Night'`);
    }

    // 9. Re-add CHECK constraints with A/B/C/D values
    // Since we dropped them above, this is safe to run every time
    console.log('Adding shift constraints (A/B/C/D)...');
    await client.query(`
      ALTER TABLE measurements ADD CONSTRAINT measurements_shift_check
        CHECK (shift IN ('A', 'B', 'C', 'D'))
    `);
    await client.query(`
      ALTER TABLE shift_reports ADD CONSTRAINT shift_reports_shift_check
        CHECK (shift IN ('A', 'B', 'C', 'D'))
    `);

    await client.query('COMMIT');
    console.log('V2 migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('V2 migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = migrateV2;
