const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/measurements - Get measurements with filters
router.get('/', async (req, res) => {
  try {
    const { sku_id, line_id, shift, shift_date, freezer_number, limit = 50 } = req.query;

    let query = `
      SELECT m.*, s.product_name, s.product_code, l.display_name as line_name
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (sku_id) {
      query += ` AND m.sku_id = $${paramIdx++}`;
      params.push(sku_id);
    }
    if (line_id) {
      query += ` AND m.line_id = $${paramIdx++}`;
      params.push(line_id);
    }
    if (shift) {
      query += ` AND m.shift = $${paramIdx++}`;
      params.push(shift);
    }
    if (shift_date) {
      query += ` AND m.shift_date = $${paramIdx++}`;
      params.push(shift_date);
    }
    if (freezer_number) {
      query += ` AND m.freezer_number = $${paramIdx++}`;
      params.push(freezer_number);
    }

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
    const { sku_id, line_id, shift, shift_date, freezer_number } = req.query;

    if (!sku_id || !line_id) {
      return res.status(400).json({ error: 'sku_id and line_id are required' });
    }

    let query = `
      SELECT m.id, m.freezer_number, m.thickness_value, m.weight_value, m.coating_value,
             m.operator_initials, m.lead_initials, m.adjustments, m.recorded_at, m.shift
      FROM measurements m
      WHERE m.sku_id = $1 AND m.line_id = $2
    `;
    const params = [sku_id, line_id];
    let paramIdx = 3;

    if (shift) {
      query += ` AND m.shift = $${paramIdx++}`;
      params.push(shift);
    }
    if (shift_date) {
      query += ` AND m.shift_date = $${paramIdx++}`;
      params.push(shift_date);
    }
    if (freezer_number) {
      query += ` AND m.freezer_number = $${paramIdx++}`;
      params.push(freezer_number);
    }

    query += ' ORDER BY m.recorded_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// POST /api/measurements - Record a new measurement
router.post('/', upload.array('photos', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      sku_id, line_id, freezer_number, operator_initials, lead_initials,
      thickness_value, weight_value, coating_value, adjustments,
      shift, shift_date, best_buy_code, production_order_id,
    } = req.body;

    if (!sku_id || !line_id || !freezer_number || !operator_initials) {
      return res.status(400).json({ error: 'Missing required fields: sku_id, line_id, freezer_number, operator_initials' });
    }

    // Validate shift if provided (A/B/C/D), otherwise fallback to time-based
    const validShifts = ['A', 'B', 'C', 'D'];
    let resolvedShift = shift;
    if (!resolvedShift || !validShifts.includes(resolvedShift)) {
      // Fallback: auto-detect based on time (A for day, B for night)
      const now = new Date();
      const hour = now.getHours();
      resolvedShift = (hour >= 6 && hour < 18) ? 'A' : 'B';
    }

    // Use client-provided shift_date or compute from server time
    let shiftDateStr = shift_date;
    if (!shiftDateStr) {
      const now = new Date();
      const hour = now.getHours();
      let shiftDate = new Date(now);
      if (hour < 6) {
        shiftDate.setDate(shiftDate.getDate() - 1);
      }
      shiftDateStr = shiftDate.toISOString().split('T')[0];
    }

    await client.query('BEGIN');

    const measurementResult = await client.query(
      `INSERT INTO measurements (
        sku_id, line_id, freezer_number, shift, shift_date,
        operator_initials, lead_initials,
        thickness_value, weight_value, coating_value,
        adjustments, best_buy_code, production_order_id, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        sku_id, line_id, freezer_number, resolvedShift, shiftDateStr,
        operator_initials, lead_initials || null,
        thickness_value || null, weight_value || null, coating_value || null,
        adjustments || null, best_buy_code || null, production_order_id || null,
      ]
    );

    const measurement = measurementResult.rows[0];

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

    res.status(201).json(measurement);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording measurement:', err);
    res.status(500).json({ error: 'Failed to record measurement' });
  } finally {
    client.release();
  }
});

// PUT /api/measurements/:id - Update a measurement
router.put('/:id', async (req, res) => {
  try {
    const {
      operator_initials, lead_initials,
      thickness_value, weight_value, coating_value, adjustments,
    } = req.body;

    const result = await pool.query(
      `UPDATE measurements SET
        operator_initials = COALESCE($1, operator_initials),
        lead_initials = COALESCE($2, lead_initials),
        thickness_value = COALESCE($3, thickness_value),
        weight_value = COALESCE($4, weight_value),
        coating_value = COALESCE($5, coating_value),
        adjustments = COALESCE($6, adjustments)
      WHERE id = $7 RETURNING *`,
      [operator_initials, lead_initials, thickness_value, weight_value, coating_value, adjustments, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating measurement:', err);
    res.status(500).json({ error: 'Failed to update measurement' });
  }
});

// DELETE /api/measurements/:id - Delete a measurement
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM measurements WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    res.json({ message: 'Measurement deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting measurement:', err);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
});

module.exports = router;
