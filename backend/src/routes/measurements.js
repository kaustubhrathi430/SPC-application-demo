const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const pool = require('../config/database');

const router = express.Router();

const IMAGE_ROOT = process.env.SPC_IMAGE_ROOT || '/data/spc-images';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function computeStatus(measurement, sku) {
  const checks = [
    { val: measurement.thickness_value, lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl },
    { val: measurement.weight_value, lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl },
    { val: measurement.coating_value, lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl },
  ];

  let status = 'in_control';
  for (const check of checks) {
    if (check.val == null) continue;
    const value = parseFloat(check.val);
    if (value < parseFloat(check.lcl) || value > parseFloat(check.ucl)) return 'ooc';
    if (value < parseFloat(check.lwl) || value > parseFloat(check.uwl)) status = 'warning';
  }
  return status;
}

function getImageExtension(file) {
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  if (originalExt) return originalExt;
  return EXT_BY_MIME[file.mimetype] || '.bin';
}

function buildImagePath(sha256, extension, recordedAt) {
  const stamp = recordedAt instanceof Date ? recordedAt : new Date(recordedAt);
  const year = String(stamp.getUTCFullYear());
  const month = String(stamp.getUTCMonth() + 1).padStart(2, '0');
  const relativePath = path.join(year, month, `${sha256}${extension}`);
  return {
    relativePath,
    absolutePath: path.join(IMAGE_ROOT, relativePath),
  };
}

async function getProductionOrderStatus(client, productionOrderId) {
  if (!productionOrderId) return null;
  const result = await client.query(
    'SELECT id, status FROM production_orders WHERE id = $1',
    [productionOrderId]
  );
  return result.rows[0] || null;
}

async function getMeasurementLockState(client, measurementId) {
  const result = await client.query(
    `SELECT m.id, m.production_order_id, po.status
     FROM measurements m
     LEFT JOIN production_orders po ON po.id = m.production_order_id
     WHERE m.id = $1`,
    [measurementId]
  );
  return result.rows[0] || null;
}

// GET /api/measurements - Get measurements with filters
router.get('/', async (req, res) => {
  try {
    const { sku_id, line_id, shift, shift_date, freezer_number, pump_number, limit = 50 } = req.query;

    let query = `
      SELECT m.*, s.product_name, s.product_code, l.display_name AS line_name
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
    params.push(parseInt(limit, 10));

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

// POST /api/measurements - Record a new measurement
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
    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const productionOrder = await getProductionOrderStatus(client, production_order_id);
    if (productionOrder && productionOrder.status === 'reviewed') {
      return res.status(409).json({ error: 'Order is reviewed and locked. No new measurements allowed.' });
    }

    const validShifts = ['A', 'B', 'C', 'D'];
    let resolvedShift = shift;
    if (!resolvedShift || !validShifts.includes(resolvedShift)) {
      const hour = new Date().getHours();
      resolvedShift = (hour >= 6 && hour < 18) ? 'A' : 'B';
    }

    let shiftDateStr = shift_date;
    if (!shiftDateStr) {
      const now = new Date();
      if (now.getHours() < 6) now.setDate(now.getDate() - 1);
      shiftDateStr = now.toISOString().split('T')[0];
    }

    const skuResult = await client.query('SELECT * FROM skus WHERE id = $1', [sku_id]);
    if (skuResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid sku_id' });
    }
    const sku = skuResult.rows[0];
    const statusOverall = computeStatus({ thickness_value, weight_value, coating_value }, sku);

    await client.query('BEGIN');

    const measurementResult = await client.query(
      `WITH inserted AS (
         INSERT INTO measurements (
           sku_id, line_id, freezer_number, pump_number, shift, shift_date,
           operator_initials, lead_initials,
           thickness_value, weight_value, coating_value,
           adjustments, best_buy_code, production_order_id,
           client_id, status_overall, recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13, $14,
           $15, $16, NOW()
         )
         ON CONFLICT (client_id) DO NOTHING
         RETURNING *, true AS inserted
       )
       SELECT * FROM inserted
       UNION ALL
       SELECT m.*, false AS inserted
       FROM measurements m
       WHERE m.client_id = $15
         AND NOT EXISTS (SELECT 1 FROM inserted)
       LIMIT 1`,
      [
        sku_id,
        line_id,
        freezer_number,
        parseInt(pump_number, 10) || 1,
        resolvedShift,
        shiftDateStr,
        operator_initials.trim(),
        lead_initials || null,
        thickness_value || null,
        weight_value || null,
        coating_value || null,
        adjustments || null,
        best_buy_code || null,
        production_order_id || null,
        client_id,
        statusOverall,
      ]
    );

    const measurement = measurementResult.rows[0];
    const wasInserted = Boolean(measurement.inserted);

    if (wasInserted) {
      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
         VALUES ('measurements', $1, 'INSERT', $2, $3)`,
        [
          measurement.id,
          operator_initials.trim(),
          JSON.stringify({
            production_order_id: production_order_id || null,
            freezer_number,
            pump_number: parseInt(pump_number, 10) || 1,
            thickness_value,
            weight_value,
            coating_value,
            status_overall: statusOverall,
          }),
        ]
      );

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
          const extension = getImageExtension(file);
          const { relativePath, absolutePath } = buildImagePath(sha256, extension, measurement.recorded_at);

          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          if (!fs.existsSync(absolutePath)) {
            fs.writeFileSync(absolutePath, file.buffer);
          }

          await client.query(
            `INSERT INTO measurement_images (
              measurement_id, filename, data, storage_path, sha256, mime_type, size_bytes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              measurement.id,
              file.originalname,
              null,
              relativePath,
              sha256,
              file.mimetype || 'application/octet-stream',
              file.size,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    const requiresAck = measurement.status_overall === 'ooc' || measurement.status_overall === 'warning';
    res.status(wasInserted ? 201 : 200).json({ ...measurement, requires_ack: requiresAck });
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

// PUT /api/measurements/:id - Operators cannot edit after submit
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const measurement = await getMeasurementLockState(client, req.params.id);
    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    if (measurement.status === 'reviewed') {
      return res.status(409).json({ error: 'Order is reviewed and locked.' });
    }
    return res.status(403).json({ error: 'Operator edits are disabled. Use the admin correction flow.' });
  } catch (err) {
    console.error('Error enforcing operator edit policy:', err);
    res.status(500).json({ error: 'Failed to enforce edit policy' });
  } finally {
    client.release();
  }
});

// DELETE /api/measurements/:id - Operators cannot delete after submit
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const measurement = await getMeasurementLockState(client, req.params.id);
    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    if (measurement.status === 'reviewed') {
      return res.status(409).json({ error: 'Order is reviewed and locked.' });
    }
    return res.status(403).json({ error: 'Operator deletions are disabled.' });
  } catch (err) {
    console.error('Error enforcing operator delete policy:', err);
    res.status(500).json({ error: 'Failed to enforce delete policy' });
  } finally {
    client.release();
  }
});

module.exports = router;
