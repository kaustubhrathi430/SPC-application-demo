const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/skus - Get all active SKUs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM skus WHERE active = true ORDER BY product_name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SKUs:', err);
    res.status(500).json({ error: 'Failed to fetch SKUs' });
  }
});

// GET /api/skus/:id - Get single SKU with all SPC parameters
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM skus WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching SKU:', err);
    res.status(500).json({ error: 'Failed to fetch SKU' });
  }
});

module.exports = router;
