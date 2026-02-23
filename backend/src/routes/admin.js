const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ExcelJS = require('exceljs');

// GET /api/admin/dashboard - Dashboard summary data
router.get('/dashboard', async (req, res) => {
  try {
    const { line_id, sku_id, date_from, date_to } = req.query;

    // Total measurements
    let countQuery = 'SELECT COUNT(*) as total FROM measurements WHERE 1=1';
    const countParams = [];
    let idx = 1;
    if (line_id) { countQuery += ` AND line_id = $${idx++}`; countParams.push(line_id); }
    if (sku_id) { countQuery += ` AND sku_id = $${idx++}`; countParams.push(sku_id); }
    if (date_from) { countQuery += ` AND shift_date >= $${idx++}`; countParams.push(date_from); }
    if (date_to) { countQuery += ` AND shift_date <= $${idx++}`; countParams.push(date_to); }

    const countResult = await pool.query(countQuery, countParams);

    // Recent measurements per line
    const lineStatsResult = await pool.query(`
      SELECT l.display_name, l.id as line_id,
             COUNT(m.id) as total_measurements,
             MAX(m.recorded_at) as last_measurement
      FROM lines l
      LEFT JOIN measurements m ON l.id = m.line_id
      GROUP BY l.id, l.display_name
      ORDER BY l.id
    `);

    // Recent shift reports
    const reportsResult = await pool.query(`
      SELECT r.id, r.shift, r.shift_date, r.operator_name, r.supervisor_name,
             r.total_measurements, r.created_at,
             s.product_name, l.display_name as line_name,
             r.thickness_out_of_control, r.weight_out_of_control, r.coating_out_of_control,
             r.thickness_warnings, r.weight_warnings, r.coating_warnings
      FROM shift_reports r
      JOIN skus s ON r.sku_id = s.id
      JOIN lines l ON r.line_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 20
    `);

    // SKU usage
    const skuUsageResult = await pool.query(`
      SELECT s.product_name, s.product_code, COUNT(m.id) as usage_count
      FROM skus s
      LEFT JOIN measurements m ON s.id = m.sku_id
      WHERE s.active = true
      GROUP BY s.id, s.product_name, s.product_code
      ORDER BY usage_count DESC
    `);

    res.json({
      total_measurements: parseInt(countResult.rows[0].total),
      line_stats: lineStatsResult.rows,
      recent_reports: reportsResult.rows,
      sku_usage: skuUsageResult.rows,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/history - Historical data with filters
router.get('/history', async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to, page = 1, per_page = 100 } = req.query;

    let query = `
      SELECT m.*, s.product_name, s.product_code, l.display_name as line_name
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (line_id) { query += ` AND m.line_id = $${idx++}`; params.push(line_id); }
    if (sku_id) { query += ` AND m.sku_id = $${idx++}`; params.push(sku_id); }
    if (shift) { query += ` AND m.shift = $${idx++}`; params.push(shift); }
    if (date_from) { query += ` AND m.shift_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { query += ` AND m.shift_date <= $${idx++}`; params.push(date_to); }

    // Count total
    const countQuery = query.replace(/SELECT m\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(per_page);
    query += ` ORDER BY m.recorded_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(per_page), offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total,
        total_pages: Math.ceil(total / parseInt(per_page)),
      },
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/admin/export/csv - Export data as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to } = req.query;

    let query = `
      SELECT m.recorded_at, m.shift_date, m.shift, m.freezer_number,
             m.operator_initials, m.lead_initials,
             m.thickness_value, m.weight_value, m.coating_value,
             m.adjustments,
             s.product_name, s.product_code,
             l.display_name as line_name
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (line_id) { query += ` AND m.line_id = $${idx++}`; params.push(line_id); }
    if (sku_id) { query += ` AND m.sku_id = $${idx++}`; params.push(sku_id); }
    if (shift) { query += ` AND m.shift = $${idx++}`; params.push(shift); }
    if (date_from) { query += ` AND m.shift_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { query += ` AND m.shift_date <= $${idx++}`; params.push(date_to); }

    query += ' ORDER BY m.recorded_at DESC';

    const result = await pool.query(query, params);

    // Build CSV
    const headers = [
      'Date', 'Shift', 'Time', 'Line', 'Freezer', 'Product', 'Product Code',
      'Operator', 'Lead', 'Slice Thickness', 'Slice Weight', 'Coating Weight', 'Adjustments',
    ];

    let csv = headers.join(',') + '\n';
    for (const row of result.rows) {
      const time = new Date(row.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const values = [
        row.shift_date, row.shift, time, row.line_name, row.freezer_number,
        `"${row.product_name}"`, row.product_code,
        row.operator_initials, row.lead_initials || '',
        row.thickness_value || '', row.weight_value || '', row.coating_value || '',
        `"${(row.adjustments || '').replace(/"/g, '""')}"`,
      ];
      csv += values.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=spc-data-export.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/admin/export/excel - Export data as Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to } = req.query;

    let query = `
      SELECT m.recorded_at, m.shift_date, m.shift, m.freezer_number,
             m.operator_initials, m.lead_initials,
             m.thickness_value, m.weight_value, m.coating_value,
             m.adjustments,
             s.product_name, s.product_code,
             l.display_name as line_name
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (line_id) { query += ` AND m.line_id = $${idx++}`; params.push(line_id); }
    if (sku_id) { query += ` AND m.sku_id = $${idx++}`; params.push(sku_id); }
    if (shift) { query += ` AND m.shift = $${idx++}`; params.push(shift); }
    if (date_from) { query += ` AND m.shift_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { query += ` AND m.shift_date <= $${idx++}`; params.push(date_to); }

    query += ' ORDER BY m.recorded_at DESC';

    const result = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPC Control Chart App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('SPC Data');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Shift', key: 'shift', width: 8 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Line', key: 'line', width: 10 },
      { header: 'Freezer', key: 'freezer', width: 8 },
      { header: 'Product', key: 'product', width: 35 },
      { header: 'Product Code', key: 'code', width: 12 },
      { header: 'Operator', key: 'operator', width: 10 },
      { header: 'Lead', key: 'lead', width: 10 },
      { header: 'Slice Thickness', key: 'thickness', width: 14 },
      { header: 'Slice Weight', key: 'weight', width: 12 },
      { header: 'Coating Weight', key: 'coating', width: 14 },
      { header: 'Adjustments', key: 'adjustments', width: 30 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1a1a1a' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of result.rows) {
      const time = new Date(row.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      sheet.addRow({
        date: row.shift_date,
        shift: row.shift,
        time,
        line: row.line_name,
        freezer: row.freezer_number,
        product: row.product_name,
        code: row.product_code,
        operator: row.operator_initials,
        lead: row.lead_initials || '',
        thickness: row.thickness_value ? parseFloat(row.thickness_value) : null,
        weight: row.weight_value ? parseFloat(row.weight_value) : null,
        coating: row.coating_value ? parseFloat(row.coating_value) : null,
        adjustments: row.adjustments || '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=spc-data-export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

module.exports = router;
