const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ExcelJS = require('exceljs');
const {
  requireAdmin, requireMaster, createSession,
  setSessionCookie, clearSessionCookie, destroySession,
  verifyPassword, hashPassword, getSession,
} = require('../middleware/auth');

const CORRECTION_REASON_CODES = new Set([
  'transcription_error',
  'wrong_freezer_or_pump',
  'wrong_operator_or_shift',
  'instrument_error',
  'approved_rework_adjustment',
  'attachment_fix',
  'other',
]);

// ============================================================
// AUTH ENDPOINTS (no middleware — these are the login routes)
// ============================================================

// POST /api/admin/login — Admin shared password login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const config = await pool.query("SELECT value FROM master_config WHERE key = 'admin_password_hash'");
    if (config.rows.length === 0) {
      const fallbackPassword = process.env.ADMIN_PASSWORD || 'Klondike@12345';
      if (password !== fallbackPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    } else if (!verifyPassword(password, config.rows[0].value)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = createSession('admin', 'admin');
    setSessionCookie(res, token);
    res.json({ success: true, role: 'admin' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/admin/master-login — Master owner login
router.post('/master-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash FROM master_accounts WHERE username = $1',
      [username.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!verifyPassword(password, result.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createSession('master', result.rows[0].username);
    setSessionCookie(res, token);
    res.json({ success: true, role: 'master', username: result.rows[0].username });
  } catch (err) {
    console.error('Master login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  destroySession(req);
  clearSessionCookie(res);
  res.json({ success: true });
});

// GET /api/admin/session — Check current session
router.get('/session', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, role: session.role, username: session.username });
});

// ============================================================
// PROTECTED ADMIN ROUTES (require admin or master)
// ============================================================

// GET /api/admin/dashboard - Dashboard summary data
router.get('/dashboard', requireAdmin, async (req, res) => {
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

    // Recent shift reports (paginated now)
    const reportsResult = await pool.query(`
      SELECT r.id, r.shift, r.shift_date, r.operator_name, r.supervisor_name,
             r.total_measurements, r.created_at, r.best_buy_code, r.po_number,
             s.product_name, l.display_name as line_name,
             r.thickness_out_of_control, r.weight_out_of_control, r.coating_out_of_control,
             r.thickness_warnings, r.weight_warnings, r.coating_warnings
      FROM shift_reports r
      JOIN skus s ON r.sku_id = s.id
      JOIN lines l ON r.line_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 50
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

    // Total production orders
    const ordersCount = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'active') as active,
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed
      FROM production_orders
    `);

    res.json({
      total_measurements: parseInt(countResult.rows[0].total),
      line_stats: lineStatsResult.rows || [],
      recent_reports: reportsResult.rows || [],
      sku_usage: skuUsageResult.rows || [],
      order_stats: ordersCount.rows[0] || { total: 0, active: 0, completed: 0, reviewed: 0 },
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/production-orders — Paginated production orders
router.get('/production-orders', requireAdmin, async (req, res) => {
  try {
    const { line_id, sku_id, status, date_from, date_to, page = 1, per_page = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (line_id) { whereClause += ` AND po.line_id = $${idx++}`; params.push(line_id); }
    if (sku_id) { whereClause += ` AND po.sku_id = $${idx++}`; params.push(sku_id); }
    if (status) { whereClause += ` AND po.status = $${idx++}`; params.push(status); }
    if (date_from) { whereClause += ` AND po.shift_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND po.shift_date <= $${idx++}`; params.push(date_to); }

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM production_orders po ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].total);

    // Paginated results
    const offset = (parseInt(page) - 1) * parseInt(per_page);
    const result = await pool.query(
      `SELECT po.*, s.product_name, s.product_code, l.display_name as line_name,
              (SELECT COUNT(*) FROM measurements m WHERE m.production_order_id = po.id) as measurement_count
       FROM production_orders po
       JOIN skus s ON po.sku_id = s.id
       JOIN lines l ON po.line_id = l.id
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(per_page), offset]
    );

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
    console.error('Error fetching production orders:', err);
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

// GET /api/admin/production-orders/:id/measurements — All measurements for a batch
router.get('/production-orders/:id/measurements', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, s.product_name, s.product_code, l.display_name as line_name
       FROM measurements m
       JOIN skus s ON m.sku_id = s.id
       JOIN lines l ON m.line_id = l.id
       WHERE m.production_order_id = $1
       ORDER BY m.freezer_number, m.pump_number, m.recorded_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching batch measurements:', err);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

// GET /api/admin/production-orders/:id/detail — Batch detail with measurements, report, and audit trail
router.get('/production-orders/:id/detail', requireAdmin, async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT po.*, s.product_name, s.product_code, s.cr_code, s.startup_cup_weight_target,
              l.display_name AS line_name
       FROM production_orders po
       JOIN skus s ON po.sku_id = s.id
       JOIN lines l ON po.line_id = l.id
       WHERE po.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const order = orderResult.rows[0];
    const measurementsResult = await pool.query(
      `SELECT m.*, s.product_name, s.product_code, l.display_name AS line_name
       FROM measurements m
       JOIN skus s ON m.sku_id = s.id
       JOIN lines l ON m.line_id = l.id
       WHERE m.production_order_id = $1
       ORDER BY m.freezer_number, m.pump_number, m.recorded_at`,
      [req.params.id]
    );

    const reportResult = await pool.query(
      `SELECT *
       FROM shift_reports
       WHERE production_order_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    const report = reportResult.rows[0] || null;

    const measurementIds = measurementsResult.rows.map((row) => row.id);
    const auditParams = [req.params.id];
    let auditQuery = `
      SELECT *
      FROM audit_log
      WHERE (table_name = 'production_orders' AND record_id = $1)
    `;
    if (report) {
      auditParams.push(report.id);
      auditQuery += ` OR (table_name = 'shift_reports' AND record_id = $2)`;
    }
    if (measurementIds.length > 0) {
      auditParams.push(measurementIds);
      auditQuery += ` OR (table_name = 'measurements' AND record_id = ANY($${auditParams.length}::int[]))`;
    }
    auditQuery += ' ORDER BY created_at DESC';

    const auditResult = await pool.query(auditQuery, auditParams);

    res.json({
      order,
      report,
      measurements: measurementsResult.rows,
      audit: auditResult.rows,
    });
  } catch (err) {
    console.error('Error fetching production order detail:', err);
    res.status(500).json({ error: 'Failed to fetch production order detail' });
  }
});

// POST /api/admin/measurements/:id/correct — Admin correction with audit trail
router.post('/measurements/:id/correct', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      thickness_value, weight_value, coating_value,
      reason_code, reason_comment,
    } = req.body;
    const measurementId = req.params.id;

    if (!reason_code || !CORRECTION_REASON_CODES.has(reason_code)) {
      return res.status(400).json({ error: 'A valid reason_code is required for corrections' });
    }
    if (!reason_comment || reason_comment.trim().length === 0) {
      return res.status(400).json({ error: 'reason_comment is required for corrections' });
    }

    await client.query('BEGIN');

    // Get current values
    const current = await client.query('SELECT * FROM measurements WHERE id = $1', [measurementId]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Measurement not found' });
    }

    const old = current.rows[0];

    // Check if production order is reviewed (locked) — admin corrections still allowed with audit
    // Build update
    const updates = {};
    if (thickness_value !== undefined) updates.thickness_value = thickness_value;
    if (weight_value !== undefined) updates.weight_value = weight_value;
    if (coating_value !== undefined) updates.coating_value = coating_value;

    if (Object.keys(updates).length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No values to correct' });
    }

    // Optimistic locking
    const version = req.body.version || old.version;
    const setClauses = Object.entries(updates).map(([k, v], i) => `${k} = $${i + 1}`);
    setClauses.push(`version = version + 1`);
    const values = Object.values(updates);

    const updateResult = await client.query(
      `UPDATE measurements SET ${setClauses.join(', ')}
       WHERE id = $${values.length + 1} AND version = $${values.length + 2}
       RETURNING *`,
      [...values, measurementId, version]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Version conflict — measurement was modified by another user' });
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, reason, old_values, new_values)
       VALUES ('measurements', $1, 'CORRECTION', $2, $3, $4, $5)`,
      [
        measurementId,
        req.session.username || 'admin',
        `${reason_code}: ${reason_comment.trim()}`,
        JSON.stringify({
          thickness_value: old.thickness_value,
          weight_value: old.weight_value,
          coating_value: old.coating_value,
        }),
        JSON.stringify({
          ...updates,
          reason_code,
          reason_comment: reason_comment.trim(),
        }),
      ]
    );

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error correcting measurement:', err);
    res.status(500).json({ error: 'Failed to correct measurement' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/production-orders/:id/review — Lock a batch (irreversible)
router.put('/production-orders/:id/review', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { reviewed_by } = req.body;
    if (!reviewed_by) {
      return res.status(400).json({ error: 'Reviewer name is required' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE production_orders
       SET status = 'reviewed', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2 AND status = 'completed'
       RETURNING *`,
      [reviewed_by, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be in completed status to review' });
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
       VALUES ('production_orders', $1, 'UPDATE', $2, $3)`,
      [req.params.id, req.session.username || 'admin', JSON.stringify({ status: 'reviewed', reviewed_by })]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reviewing order:', err);
    res.status(500).json({ error: 'Failed to review order' });
  } finally {
    client.release();
  }
});

// GET /api/admin/audit-log — View audit trail
router.get('/audit-log', requireAdmin, async (req, res) => {
  try {
    const { table_name, record_id, page = 1, per_page = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (table_name) { whereClause += ` AND table_name = $${idx++}`; params.push(table_name); }
    if (record_id) { whereClause += ` AND record_id = $${idx++}`; params.push(record_id); }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_log ${whereClause}`, params
    );

    const offset = (parseInt(page) - 1) * parseInt(per_page);
    const result = await pool.query(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(per_page), offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: parseInt(countResult.rows[0].total),
        total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(per_page)),
      },
    });
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/admin/history - Historical data with filters
router.get('/history', requireAdmin, async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to, page = 1, per_page = 50 } = req.query;

    let query = `
      SELECT m.*, s.product_name, s.product_code, l.display_name as line_name,
             po.po_number
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      LEFT JOIN production_orders po ON m.production_order_id = po.id
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

// GET /api/admin/reports — Paginated shift reports
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to, page = 1, per_page = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (line_id) { whereClause += ` AND r.line_id = $${idx++}`; params.push(line_id); }
    if (sku_id) { whereClause += ` AND r.sku_id = $${idx++}`; params.push(sku_id); }
    if (shift) { whereClause += ` AND r.shift = $${idx++}`; params.push(shift); }
    if (date_from) { whereClause += ` AND r.shift_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND r.shift_date <= $${idx++}`; params.push(date_to); }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM shift_reports r ${whereClause}`, params
    );

    const offset = (parseInt(page) - 1) * parseInt(per_page);
    const result = await pool.query(
      `SELECT r.*, s.product_name, s.product_code, l.display_name as line_name
       FROM shift_reports r
       JOIN skus s ON r.sku_id = s.id
       JOIN lines l ON r.line_id = l.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(per_page), offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: parseInt(countResult.rows[0].total),
        total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(per_page)),
      },
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/admin/export/csv - Streaming CSV export
router.get('/export/csv', requireAdmin, async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to } = req.query;

    let query = `
      SELECT m.recorded_at, m.shift_date, m.shift, m.freezer_number, m.pump_number,
             m.operator_initials, m.lead_initials,
             m.thickness_value, m.weight_value, m.coating_value,
             m.adjustments, m.status_overall, m.best_buy_code,
             m.production_order_id,
             s.product_name, s.product_code,
             l.display_name as line_name,
             po.po_number
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      LEFT JOIN production_orders po ON m.production_order_id = po.id
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

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=spc-data-export.csv');

    // Stream headers
    const headers = [
      'Date', 'Shift', 'Time', 'Line', 'Freezer', 'Pump', 'PO Number',
      'Product', 'Product Code', 'Best Buy Code',
      'Operator', 'Lead', 'Slice Thickness', 'Slice Weight', 'Coating Weight',
      'Status', 'Adjustments',
    ];
    res.write(headers.join(',') + '\n');

    // Stream rows using cursor
    const result = await pool.query(query, params);
    for (const row of result.rows) {
      const time = row.recorded_at
        ? new Date(row.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
      const values = [
        row.shift_date, row.shift, time, row.line_name,
        row.freezer_number, row.pump_number, row.po_number || '',
        `"${row.product_name}"`, row.product_code, row.best_buy_code || '',
        row.operator_initials, row.lead_initials || '',
        row.thickness_value || '', row.weight_value || '', row.coating_value || '',
        row.status_overall || '',
        `"${(row.adjustments || '').replace(/"/g, '""')}"`,
      ];
      res.write(values.join(',') + '\n');
    }

    res.end();
  } catch (err) {
    console.error('Error exporting CSV:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  }
});

// GET /api/admin/export/excel - Excel export
router.get('/export/excel', requireAdmin, async (req, res) => {
  try {
    const { line_id, sku_id, shift, date_from, date_to } = req.query;

    let query = `
      SELECT m.recorded_at, m.shift_date, m.shift, m.freezer_number, m.pump_number,
             m.operator_initials, m.lead_initials,
             m.thickness_value, m.weight_value, m.coating_value,
             m.adjustments, m.status_overall, m.best_buy_code,
             s.product_name, s.product_code,
             l.display_name as line_name,
             po.po_number
      FROM measurements m
      JOIN skus s ON m.sku_id = s.id
      JOIN lines l ON m.line_id = l.id
      LEFT JOIN production_orders po ON m.production_order_id = po.id
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=spc-data-export.xlsx');

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });
    workbook.creator = 'SPC Control Chart System - Plant #1352';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('SPC Data');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Shift', key: 'shift', width: 8 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Line', key: 'line', width: 12 },
      { header: 'Freezer', key: 'freezer', width: 8 },
      { header: 'Pump', key: 'pump', width: 8 },
      { header: 'PO Number', key: 'po_number', width: 14 },
      { header: 'Product', key: 'product', width: 35 },
      { header: 'Product Code', key: 'code', width: 12 },
      { header: 'Best Buy Code', key: 'best_buy', width: 14 },
      { header: 'Operator', key: 'operator', width: 10 },
      { header: 'Lead', key: 'lead', width: 10 },
      { header: 'Slice Thickness', key: 'thickness', width: 14 },
      { header: 'Slice Weight', key: 'weight', width: 12 },
      { header: 'Coating Weight', key: 'coating', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Adjustments', key: 'adjustments', width: 30 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1a1a2e' },
    };

    for (const row of result.rows) {
      const time = row.recorded_at
        ? new Date(row.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
      sheet.addRow({
        date: row.shift_date,
        shift: row.shift,
        time,
        line: row.line_name,
        freezer: row.freezer_number,
        pump: row.pump_number,
        po_number: row.po_number || '',
        product: row.product_name,
        code: row.product_code,
        best_buy: row.best_buy_code || '',
        operator: row.operator_initials,
        lead: row.lead_initials || '',
        thickness: row.thickness_value ? parseFloat(row.thickness_value) : null,
        weight: row.weight_value ? parseFloat(row.weight_value) : null,
        coating: row.coating_value ? parseFloat(row.coating_value) : null,
        status: row.status_overall || '',
        adjustments: row.adjustments || '',
      }).commit();
    }
    await workbook.commit();
  } catch (err) {
    console.error('Error exporting Excel:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  }
});

// GET /api/admin/production-orders/:id/csv — Per-batch CSV export
router.get('/production-orders/:id/csv', requireAdmin, async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT po.*, s.product_name, s.product_code, l.display_name as line_name
       FROM production_orders po
       JOIN skus s ON po.sku_id = s.id
       JOIN lines l ON po.line_id = l.id
       WHERE po.id = $1`,
      [req.params.id]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const po = order.rows[0];

    const result = await pool.query(
      `SELECT m.*, s.product_name, l.display_name as line_name
       FROM measurements m
       JOIN skus s ON m.sku_id = s.id
       JOIN lines l ON m.line_id = l.id
       WHERE m.production_order_id = $1
       ORDER BY m.freezer_number, m.pump_number, m.recorded_at`,
      [req.params.id]
    );

    const filename = `batch-${po.po_number || po.id}-${po.shift_date}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    res.write(`PO Number,${po.po_number || ''}\n`);
    res.write(`Line,${po.line_name}\n`);
    res.write(`Product,${po.product_name} (${po.product_code})\n`);
    res.write(`Best Buy Code,${po.best_buy_code}\n`);
    res.write(`Shift,${po.shift}\n`);
    res.write(`Date,${po.shift_date}\n`);
    res.write(`Status,${po.status}\n`);
    res.write('\n');

    const headers = [
      'Time', 'Freezer', 'Pump', 'Operator', 'Lead',
      'Thickness', 'Weight', 'Coating', 'Status', 'Adjustments',
    ];
    res.write(headers.join(',') + '\n');

    for (const row of result.rows) {
      const time = row.recorded_at
        ? new Date(row.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
      const values = [
        time, row.freezer_number, row.pump_number,
        row.operator_initials, row.lead_initials || '',
        row.thickness_value || '', row.weight_value || '', row.coating_value || '',
        row.status_overall || '',
        `"${(row.adjustments || '').replace(/"/g, '""')}"`,
      ];
      res.write(values.join(',') + '\n');
    }

    res.end();
  } catch (err) {
    console.error('Error exporting batch CSV:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export batch CSV' });
    }
  }
});

module.exports = router;
