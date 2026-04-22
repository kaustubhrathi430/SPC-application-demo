const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/lines - Get all lines
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lines WHERE active = true ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lines:', err);
    res.status(500).json({ error: 'Failed to fetch lines' });
  }
});

// GET /api/lines/:id - Get single line
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lines WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Line not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching line:', err);
    res.status(500).json({ error: 'Failed to fetch line' });
  }
});

module.exports = router;
