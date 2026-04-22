const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

// POST /api/production-orders - Create a new production order
router.post('/', async (req, res) => {
  try {
    const { line_id, sku_id, best_buy_code, shift, shift_date, po_number } = req.body;

    if (!line_id || !sku_id || !best_buy_code || !shift || !shift_date || !po_number) {
      return res.status(400).json({ error: 'Missing required fields: line_id, sku_id, best_buy_code, shift, shift_date, po_number' });
    }

    const validShifts = ['A', 'B', 'C', 'D'];
    if (!validShifts.includes(shift)) {
      return res.status(400).json({ error: 'Invalid shift. Must be A, B, C, or D' });
    }

    // Verify line exists
    const lineCheck = await pool.query('SELECT id FROM lines WHERE id = $1 AND active = true', [line_id]);
    if (lineCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid line_id' });
    }

    // Verify SKU exists and is active
    const skuCheck = await pool.query('SELECT id, product_name, product_code FROM skus WHERE id = $1 AND active = true', [sku_id]);
    if (skuCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive sku_id' });
    }

    const result = await pool.query(
      `INSERT INTO production_orders (line_id, sku_id, best_buy_code, shift, shift_date, po_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [line_id, sku_id, best_buy_code, shift, shift_date, po_number]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating production order:', err);
    res.status(500).json({ error: 'Failed to create production order' });
  }
});

// GET /api/production-orders/active - Get active production orders
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, s.product_name, s.product_code, l.display_name as line_name
       FROM production_orders po
       JOIN skus s ON po.sku_id = s.id
       JOIN lines l ON po.line_id = l.id
       WHERE po.status = 'active'
       ORDER BY po.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active orders:', err);
    res.status(500).json({ error: 'Failed to fetch active production orders' });
  }
});

// PUT /api/production-orders/:id/complete - Complete a production order
router.put('/:id/complete', async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT status FROM production_orders WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }
    if (existing.rows[0].status === 'reviewed') {
      return res.status(409).json({ error: 'Order is reviewed and locked.' });
    }

    const result = await pool.query(
      `UPDATE production_orders
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Production order not found or already completed' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error completing production order:', err);
    res.status(500).json({ error: 'Failed to complete production order' });
  }
});

// PUT /api/production-orders/:id/review - Review and lock a production order
router.put('/:id/review', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { reviewed_by } = req.body;
    if (!reviewed_by || !reviewed_by.trim()) {
      return res.status(400).json({ error: 'reviewed_by is required' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE production_orders
       SET status = 'reviewed', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2 AND status = 'completed'
       RETURNING *`,
      [reviewed_by.trim(), req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be in completed status to review' });
    }

    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
       VALUES ('production_orders', $1, 'UPDATE', $2, $3)`,
      [
        req.params.id,
        req.session.username || 'admin',
        JSON.stringify({ status: 'reviewed', reviewed_by: reviewed_by.trim() }),
      ]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reviewing production order:', err);
    res.status(500).json({ error: 'Failed to review production order' });
  } finally {
    client.release();
  }
});

// GET /api/production-orders/:id/freezers - Get freezer config for a line
router.get('/:orderId/freezers', async (req, res) => {
  try {
    const order = await pool.query('SELECT line_id FROM production_orders WHERE id = $1', [req.params.orderId]);
    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }
    const result = await pool.query(
      `SELECT freezer_number, pump_count FROM line_freezers
       WHERE line_id = $1 ORDER BY freezer_number`,
      [order.rows[0].line_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching freezers:', err);
    res.status(500).json({ error: 'Failed to fetch freezer config' });
  }
});

module.exports = router;
