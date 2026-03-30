const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Compute OOC status based on SKU limits
function computeStatus(measurement, sku) {
  const checks = [
    { val: measurement.thickness_value, lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl },
    { val: measurement.weight_value, lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl },
    { val: measurement.coating_value, lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl },
  ];

  let status = 'in_control';
  for (const c of checks) {
    if (c.val == null) continue;
    const v = parseFloat(c.val);
    if (v < parseFloat(c.lcl) || v > parseFloat(c.ucl)) return 'ooc';
    if (v < parseFloat(c.lwl) || v > parseFloat(c.uwl)) status = 'warning';
  }
  return status;
}

// GET /api/measurements - Get measurements with filters
router.get('/', async (req, res) => {
  try {
    const { sku_id, line_id, shift, shift_date, freezer_number, pump_number, limit = 50 } = req.query;

    let query = `
      SELECT m.*, s.product_name, s.product_code, l.display_name as line_name
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (sku_id) { query += ` AND m.sku_id = $${paramIdx++}`; params.push(sku_id); }
    if (line_id) { query += ` AND m.line_id = $${paramIdx++}`; params.push(line_id); }
    if (shift) { query += ` AND m.shift = $${paramIdx++}`; params.push(shift); }
    if (shift_date) { query += ` AND m.shift_date = $${paramIdx++}`; params.push(shift_date); }
    if (freezer_number) { query += ` AND m.freezer_number = $${paramIdx++}`; params.push(freezer_number); }
    if (pump_number) { query += ` AND m.pump_number = $${paramIdx++}`; params.push(pump_number); }

    query += ` ORDER BY m.recorded_at DESC LIMIT $${paramIdx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching measurements:', err);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

// GET /api/measurements/chart-data - Get chart data for SPC charts
router.get('/chart-data', async (req, res) => {
  try {
    const { sku_id, line_id, shift, shift_date, freezer_number, pump_number } = req.query;

    if (!sku_id || !line_id) {
      return res.status(400).json({ error: 'sku_id and line_id are required' });
    }

    let query = `
      SELECT m.id, m.freezer_number, m.pump_number, m.thickness_value, m.weight_value, m.coating_value,
             m.operator_initials, m.lead_initials, m.adjustments, m.recorded_at, m.shift,
             m.status_overall, m.alert_acknowledged_at
      FROM measurements m
      WHERE m.sku_id = $1 AND m.line_id = $2
    `;
    const params = [sku_id, line_id];
    let paramIdx = 3;

    if (shift) { query += ` AND m.shift = $${paramIdx++}`; params.push(shift); }
    if (shift_date) { query += ` AND m.shift_date = $${paramIdx++}`; params.push(shift_date); }
    if (freezer_number) { query += ` AND m.freezer_number = $${paramIdx++}`; params.push(freezer_number); }
    if (pump_number) { query += ` AND m.pump_number = $${paramIdx++}`; params.push(pump_number); }

    query += ' ORDER BY m.recorded_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// POST /api/measurements - Record a new measurement (with idempotency + OOC status)
router.post('/', upload.array('photos', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      sku_id, line_id, freezer_number, pump_number, operator_initials, lead_initials,
      thickness_value, weight_value, coating_value, adjustments,
      shift, shift_date, best_buy_code, production_order_id, client_id,
    } = req.body;

    if (!sku_id || !line_id || !freezer_number || !operator_initials) {
      return res.status(400).json({ error: 'Missing required fields: sku_id, line_id, freezer_number, operator_initials' });
    }

    // Check if production order is reviewed (locked)
    if (production_order_id) {
      const poCheck = await client.query(
        'SELECT status FROM production_orders WHERE id = $1',
        [production_order_id]
      );
      if (poCheck.rows.length > 0 && poCheck.rows[0].status === 'reviewed') {
        return res.status(409).json({ error: 'Order is reviewed and locked. No new measurements allowed.' });
      }
    }

    // Idempotency: if client_id provided, check for existing
    if (client_id) {
      const existing = await client.query(
        'SELECT * FROM measurements WHERE client_id = $1',
        [client_id]
      );
      if (existing.rows.length > 0) {
        return res.status(200).json(existing.rows[0]);
      }
    }

    // Validate shift
    const validShifts = ['A', 'B', 'C', 'D'];
    let resolvedShift = shift;
    if (!resolvedShift || !validShifts.includes(resolvedShift)) {
      const now = new Date();
      const hour = now.getHours();
      resolvedShift = (hour >= 6 && hour < 18) ? 'A' : 'B';
    }

    // Resolve shift date
    let shiftDateStr = shift_date;
    if (!shiftDateStr) {
      const now = new Date();
      const hour = now.getHours();
      let sd = new Date(now);
      if (hour < 6) sd.setDate(sd.getDate() - 1);
      shiftDateStr = sd.toISOString().split('T')[0];
    }

    // Get SKU for OOC computation
    const skuResult = await client.query('SELECT * FROM skus WHERE id = $1', [sku_id]);
    if (skuResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid sku_id' });
    }
    const sku = skuResult.rows[0];

    // Compute OOC status
    const statusOverall = computeStatus(
      { thickness_value, weight_value, coating_value },
      sku
    );

    await client.query('BEGIN');

    const measurementResult = await client.query(
      `INSERT INTO measurements (
        sku_id, line_id, freezer_number, pump_number, shift, shift_date,
        operator_initials, lead_initials,
        thickness_value, weight_value, coating_value,
        adjustments, best_buy_code, production_order_id,
        client_id, status_overall, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      RETURNING *`,
      [
        sku_id, line_id, freezer_number, parseInt(pump_number) || 1,
        resolvedShift, shiftDateStr,
        operator_initials, lead_initials || null,
        thickness_value || null, weight_value || null, coating_value || null,
        adjustments || null, best_buy_code || null, production_order_id || null,
        client_id || null, statusOverall,
      ]
    );

    const measurement = measurementResult.rows[0];

    // Audit log
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
       VALUES ('measurements', $1, 'INSERT', $2, $3)`,
      [measurement.id, operator_initials, JSON.stringify({
        freezer_number, pump_number: parseInt(pump_number) || 1,
        thickness_value, weight_value, coating_value, status_overall: statusOverall,
      })]
    );

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64Data = file.buffer.toString('base64');
        await client.query(
          `INSERT INTO measurement_images (measurement_id, filename, data)
           VALUES ($1, $2, $3)`,
          [measurement.id, file.originalname, base64Data]
        );
      }
    }

    await client.query('COMMIT');

    // Return with OOC info for frontend acknowledgment
    const requiresAck = statusOverall === 'ooc' || statusOverall === 'warning';
    res.status(201).json({ ...measurement, requires_ack: requiresAck });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording measurement:', err);
    res.status(500).json({ error: 'Failed to record measurement' });
  } finally {
    client.release();
  }
});

// POST /api/measurements/:id/ack - Acknowledge OOC/warning alert
router.post('/:id/ack', async (req, res) => {
  const client = await pool.connect();
  try {
    const { acknowledged_by } = req.body;
    if (!acknowledged_by) {
      return res.status(400).json({ error: 'acknowledged_by is required' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE measurements
       SET alert_acknowledged_at = NOW(), alert_acknowledged_by = $1
       WHERE id = $2 AND alert_acknowledged_at IS NULL
       RETURNING *`,
      [acknowledged_by, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Measurement not found or already acknowledged' });
    }

    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
       VALUES ('measurements', $1, 'ACKNOWLEDGE_ALERT', $2, $3)`,
      [
        req.params.id,
        acknowledged_by,
        JSON.stringify({
          alert_acknowledged_at: result.rows[0].alert_acknowledged_at,
          alert_acknowledged_by: acknowledged_by,
        }),
      ]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error acknowledging alert:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  } finally {
    client.release();
  }
});

// PUT and DELETE removed — operators cannot edit after submit.
// Corrections are done via admin endpoint: POST /api/admin/measurements/:id/correct

module.exports = router;
