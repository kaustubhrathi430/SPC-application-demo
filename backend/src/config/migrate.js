const pool = require('./database');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        freezer_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // SKUs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skus (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(200) NOT NULL,
        product_code VARCHAR(50) NOT NULL UNIQUE,
        cr_code VARCHAR(50),
        startup_cup_weight_target DECIMAL(10,2),
        thickness_label VARCHAR(100) DEFAULT 'Slice Thickness',
        thickness_target DECIMAL(10,3) NOT NULL,
        thickness_lcl DECIMAL(10,3) NOT NULL,
        thickness_lwl DECIMAL(10,3) NOT NULL,
        thickness_uwl DECIMAL(10,3) NOT NULL,
        thickness_ucl DECIMAL(10,3) NOT NULL,
        thickness_unit VARCHAR(20) DEFAULT 'mm',
        weight_label VARCHAR(100) DEFAULT 'Slice Weight',
        weight_target DECIMAL(10,3) NOT NULL,
        weight_lcl DECIMAL(10,3) NOT NULL,
        weight_lwl DECIMAL(10,3) NOT NULL,
        weight_uwl DECIMAL(10,3) NOT NULL,
        weight_ucl DECIMAL(10,3) NOT NULL,
        weight_unit VARCHAR(20) DEFAULT 'grams',
        coating_label VARCHAR(100) DEFAULT 'Coating Weight',
        coating_target DECIMAL(10,3) NOT NULL,
        coating_lcl DECIMAL(10,3) NOT NULL,
        coating_lwl DECIMAL(10,3) NOT NULL,
        coating_uwl DECIMAL(10,3) NOT NULL,
        coating_ucl DECIMAL(10,3) NOT NULL,
        coating_unit VARCHAR(20) DEFAULT 'grams',
        pack_size VARCHAR(50) DEFAULT '6pk',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Measurements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        sku_id INTEGER NOT NULL REFERENCES skus(id),
        line_id INTEGER NOT NULL REFERENCES lines(id),
        freezer_number INTEGER NOT NULL,
        shift VARCHAR(10) NOT NULL CHECK (shift IN ('Day', 'Night')),
        shift_date DATE NOT NULL,
        operator_initials VARCHAR(10) NOT NULL,
        lead_initials VARCHAR(10),
        thickness_value DECIMAL(10,3),
        weight_value DECIMAL(10,3),
        coating_value DECIMAL(10,3),
        adjustments TEXT,
        recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS measurement_images (
        id SERIAL PRIMARY KEY,
        measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Shift reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_reports (
        id SERIAL PRIMARY KEY,
        line_id INTEGER NOT NULL REFERENCES lines(id),
        sku_id INTEGER NOT NULL REFERENCES skus(id),
        shift VARCHAR(10) NOT NULL CHECK (shift IN ('Day', 'Night')),
        shift_date DATE NOT NULL,
        operator_name VARCHAR(100) NOT NULL,
        supervisor_name VARCHAR(100),
        total_measurements INTEGER DEFAULT 0,
        thickness_avg DECIMAL(10,3),
        thickness_min DECIMAL(10,3),
        thickness_max DECIMAL(10,3),
        thickness_out_of_control INTEGER DEFAULT 0,
        thickness_warnings INTEGER DEFAULT 0,
        weight_avg DECIMAL(10,3),
        weight_min DECIMAL(10,3),
        weight_max DECIMAL(10,3),
        weight_out_of_control INTEGER DEFAULT 0,
        weight_warnings INTEGER DEFAULT 0,
        coating_avg DECIMAL(10,3),
        coating_min DECIMAL(10,3),
        coating_max DECIMAL(10,3),
        coating_out_of_control INTEGER DEFAULT 0,
        coating_warnings INTEGER DEFAULT 0,
        notes TEXT,
        report_data JSONB,
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_measurements_sku ON measurements(sku_id);
      CREATE INDEX IF NOT EXISTS idx_measurements_line ON measurements(line_id);
      CREATE INDEX IF NOT EXISTS idx_measurements_shift_date ON measurements(shift_date);
      CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at ON measurements(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_measurements_shift ON measurements(shift);
      CREATE INDEX IF NOT EXISTS idx_shift_reports_line ON shift_reports(line_id);
      CREATE INDEX IF NOT EXISTS idx_shift_reports_date ON shift_reports(shift_date);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrate;
