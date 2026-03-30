const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');

const router = express.Router();

function calcStats(values) {
  if (!values.length) return { avg: 0, min: 0, max: 0, count: 0 };
  const nums = values.filter((value) => value !== null && value !== undefined).map(Number);
  if (!nums.length) return { avg: 0, min: 0, max: 0, count: 0 };
  return {
    avg: parseFloat((nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(3)),
    min: Math.min(...nums),
    max: Math.max(...nums),
    count: nums.length,
  };
}

function countAlerts(values, limits) {
  let outOfControl = 0;
  let warnings = 0;
  for (const value of values.filter((entry) => entry !== null && entry !== undefined)) {
    const number = Number(value);
    if (number < Number(limits.lcl) || number > Number(limits.ucl)) {
      outOfControl += 1;
    } else if (number < Number(limits.lwl) || number > Number(limits.uwl)) {
      warnings += 1;
    }
  }
  return { outOfControl, warnings };
}

function safeText(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/\.?0+$/, '');
}

function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeCsv(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function getMeasurementStatusLabel(measurement) {
  if (measurement.status_overall === 'ooc') {
    return measurement.alert_acknowledged_at ? 'OOC ACK' : 'OOC';
  }
  if (measurement.status_overall === 'warning') {
    return measurement.alert_acknowledged_at ? 'WARN ACK' : 'WARNING';
  }
  return 'OK';
}

function groupMeasurements(measurements) {
  const groups = [];
  const groupMap = new Map();

  for (const measurement of measurements) {
    const freezer = Number(measurement.freezer_number || 1);
    const pump = Number(measurement.pump_number || 1);
    const key = `${freezer}:${pump}`;
    if (!groupMap.has(key)) {
      const group = { freezer, pump, measurements: [] };
      groupMap.set(key, group);
      groups.push(group);
    }
    groupMap.get(key).measurements.push(measurement);
  }

  return groups.sort((a, b) => (
    a.freezer - b.freezer || a.pump - b.pump
  ));
}

async function fetchReportContext(client, reportId) {
  const reportResult = await client.query(
    `SELECT r.*, s.product_name, s.product_code, s.cr_code, s.startup_cup_weight_target,
            s.thickness_label, s.thickness_target, s.thickness_lcl, s.thickness_lwl, s.thickness_uwl, s.thickness_ucl, s.thickness_unit,
            s.weight_label, s.weight_target, s.weight_lcl, s.weight_lwl, s.weight_uwl, s.weight_ucl, s.weight_unit,
            s.coating_label, s.coating_target, s.coating_lcl, s.coating_lwl, s.coating_uwl, s.coating_ucl, s.coating_unit,
            l.display_name AS line_name,
            po.reviewed_at, po.reviewed_by
     FROM shift_reports r
     JOIN skus s ON r.sku_id = s.id
     JOIN lines l ON r.line_id = l.id
     LEFT JOIN production_orders po ON po.id = r.production_order_id
     WHERE r.id = $1`,
    [reportId]
  );

  if (reportResult.rows.length === 0) return null;

  const report = reportResult.rows[0];
  let measurementsResult;

  if (report.production_order_id) {
    measurementsResult = await client.query(
      `SELECT *
       FROM measurements
       WHERE production_order_id = $1
       ORDER BY freezer_number, pump_number, recorded_at`,
      [report.production_order_id]
    );
  } else {
    measurementsResult = await client.query(
      `SELECT *
       FROM measurements
       WHERE sku_id = $1 AND line_id = $2 AND shift = $3 AND shift_date = $4
       ORDER BY freezer_number, pump_number, recorded_at`,
      [report.sku_id, report.line_id, report.shift, report.shift_date]
    );
  }

  return {
    report,
    measurements: measurementsResult.rows,
    groups: groupMeasurements(measurementsResult.rows),
  };
}

function buildCsv(context) {
  const { report, groups } = context;
  const lines = [
    `Plant,${escapeCsv('Plant #1352, Covington')}`,
    `PO Number,${escapeCsv(report.po_number)}`,
    `Line,${escapeCsv(report.line_name)}`,
    `Product,${escapeCsv(`${report.product_name} (${report.product_code})`)}`,
    `Best Buy Code,${escapeCsv(report.best_buy_code)}`,
    `Shift,${escapeCsv(report.shift)}`,
    `Date,${escapeCsv(report.shift_date)}`,
    `CR Code,${escapeCsv(report.cr_code)}`,
    `Startup Cup Weight Target,${escapeCsv(safeNumber(report.startup_cup_weight_target))}`,
    '',
    'Freezer,Pump,Parameter,Time,Data,Adjustments,Operator,Lead,Status',
  ];

  const parameterDefs = [
    { key: 'thickness_value', label: report.thickness_label },
    { key: 'weight_value', label: report.weight_label },
    { key: 'coating_value', label: report.coating_label },
  ];

  for (const group of groups) {
    for (const parameter of parameterDefs) {
      for (const measurement of group.measurements) {
        lines.push([
          group.freezer,
          group.pump,
          escapeCsv(parameter.label),
          escapeCsv(formatTime(measurement.recorded_at)),
          escapeCsv(safeNumber(measurement[parameter.key])),
          escapeCsv(safeText(measurement.adjustments, '')),
          escapeCsv(safeText(measurement.operator_initials, '')),
          escapeCsv(safeText(measurement.lead_initials, '')),
          escapeCsv(getMeasurementStatusLabel(measurement)),
        ].join(','));
      }
    }
  }

  return lines.join('\n');
}

function drawZoneBar(doc, x, y, width, height) {
  const segmentWidth = width / 5;
  const colors = ['#C0392B', '#F39C12', '#27AE60', '#F39C12', '#C0392B'];
  colors.forEach((color, index) => {
    doc.rect(x + (segmentWidth * index), y, segmentWidth, height).fillAndStroke(color, '#666666');
  });
  doc.fillColor('black');
}

function drawPageHeader(doc, report) {
  doc.font('Helvetica-Bold').fontSize(16).text('FILLER SPC CONTROL CHART', { align: 'center' });
  doc.font('Helvetica').fontSize(9).text('Plant #1352, Covington', { align: 'center' });
  doc.moveDown(0.5);

  const rows = [
    [`PO#: ${safeText(report.po_number)}`, `Date: ${safeText(report.shift_date)}`],
    [`Shift: ${safeText(report.shift)}`, `Product: ${safeText(report.product_code)}`],
    [`Best Buy Code: ${safeText(report.best_buy_code)}`, `CR Code: ${safeText(report.cr_code)}`],
    [`Line: ${safeText(report.line_name)}`, `Start-up Cup Weight Target: ${safeNumber(report.startup_cup_weight_target)}`],
  ];

  for (const row of rows) {
    doc.text(row[0], 40, doc.y, { continued: true });
    doc.text(`    ${row[1]}`);
  }

  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.6);
}

function ensureSpace(doc, report, minimumHeight) {
  if (doc.y + minimumHeight < 760) return;
  doc.addPage();
  drawPageHeader(doc, report);
}

function drawGroupHeader(doc, report, group) {
  ensureSpace(doc, report, 34);
  doc.font('Helvetica-Bold').fontSize(11)
    .text(`Freezer #${group.freezer}${group.pump > 1 ? ` | Pump ${group.pump}` : ''}`);
  doc.font('Helvetica').fontSize(8)
    .text(`Manufacturing Date: ${safeText(report.shift_date)} | Qualified Individual: ${safeText(report.operator_name)}`);
  doc.moveDown(0.4);
}

function drawParameterSection(doc, report, group, definition) {
  const parameterRows = group.measurements.map((measurement) => ({
    time: formatTime(measurement.recorded_at),
    value: safeNumber(measurement[definition.key]),
    adjustments: safeText(measurement.adjustments),
    operator: safeText(measurement.operator_initials),
    lead: safeText(measurement.lead_initials),
    status: getMeasurementStatusLabel(measurement),
  }));

  ensureSpace(doc, report, 88);
  doc.font('Helvetica-Bold').fontSize(10).text(definition.label);
  doc.font('Helvetica').fontSize(8)
    .text(
      `LCL ${safeNumber(definition.lcl)} | LWL ${safeNumber(definition.lwl)} | ` +
      `TARGET ${safeNumber(definition.target)} | UWL ${safeNumber(definition.uwl)} | UCL ${safeNumber(definition.ucl)}`
    );
  const zoneY = doc.y + 4;
  drawZoneBar(doc, 40, zoneY, 515, 8);
  doc.moveDown(1.2);

  const headers = ['Time', 'Data', 'Adjustments', 'Operator', 'Lead', 'Status'];
  const widths = [55, 55, 180, 70, 60, 80];

  let x = 40;
  doc.font('Helvetica-Bold').fontSize(8);
  headers.forEach((header, index) => {
    doc.text(header, x, doc.y, { width: widths[index] });
    x += widths[index];
  });
  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(8);
  for (const row of parameterRows) {
    ensureSpace(doc, report, 20);
    x = 40;
    const values = [row.time, row.value, row.adjustments, row.operator, row.lead, row.status];
    values.forEach((value, index) => {
      doc.text(value, x, doc.y, { width: widths[index] });
      x += widths[index];
    });
    doc.moveDown(0.35);
  }

  doc.moveDown(0.6);
}

function drawPdf(context, res) {
  const { report, groups } = context;
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const safePoNumber = safeText(report.po_number, `report-${report.id}`)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=shift-report-${safePoNumber}-${report.shift_date}.pdf`
  );
  doc.pipe(res);

  drawPageHeader(doc, report);
  const parameterDefs = [
    {
      key: 'thickness_value',
      label: report.thickness_label,
      target: report.thickness_target,
      lcl: report.thickness_lcl,
      lwl: report.thickness_lwl,
      uwl: report.thickness_uwl,
      ucl: report.thickness_ucl,
    },
    {
      key: 'weight_value',
      label: report.weight_label,
      target: report.weight_target,
      lcl: report.weight_lcl,
      lwl: report.weight_lwl,
      uwl: report.weight_uwl,
      ucl: report.weight_ucl,
    },
    {
      key: 'coating_value',
      label: report.coating_label,
      target: report.coating_target,
      lcl: report.coating_lcl,
      lwl: report.coating_lwl,
      uwl: report.coating_uwl,
      ucl: report.coating_ucl,
    },
  ];

  for (const group of groups) {
    drawGroupHeader(doc, report, group);
    for (const definition of parameterDefs) {
      drawParameterSection(doc, report, group, definition);
    }
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.6);
  }

  ensureSpace(doc, report, 70);
  doc.font('Helvetica-Bold').fontSize(10).text('Sign-Off');
  doc.font('Helvetica').fontSize(9);
  doc.text(`Qualified Individual: ${safeText(report.operator_name)}`);
  doc.text(`Supervisor / Reviewer: ${safeText(report.reviewed_by || report.supervisor_name)}`);
  doc.text(`Reviewed Date: ${safeText(report.reviewed_at || report.signed_at ? new Date(report.reviewed_at || report.signed_at).toLocaleDateString() : null)}`);
  doc.text(`CR Code: ${safeText(report.cr_code)}`);
  doc.moveDown(0.8);
  doc.fontSize(8).text(
    'Confidential: internal manufacturing quality record. Retain according to plant recordkeeping policy.'
  );

  doc.end();
}

// POST /api/reports - Create a shift report
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      line_id, sku_id, shift, shift_date, operator_name, supervisor_name,
      notes, best_buy_code, po_number, production_order_id,
    } = req.body;

    if (!line_id || !sku_id || !shift || !shift_date || !operator_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const skuResult = await client.query('SELECT * FROM skus WHERE id = $1', [sku_id]);
    if (skuResult.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    const sku = skuResult.rows[0];

    let productionOrder = null;
    if (production_order_id) {
      const poResult = await client.query('SELECT * FROM production_orders WHERE id = $1', [production_order_id]);
      if (poResult.rows.length === 0) {
        return res.status(404).json({ error: 'Production order not found' });
      }
      productionOrder = poResult.rows[0];
    }

    const resolvedBestBuyCode = productionOrder?.best_buy_code || best_buy_code || null;
    const resolvedPoNumber = productionOrder?.po_number || po_number || null;

    const measurementsResult = productionOrder
      ? await client.query(
          `SELECT *
           FROM measurements
           WHERE production_order_id = $1
           ORDER BY freezer_number, pump_number, recorded_at`,
          [production_order_id]
        )
      : await client.query(
          `SELECT *
           FROM measurements
           WHERE sku_id = $1 AND line_id = $2 AND shift = $3 AND shift_date = $4
           ORDER BY freezer_number, pump_number, recorded_at`,
          [sku_id, line_id, shift, shift_date]
        );

    const measurements = measurementsResult.rows;
    const thicknessValues = measurements.map((entry) => entry.thickness_value);
    const weightValues = measurements.map((entry) => entry.weight_value);
    const coatingValues = measurements.map((entry) => entry.coating_value);

    const thicknessStats = calcStats(thicknessValues);
    const weightStats = calcStats(weightValues);
    const coatingStats = calcStats(coatingValues);

    const reportData = {
      production_order_id: productionOrder?.id || production_order_id || null,
      po_number: resolvedPoNumber,
      best_buy_code: resolvedBestBuyCode,
      groups: groupMeasurements(measurements).map((group) => ({
        freezer: group.freezer,
        pump: group.pump,
        measurements: group.measurements.map((measurement) => ({
          id: measurement.id,
          time: measurement.recorded_at,
          thickness: measurement.thickness_value,
          weight: measurement.weight_value,
          coating: measurement.coating_value,
          adjustments: measurement.adjustments,
          operator: measurement.operator_initials,
          lead: measurement.lead_initials,
          status: measurement.status_overall,
          acknowledged_at: measurement.alert_acknowledged_at,
        })),
      })),
    };

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO shift_reports (
        line_id, sku_id, shift, shift_date, operator_name, supervisor_name,
        total_measurements, best_buy_code, po_number, production_order_id,
        thickness_avg, thickness_min, thickness_max, thickness_out_of_control, thickness_warnings,
        weight_avg, weight_min, weight_max, weight_out_of_control, weight_warnings,
        coating_avg, coating_min, coating_max, coating_out_of_control, coating_warnings,
        notes, report_data, signed_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING *`,
      [
        line_id,
        sku_id,
        shift,
        shift_date,
        operator_name,
        supervisor_name || null,
        measurements.length,
        resolvedBestBuyCode,
        resolvedPoNumber,
        productionOrder?.id || production_order_id || null,
        thicknessStats.avg,
        thicknessStats.min,
        thicknessStats.max,
        countAlerts(thicknessValues, {
          lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl,
        }).outOfControl,
        countAlerts(thicknessValues, {
          lcl: sku.thickness_lcl, lwl: sku.thickness_lwl, uwl: sku.thickness_uwl, ucl: sku.thickness_ucl,
        }).warnings,
        weightStats.avg,
        weightStats.min,
        weightStats.max,
        countAlerts(weightValues, {
          lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl,
        }).outOfControl,
        countAlerts(weightValues, {
          lcl: sku.weight_lcl, lwl: sku.weight_lwl, uwl: sku.weight_uwl, ucl: sku.weight_ucl,
        }).warnings,
        coatingStats.avg,
        coatingStats.min,
        coatingStats.max,
        countAlerts(coatingValues, {
          lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl,
        }).outOfControl,
        countAlerts(coatingValues, {
          lcl: sku.coating_lcl, lwl: sku.coating_lwl, uwl: sku.coating_uwl, ucl: sku.coating_ucl,
        }).warnings,
        notes || null,
        JSON.stringify(reportData),
        supervisor_name ? new Date().toISOString() : null,
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
      SELECT r.*, s.product_name, s.product_code, l.display_name AS line_name
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
    params.push(parseInt(limit, 10));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id - Get single report
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const context = await fetchReportContext(client, req.params.id);
    if (!context) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({
      ...context.report,
      measurements: context.measurements,
      groups: context.groups,
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  } finally {
    client.release();
  }
});

// GET /api/reports/:id/csv - Batch CSV export aligned with PDF data
router.get('/:id/csv', async (req, res) => {
  const client = await pool.connect();
  try {
    const context = await fetchReportContext(client, req.params.id);
    if (!context) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const safePoNumber = safeText(context.report.po_number, `report-${context.report.id}`)
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=shift-report-${safePoNumber}-${context.report.shift_date}.csv`
    );
    res.send(buildCsv(context));
  } catch (err) {
    console.error('Error exporting report CSV:', err);
    res.status(500).json({ error: 'Failed to export report CSV' });
  } finally {
    client.release();
  }
});

// GET /api/reports/:id/pdf - Generate PDF for a shift report
router.get('/:id/pdf', async (req, res) => {
  const client = await pool.connect();
  try {
    const context = await fetchReportContext(client, req.params.id);
    if (!context) {
      return res.status(404).json({ error: 'Report not found' });
    }
    drawPdf(context, res);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    client.release();
  }
});

module.exports = router;
