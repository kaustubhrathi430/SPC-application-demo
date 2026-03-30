const express = require('express');
const pool = require('../config/database');
const { requireMaster, hashPassword, verifyPassword } = require('../middleware/auth');
const { buildSystemHealthSnapshot } = require('../utils/systemHealth');

const router = express.Router();
router.use(requireMaster);

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function writeAudit(client, { table, recordId, action, changedBy, reason = null, oldValues = null, newValues = null }) {
  await client.query(
    `INSERT INTO audit_log (table_name, record_id, action, changed_by, reason, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      table,
      recordId,
      action,
      changedBy,
      reason,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
    ]
  );
}

async function getLineWithFreezers(client, lineId) {
  const lineResult = await client.query('SELECT * FROM lines WHERE id = $1', [lineId]);
  if (lineResult.rows.length === 0) return null;
  const freezersResult = await client.query(
    `SELECT id, freezer_number, pump_count, asset_id
     FROM line_freezers
     WHERE line_id = $1
     ORDER BY freezer_number`,
    [lineId]
  );
  return { ...lineResult.rows[0], freezers: freezersResult.rows };
}

async function getSkuById(client, skuId) {
  const result = await client.query('SELECT * FROM skus WHERE id = $1', [skuId]);
  return result.rows[0] || null;
}

function sanitizeSkuPayload(body) {
  return {
    product_name: body.product_name,
    product_code: body.product_code,
    cr_code: body.cr_code || null,
    startup_cup_weight_target: body.startup_cup_weight_target || null,
    thickness_label: body.thickness_label,
    thickness_target: body.thickness_target,
    thickness_lcl: body.thickness_lcl,
    thickness_lwl: body.thickness_lwl,
    thickness_uwl: body.thickness_uwl,
    thickness_ucl: body.thickness_ucl,
    thickness_unit: body.thickness_unit || 'mm',
    weight_label: body.weight_label,
    weight_target: body.weight_target,
    weight_lcl: body.weight_lcl,
    weight_lwl: body.weight_lwl,
    weight_uwl: body.weight_uwl,
    weight_ucl: body.weight_ucl,
    weight_unit: body.weight_unit || 'grams',
    coating_label: body.coating_label,
    coating_target: body.coating_target,
    coating_lcl: body.coating_lcl,
    coating_lwl: body.coating_lwl,
    coating_uwl: body.coating_uwl,
    coating_ucl: body.coating_ucl,
    coating_unit: body.coating_unit || 'grams',
    pack_size: body.pack_size || '6pk',
    sort_order: body.sort_order || 999,
    active: body.active !== false,
  };
}

function validateSkuPayload(payload) {
  const requiredFields = [
    'product_name', 'product_code', 'thickness_label', 'thickness_target', 'thickness_lcl', 'thickness_lwl', 'thickness_uwl', 'thickness_ucl',
    'weight_label', 'weight_target', 'weight_lcl', 'weight_lwl', 'weight_uwl', 'weight_ucl',
    'coating_label', 'coating_target', 'coating_lcl', 'coating_lwl', 'coating_uwl', 'coating_ucl',
  ];
  return requiredFields.every((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '');
}

async function generateInternalLineName(client, displayName, currentLineId = null) {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'line';
  let candidate = base;
  let suffix = 2;
  while (true) {
    const params = [candidate];
    let query = 'SELECT id FROM lines WHERE name = $1';
    if (currentLineId) {
      query += ' AND id <> $2';
      params.push(currentLineId);
    }
    const existing = await client.query(query, params);
    if (existing.rows.length === 0) {
      return candidate;
    }
    candidate = `${base}_${suffix++}`;
  }
}

// GET /api/admin/master-config/skus
router.get('/skus', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skus ORDER BY sort_order, product_name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching master SKU list:', err);
    res.status(500).json({ error: 'Failed to fetch SKUs' });
  }
});

// POST /api/admin/master-config/skus
router.post('/skus', async (req, res) => {
  const client = await pool.connect();
  try {
    const payload = sanitizeSkuPayload(req.body);
    if (!validateSkuPayload(payload)) {
      return res.status(400).json({ error: 'Missing required SKU fields' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO skus (
        product_name, product_code, cr_code, startup_cup_weight_target,
        thickness_label, thickness_target, thickness_lcl, thickness_lwl, thickness_uwl, thickness_ucl, thickness_unit,
        weight_label, weight_target, weight_lcl, weight_lwl, weight_uwl, weight_ucl, weight_unit,
        coating_label, coating_target, coating_lcl, coating_lwl, coating_uwl, coating_ucl, coating_unit,
        pack_size, sort_order, active
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,
        $26,$27,$28
      )
      RETURNING *`,
      [
        payload.product_name, payload.product_code, payload.cr_code, payload.startup_cup_weight_target,
        payload.thickness_label, payload.thickness_target, payload.thickness_lcl, payload.thickness_lwl, payload.thickness_uwl, payload.thickness_ucl, payload.thickness_unit,
        payload.weight_label, payload.weight_target, payload.weight_lcl, payload.weight_lwl, payload.weight_uwl, payload.weight_ucl, payload.weight_unit,
        payload.coating_label, payload.coating_target, payload.coating_lcl, payload.coating_lwl, payload.coating_uwl, payload.coating_ucl, payload.coating_unit,
        payload.pack_size, payload.sort_order, payload.active,
      ]
    );

    await writeAudit(client, {
      table: 'skus',
      recordId: result.rows[0].id,
      action: 'INSERT',
      changedBy: req.session.username,
      newValues: result.rows[0],
    });

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating SKU:', err);
    res.status(500).json({ error: 'Failed to create SKU' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/master-config/skus/:id
router.put('/skus/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const payload = sanitizeSkuPayload(req.body);
    if (!validateSkuPayload(payload)) {
      return res.status(400).json({ error: 'Missing required SKU fields' });
    }

    const existing = await getSkuById(client, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE skus SET
        product_name = $1,
        product_code = $2,
        cr_code = $3,
        startup_cup_weight_target = $4,
        thickness_label = $5,
        thickness_target = $6,
        thickness_lcl = $7,
        thickness_lwl = $8,
        thickness_uwl = $9,
        thickness_ucl = $10,
        thickness_unit = $11,
        weight_label = $12,
        weight_target = $13,
        weight_lcl = $14,
        weight_lwl = $15,
        weight_uwl = $16,
        weight_ucl = $17,
        weight_unit = $18,
        coating_label = $19,
        coating_target = $20,
        coating_lcl = $21,
        coating_lwl = $22,
        coating_uwl = $23,
        coating_ucl = $24,
        coating_unit = $25,
        pack_size = $26,
        sort_order = $27,
        active = $28
       WHERE id = $29
       RETURNING *`,
      [
        payload.product_name, payload.product_code, payload.cr_code, payload.startup_cup_weight_target,
        payload.thickness_label, payload.thickness_target, payload.thickness_lcl, payload.thickness_lwl, payload.thickness_uwl, payload.thickness_ucl, payload.thickness_unit,
        payload.weight_label, payload.weight_target, payload.weight_lcl, payload.weight_lwl, payload.weight_uwl, payload.weight_ucl, payload.weight_unit,
        payload.coating_label, payload.coating_target, payload.coating_lcl, payload.coating_lwl, payload.coating_uwl, payload.coating_ucl, payload.coating_unit,
        payload.pack_size, payload.sort_order, payload.active, req.params.id,
      ]
    );

    await writeAudit(client, {
      table: 'skus',
      recordId: req.params.id,
      action: 'UPDATE',
      changedBy: req.session.username,
      oldValues: existing,
      newValues: result.rows[0],
    });

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating SKU:', err);
    res.status(500).json({ error: 'Failed to update SKU' });
  } finally {
    client.release();
  }
});

async function handleSkuActivationChange(req, res, nextState) {
  const client = await pool.connect();
  try {
    const existing = await getSkuById(client, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    if (!nextState) {
      const activeOrders = await client.query(
        `SELECT COUNT(*) AS total
         FROM production_orders
         WHERE sku_id = $1 AND status = 'active'`,
        [req.params.id]
      );
      const activeOrderCount = parseInt(activeOrders.rows[0].total, 10);
      if (activeOrderCount > 0 && !req.body.confirm_active_orders) {
        return res.status(409).json({
          error: 'Active production orders exist for this SKU',
          active_order_count: activeOrderCount,
        });
      }
    }

    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE skus SET active = $1 WHERE id = $2 RETURNING *',
      [nextState, req.params.id]
    );

    await writeAudit(client, {
      table: 'skus',
      recordId: req.params.id,
      action: 'UPDATE',
      changedBy: req.session.username,
      oldValues: existing,
      newValues: result.rows[0],
      reason: nextState ? 'reactivate' : 'deactivate',
    });

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error changing SKU activation:', err);
    res.status(500).json({ error: 'Failed to update SKU activation' });
  } finally {
    client.release();
  }
}

router.post('/skus/:id/deactivate', async (req, res) => handleSkuActivationChange(req, res, false));
router.post('/skus/:id/reactivate', async (req, res) => handleSkuActivationChange(req, res, true));

// GET /api/admin/master-config/lines
router.get('/lines', async (req, res) => {
  try {
    const linesResult = await pool.query('SELECT * FROM lines ORDER BY id');
    const freezersResult = await pool.query(
      `SELECT id, line_id, freezer_number, pump_count, asset_id
       FROM line_freezers
       ORDER BY line_id, freezer_number`
    );
    const freezersByLine = new Map();
    for (const freezer of freezersResult.rows) {
      const list = freezersByLine.get(freezer.line_id) || [];
      list.push(freezer);
      freezersByLine.set(freezer.line_id, list);
    }
    res.json(linesResult.rows.map((line) => ({
      ...line,
      freezers: freezersByLine.get(line.id) || [],
    })));
  } catch (err) {
    console.error('Error fetching master line list:', err);
    res.status(500).json({ error: 'Failed to fetch lines' });
  }
});

// POST /api/admin/master-config/lines
router.post('/lines', async (req, res) => {
  const client = await pool.connect();
  try {
    const { display_name, asset_id = null, active = true, freezers = [] } = req.body;
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'display_name is required' });
    }
    if (!Array.isArray(freezers) || freezers.length === 0) {
      return res.status(400).json({ error: 'At least one freezer is required' });
    }

    await client.query('BEGIN');

    const lineName = await generateInternalLineName(client, display_name.trim());
    const lineResult = await client.query(
      `INSERT INTO lines (name, display_name, freezer_count, asset_id, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [lineName, display_name.trim(), freezers.length, asset_id || null, active !== false]
    );

    for (const freezer of freezers) {
      await client.query(
        `INSERT INTO line_freezers (line_id, freezer_number, pump_count, asset_id)
         VALUES ($1, $2, $3, $4)`,
        [
          lineResult.rows[0].id,
          freezer.freezer_number,
          freezer.pump_count || 1,
          freezer.asset_id || null,
        ]
      );
    }

    const created = await getLineWithFreezers(client, lineResult.rows[0].id);

    await writeAudit(client, {
      table: 'lines',
      recordId: created.id,
      action: 'INSERT',
      changedBy: req.session.username,
      newValues: created,
    });

    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating line:', err);
    res.status(500).json({ error: 'Failed to create line' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/master-config/lines/:id
router.put('/lines/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { display_name, asset_id = null, active = true } = req.body;
    const existing = await getLineWithFreezers(client, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Line not found' });
    }
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'display_name is required' });
    }

    await client.query('BEGIN');
    const internalName = await generateInternalLineName(client, display_name.trim(), req.params.id);
    await client.query(
      `UPDATE lines
       SET name = $1, display_name = $2, asset_id = $3, active = $4
       WHERE id = $5`,
      [internalName, display_name.trim(), asset_id || null, active !== false, req.params.id]
    );

    const updated = await getLineWithFreezers(client, req.params.id);
    await writeAudit(client, {
      table: 'lines',
      recordId: req.params.id,
      action: 'UPDATE',
      changedBy: req.session.username,
      oldValues: existing,
      newValues: updated,
    });

    await client.query('COMMIT');
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating line:', err);
    res.status(500).json({ error: 'Failed to update line' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/master-config/lines/:id/freezers
router.put('/lines/:id/freezers', async (req, res) => {
  const client = await pool.connect();
  try {
    const existing = await getLineWithFreezers(client, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Line not found' });
    }

    const freezers = Array.isArray(req.body.freezers) ? req.body.freezers : [];
    if (freezers.length === 0) {
      return res.status(400).json({ error: 'freezers is required' });
    }

    await client.query('BEGIN');

    const existingByNumber = new Map(existing.freezers.map((freezer) => [freezer.freezer_number, freezer]));
    const incomingNumbers = new Set(freezers.map((freezer) => Number(freezer.freezer_number)));

    for (const freezer of existing.freezers) {
      if (!incomingNumbers.has(Number(freezer.freezer_number))) {
        const measurementCount = await client.query(
          `SELECT COUNT(*) AS total
           FROM measurements
           WHERE line_id = $1 AND freezer_number = $2`,
          [req.params.id, freezer.freezer_number]
        );
        if (parseInt(measurementCount.rows[0].total, 10) > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: `Freezer ${freezer.freezer_number} has historical measurements and cannot be removed`,
          });
        }
        await client.query('DELETE FROM line_freezers WHERE id = $1', [freezer.id]);
      }
    }

    for (const freezer of freezers) {
      const freezerNumber = Number(freezer.freezer_number);
      if (!freezerNumber) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each freezer requires freezer_number' });
      }
      if (existingByNumber.has(freezerNumber)) {
        await client.query(
          `UPDATE line_freezers
           SET pump_count = $1, asset_id = $2
           WHERE line_id = $3 AND freezer_number = $4`,
          [freezer.pump_count || 1, freezer.asset_id || null, req.params.id, freezerNumber]
        );
      } else {
        await client.query(
          `INSERT INTO line_freezers (line_id, freezer_number, pump_count, asset_id)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, freezerNumber, freezer.pump_count || 1, freezer.asset_id || null]
        );
      }
    }

    await client.query(
      'UPDATE lines SET freezer_count = $1 WHERE id = $2',
      [freezers.length, req.params.id]
    );

    const updated = await getLineWithFreezers(client, req.params.id);
    await writeAudit(client, {
      table: 'line_freezers',
      recordId: req.params.id,
      action: 'UPDATE',
      changedBy: req.session.username,
      oldValues: existing.freezers,
      newValues: updated.freezers,
    });

    await client.query('COMMIT');
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating line freezers:', err);
    res.status(500).json({ error: 'Failed to update freezer configuration' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/master-config/passwords/admin
router.put('/passwords/admin', async (req, res) => {
  const client = await pool.connect();
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ error: 'new_password must be at least 4 characters' });
    }

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO master_config (key, value, updated_by)
       VALUES ('admin_password_hash', $1, $2)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [hashPassword(new_password), req.session.username]
    );
    await writeAudit(client, {
      table: 'master_config',
      recordId: 0,
      action: 'UPDATE',
      changedBy: req.session.username,
      reason: 'admin password changed',
      newValues: { key: 'admin_password_hash' },
    });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating admin password:', err);
    res.status(500).json({ error: 'Failed to update admin password' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/master-config/passwords/me
router.put('/passwords/me', async (req, res) => {
  const client = await pool.connect();
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'current_password and a 6+ char new_password are required' });
    }

    const existing = await client.query(
      'SELECT id, username, password_hash FROM master_accounts WHERE username = $1',
      [req.session.username]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Master account not found' });
    }
    if (!verifyPassword(current_password, existing.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await client.query('BEGIN');
    await client.query(
      'UPDATE master_accounts SET password_hash = $1 WHERE id = $2',
      [hashPassword(new_password), existing.rows[0].id]
    );
    await writeAudit(client, {
      table: 'master_accounts',
      recordId: existing.rows[0].id,
      action: 'UPDATE',
      changedBy: req.session.username,
      reason: 'master password changed',
      newValues: { username: req.session.username },
    });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating master password:', err);
    res.status(500).json({ error: 'Failed to update master password' });
  } finally {
    client.release();
  }
});

// GET /api/admin/master-config/master-accounts
router.get('/master-accounts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, created_at FROM master_accounts ORDER BY username'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching master accounts:', err);
    res.status(500).json({ error: 'Failed to fetch master accounts' });
  }
});

// POST /api/admin/master-config/master-accounts
router.post('/master-accounts', async (req, res) => {
  const client = await pool.connect();
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'username and 6+ char password are required' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO master_accounts (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
      [username.trim().toLowerCase(), hashPassword(password)]
    );

    await writeAudit(client, {
      table: 'master_accounts',
      recordId: result.rows[0].id,
      action: 'INSERT',
      changedBy: req.session.username,
      newValues: result.rows[0],
    });

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating master account:', err);
    res.status(500).json({ error: 'Failed to create master account' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/master-config/master-accounts/:id
router.delete('/master-accounts/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const accounts = await client.query('SELECT id, username, created_at FROM master_accounts ORDER BY id');
    if (accounts.rows.length <= 1) {
      return res.status(409).json({ error: 'Cannot delete the last remaining master account' });
    }
    const target = accounts.rows.find((row) => String(row.id) === String(req.params.id));
    if (!target) {
      return res.status(404).json({ error: 'Master account not found' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM master_accounts WHERE id = $1', [req.params.id]);
    await writeAudit(client, {
      table: 'master_accounts',
      recordId: req.params.id,
      action: 'UPDATE',
      changedBy: req.session.username,
      reason: 'master account removed',
      oldValues: target,
    });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting master account:', err);
    res.status(500).json({ error: 'Failed to delete master account' });
  } finally {
    client.release();
  }
});

// GET /api/admin/master-config/health
router.get('/health', async (req, res) => {
  try {
    const snapshot = await buildSystemHealthSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Error building health snapshot:', err);
    res.status(500).json({ error: 'Failed to fetch health snapshot' });
  }
});

module.exports = router;
