const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');

// Helper: calculate stats for a parameter
function calcStats(values) {
  if (!values.length) return { avg: 0, min: 0, max: 0, count: 0 };
  const nums = values.filter(v => v !== null).map(Number);
  if (!nums.length) return { avg: 0, min: 0, max: 0, count: 0 };
  return {
    avg: parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3)),
    min: Math.min(...nums),
    max: Math.max(...nums),
    count: nums.length,
  };
}

// Helper: count out-of-control and warnings
function countAlerts(values, limits) {
  let outOfControl = 0;
  let warnings = 0;
  for (const v of values.filter(x => x !== null)) {
    const num = Number(v);
    if (num < limits.lcl || num > limits.ucl) {
      outOfControl++;
    } else if (num < limits.lwl || num > limits.uwl) {
      warnings++;
    }
  }
  return { outOfControl, warnings };
}

// POST /api/reports - Create a shift report
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { line_id, sku_id, shift, shift_date, operator_name, supervisor_name, notes } = req.body;

    if (!line_id || !sku_id || !shift || !shift_date || !operator_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get SKU limits
    const skuResult = await client.query('SELECT * FROM skus WHERE id = $1', [sku_id]);
    if (skuResult.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    const sku = skuResult.rows[0];

    // Get measurements for this shift
    const measResult = await client.query(
      `SELECT * FROM measurements
       WHERE sku_id = $1 AND line_id = $2 AND shift = $3 AND shift_date = $4
       ORDER BY recorded_at ASC`,
      [sku_id, line_id, shift, shift_date]
    );
    const measurements = measResult.rows;

    // Calculate stats
    const thicknessValues = measurements.map(m => m.thickness_value);
    const weightValues = measurements.map(m => m.weight_value);
    const coatingValues = measurements.map(m => m.coating_value);

    const thicknessStats = calcStats(thicknessValues);
    const weightStats = calcStats(weightValues);
    const coatingStats = calcStats(coatingValues);

    const thicknessAlerts = countAlerts(thicknessValues, {
      lcl: sku.thickness_lcl, lwl: sku.thickness_lwl,
      uwl: sku.thickness_uwl, ucl: sku.thickness_ucl,
    });
    const weightAlerts = countAlerts(weightValues, {
      lcl: sku.weight_lcl, lwl: sku.weight_lwl,
      uwl: sku.weight_uwl, ucl: sku.weight_ucl,
    });
    const coatingAlerts = countAlerts(coatingValues, {
      lcl: sku.coating_lcl, lwl: sku.coating_lwl,
      uwl: sku.coating_uwl, ucl: sku.coating_ucl,
    });

    const reportData = {
      sku: { product_name: sku.product_name, product_code: sku.product_code },
      measurements: measurements.map(m => ({
        id: m.id,
        freezer: m.freezer_number,
        time: m.recorded_at,
        thickness: m.thickness_value,
        weight: m.weight_value,
        coating: m.coating_value,
        operator: m.operator_initials,
        lead: m.lead_initials,
        adjustments: m.adjustments,
      })),
      stats: { thickness: thicknessStats, weight: weightStats, coating: coatingStats },
      alerts: { thickness: thicknessAlerts, weight: weightAlerts, coating: coatingAlerts },
    };

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO shift_reports (
        line_id, sku_id, shift, shift_date, operator_name, supervisor_name,
        total_measurements,
        thickness_avg, thickness_min, thickness_max, thickness_out_of_control, thickness_warnings,
        weight_avg, weight_min, weight_max, weight_out_of_control, weight_warnings,
        coating_avg, coating_min, coating_max, coating_out_of_control, coating_warnings,
        notes, report_data, signed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *`,
      [
        line_id, sku_id, shift, shift_date, operator_name, supervisor_name || null,
        measurements.length,
        thicknessStats.avg, thicknessStats.min, thicknessStats.max, thicknessAlerts.outOfControl, thicknessAlerts.warnings,
        weightStats.avg, weightStats.min, weightStats.max, weightAlerts.outOfControl, weightAlerts.warnings,
        coatingStats.avg, coatingStats.min, coatingStats.max, coatingAlerts.outOfControl, coatingAlerts.warnings,
        notes || null, JSON.stringify(reportData), supervisor_name ? new Date().toISOString() : null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  } finally {
    client.release();
  }
});

// GET /api/reports - List shift reports
router.get('/', async (req, res) => {
  try {
    const { line_id, sku_id, shift_date, limit = 50 } = req.query;

    let query = `
      SELECT r.*, s.product_name, s.product_code, l.display_name as line_name
      FROM shift_reports r
      JOIN skus s ON r.sku_id = s.id
      JOIN lines l ON r.line_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (line_id) { query += ` AND r.line_id = $${paramIdx++}`; params.push(line_id); }
    if (sku_id) { query += ` AND r.sku_id = $${paramIdx++}`; params.push(sku_id); }
    if (shift_date) { query += ` AND r.shift_date = $${paramIdx++}`; params.push(shift_date); }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramIdx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id - Get single report
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.product_name, s.product_code, s.cr_code,
              s.thickness_label, s.thickness_target, s.thickness_lcl, s.thickness_lwl, s.thickness_uwl, s.thickness_ucl,
              s.weight_label, s.weight_target, s.weight_lcl, s.weight_lwl, s.weight_uwl, s.weight_ucl,
              s.coating_label, s.coating_target, s.coating_lcl, s.coating_lwl, s.coating_uwl, s.coating_ucl,
              l.display_name as line_name
       FROM shift_reports r
       JOIN skus s ON r.sku_id = s.id
       JOIN lines l ON r.line_id = l.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /api/reports/:id/pdf - Generate PDF for a shift report
router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.product_name, s.product_code, s.cr_code,
              s.thickness_label, s.thickness_target, s.thickness_lcl, s.thickness_ucl,
              s.weight_label, s.weight_target, s.weight_lcl, s.weight_ucl,
              s.coating_label, s.coating_target, s.coating_lcl, s.coating_ucl,
              l.display_name as line_name
       FROM shift_reports r
       JOIN skus s ON r.sku_id = s.id
       JOIN lines l ON r.line_id = l.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    const reportData = report.report_data || {};

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shift-report-${report.id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('SPC SHIFT REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Klondike Department - Plant #1352, Covington', { align: 'center' });
    doc.moveDown();

    // Report info
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Product: ${report.product_name} (${report.product_code})`);
    doc.font('Helvetica');
    doc.text(`Line: ${report.line_name} | Shift: ${report.shift} | Date: ${report.shift_date}`);
    doc.text(`Operator: ${report.operator_name} | Supervisor: ${report.supervisor_name || 'N/A'}`);
    doc.text(`Total Measurements: ${report.total_measurements}`);
    doc.text(`CR Code: ${report.cr_code || 'N/A'}`);
    doc.moveDown();

    // Separator
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();

    // Parameter summaries
    const params = [
      {
        label: report.thickness_label, target: report.thickness_target,
        lcl: report.thickness_lcl, ucl: report.thickness_ucl,
        avg: report.thickness_avg, min: report.thickness_min, max: report.thickness_max,
        ooc: report.thickness_out_of_control, warn: report.thickness_warnings,
      },
      {
        label: report.weight_label, target: report.weight_target,
        lcl: report.weight_lcl, ucl: report.weight_ucl,
        avg: report.weight_avg, min: report.weight_min, max: report.weight_max,
        ooc: report.weight_out_of_control, warn: report.weight_warnings,
      },
      {
        label: report.coating_label, target: report.coating_target,
        lcl: report.coating_lcl, ucl: report.coating_ucl,
        avg: report.coating_avg, min: report.coating_min, max: report.coating_max,
        ooc: report.coating_out_of_control, warn: report.coating_warnings,
      },
    ];

    for (const p of params) {
      doc.fontSize(11).font('Helvetica-Bold').text(p.label);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Target: ${p.target} | LCL: ${p.lcl} | UCL: ${p.ucl}`);
      doc.text(`Average: ${p.avg} | Min: ${p.min} | Max: ${p.max}`);

      const status = p.ooc > 0 ? 'OUT OF CONTROL' : p.warn > 0 ? 'WARNING' : 'IN CONTROL';
      doc.font('Helvetica-Bold').fillColor(p.ooc > 0 ? 'red' : p.warn > 0 ? 'orange' : 'green')
        .text(`Status: ${status} (${p.ooc} OOC, ${p.warn} warnings)`);
      doc.fillColor('black').font('Helvetica');
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();

    // Measurement table
    const measurements = reportData.measurements || [];
    if (measurements.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('Measurement Details');
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const colWidths = [60, 50, 70, 70, 70, 50, 50, 95];
      const headers = ['Time', 'Freezer', 'Thickness', 'Weight', 'Coating', 'Op.', 'Lead', 'Adjustments'];

      doc.fontSize(8).font('Helvetica-Bold');
      let x = 40;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      }
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(7);
      for (const m of measurements) {
        if (doc.y > 750) {
          doc.addPage();
        }
        const y = doc.y + 3;
        x = 40;
        const time = new Date(m.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const rowData = [
          time, String(m.freezer),
          m.thickness != null ? String(m.thickness) : '-',
          m.weight != null ? String(m.weight) : '-',
          m.coating != null ? String(m.coating) : '-',
          m.operator || '-', m.lead || '-',
          m.adjustments || '-',
        ];
        for (let i = 0; i < rowData.length; i++) {
          doc.text(rowData[i], x, y, { width: colWidths[i], align: 'left' });
          x += colWidths[i];
        }
        doc.moveDown(0.3);
      }
    }

    // Notes
    if (report.notes) {
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(report.notes);
    }

    // Sign-off section
    doc.moveDown(2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Bold').text('Sign-Off');
    doc.font('Helvetica');
    doc.text(`Operator: ${report.operator_name}    Date: ${report.shift_date}`);
    doc.text(`Supervisor: ${report.supervisor_name || '________________________'}    Date: ${report.signed_at ? new Date(report.signed_at).toLocaleDateString() : '____________'}`);

    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
