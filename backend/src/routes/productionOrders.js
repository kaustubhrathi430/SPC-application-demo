const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/production-orders - Create a new production order
router.post('/', async (req, res) => {
  try {
    const { line_id, sku_id, best_buy_code, shift, shift_date } = req.body;

    if (!line_id || !sku_id || !best_buy_code || !shift || !shift_date) {
      return res.status(400).json({ error: 'Missing required fields: line_id, sku_id, best_buy_code, shift, shift_date' });
    }

    const validShifts = ['A', 'B', 'C', 'D'];
    if (!validShifts.includes(shift)) {
      return res.status(400).json({ error: 'Invalid shift. Must be A, B, C, or D' });
    }

    // Verify line exists
    const lineCheck = await pool.query('SELECT id FROM lines WHERE id = $1', [line_id]);
    if (lineCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid line_id' });
    }

    // Verify SKU exists and is active
    const skuCheck = await pool.query('SELECT id, product_name, product_code FROM skus WHERE id = $1 AND active = true', [sku_id]);
    if (skuCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive sku_id' });
    }

    const result = await pool.query(
      `INSERT INTO production_orders (line_id, sku_id, best_buy_code, shift, shift_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [line_id, sku_id, best_buy_code, shift, shift_date]
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

module.exports = router;
