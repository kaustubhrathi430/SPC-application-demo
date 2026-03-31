const { PassThrough } = require('stream');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

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

function parseReportData(report) {
  return safeJsonParse(report.report_data, { groups: [] }) || { groups: [] };
}

function summarizeReportGroups(report) {
  const reportData = parseReportData(report);
  const groups = Array.isArray(reportData.groups) ? reportData.groups : [];

  return groups.map((group) => {
    const measurements = Array.isArray(group.measurements) ? group.measurements : [];
    const warnings = measurements.filter((measurement) => (
      measurement.status === 'warning' || measurement.status_overall === 'warning'
    )).length;
    const outOfControl = measurements.filter((measurement) => (
      measurement.status === 'ooc' || measurement.status_overall === 'ooc'
    )).length;
    return {
      freezer: Number(group.freezer || 1),
      pump: Number(group.pump || 1),
      measurements: measurements.length,
      warnings,
      outOfControl,
    };
  });
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

async function fetchDailyDigestContext(client, digestDate) {
  const reportResult = await client.query(
    `SELECT r.*, s.product_name, s.product_code, s.cr_code,
            l.display_name AS line_name,
            po.reviewed_at, po.reviewed_by
     FROM shift_reports r
     JOIN skus s ON r.sku_id = s.id
     JOIN lines l ON r.line_id = l.id
     LEFT JOIN production_orders po ON po.id = r.production_order_id
     WHERE r.shift_date = $1
     ORDER BY l.display_name, r.shift, r.created_at`,
    [digestDate]
  );

  const reports = reportResult.rows.map((report) => ({
    ...report,
    report_data: parseReportData(report),
    group_summary: summarizeReportGroups(report),
  }));

  const totals = reports.reduce((acc, report) => {
    acc.reports += 1;
    acc.measurements += Number(report.total_measurements || 0);
    acc.warnings += Number(report.thickness_warnings || 0)
      + Number(report.weight_warnings || 0)
      + Number(report.coating_warnings || 0);
    acc.out_of_control += Number(report.thickness_out_of_control || 0)
      + Number(report.weight_out_of_control || 0)
      + Number(report.coating_out_of_control || 0);
    return acc;
  }, {
    reports: 0,
    measurements: 0,
    warnings: 0,
    out_of_control: 0,
  });

  return {
    digestDate,
    reports,
    totals,
  };
}

function drawZoneBar(doc, x, y, width, height) {
  const segmentWidth = width / 5;
  const colors = ['#C0392B', '#F39C12', '#27AE60', '#F39C12', '#C0392B'];
  colors.forEach((color, index) => {
    doc.rect(x + (segmentWidth * index), y, segmentWidth, height).fillAndStroke(color, '#666666');
  });
  doc.fillColor('black');
}

function drawShiftReportHeader(doc, report) {
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
  drawShiftReportHeader(doc, report);
}

function drawShiftGroupHeader(doc, report, group) {
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

function renderShiftReportPdf(context, outputStream) {
  const { report, groups } = context;
  const doc = new PDFDocument({ size: 'A4', margin: 36 });

  doc.pipe(outputStream);
  drawShiftReportHeader(doc, report);
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
    drawShiftGroupHeader(doc, report, group);
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
  return doc;
}

function renderShiftReportPdfBuffer(context) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    renderShiftReportPdf(context, stream);
  });
}

function drawDigestSummaryPage(doc, digest) {
  doc.font('Helvetica-Bold').fontSize(16).text('SPC DAILY DIGEST', { align: 'center' });
  doc.font('Helvetica').fontSize(9).text('Plant #1352, Covington', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(9).text(`Digest Date: ${safeText(digest.digestDate)}`);
  doc.text(`Shift Reports: ${digest.totals.reports}`);
  doc.text(`Total Measurements: ${digest.totals.measurements}`);
  doc.text(`Warnings: ${digest.totals.warnings} | Out of Control: ${digest.totals.out_of_control}`);
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  const headers = ['PO#', 'Line', 'Shift', 'Product', 'Measurements', 'Warnings', 'OOC'];
  const widths = [80, 110, 55, 150, 60, 50, 50];
  let x = 40;
  doc.font('Helvetica-Bold').fontSize(8);
  headers.forEach((header, index) => {
    doc.text(header, x, doc.y, { width: widths[index] });
    x += widths[index];
  });
  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.2);

  doc.font('Helvetica').fontSize(8);
  for (const report of digest.reports) {
    x = 40;
    const values = [
      safeText(report.po_number),
      safeText(report.line_name),
      safeText(report.shift),
      safeText(`${report.product_name} (${report.product_code})`),
      safeText(report.total_measurements),
      safeText(Number(report.thickness_warnings || 0) + Number(report.weight_warnings || 0) + Number(report.coating_warnings || 0)),
      safeText(Number(report.thickness_out_of_control || 0) + Number(report.weight_out_of_control || 0) + Number(report.coating_out_of_control || 0)),
    ];
    values.forEach((value, index) => {
      doc.text(value, x, doc.y, { width: widths[index] });
      x += widths[index];
    });
    doc.moveDown(0.3);
  }
}

function drawDigestReportSection(doc, report) {
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(14)
    .text(`Shift Report Summary - ${safeText(report.line_name)} / Shift ${safeText(report.shift)}`);
  doc.font('Helvetica').fontSize(9);
  doc.text(`PO#: ${safeText(report.po_number)} | Product: ${safeText(report.product_name)} (${safeText(report.product_code)})`);
  doc.text(`Best Buy Code: ${safeText(report.best_buy_code)} | Operator: ${safeText(report.operator_name)} | Supervisor: ${safeText(report.supervisor_name)}`);
  doc.text(`Measurements: ${safeText(report.total_measurements)} | Reviewed: ${report.reviewed_at ? 'Yes' : 'No'}`);
  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.4);

  const headers = ['Freezer', 'Pump', 'Readings', 'Warnings', 'OOC'];
  const widths = [80, 70, 90, 90, 90];
  let x = 40;
  doc.font('Helvetica-Bold').fontSize(8);
  headers.forEach((header, index) => {
    doc.text(header, x, doc.y, { width: widths[index] });
    x += widths[index];
  });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(450, doc.y).stroke();
  doc.moveDown(0.2);

  doc.font('Helvetica').fontSize(8);
  for (const group of report.group_summary || []) {
    x = 40;
    const values = [
      `Freezer #${group.freezer}`,
      `Pump ${group.pump}`,
      safeText(group.measurements),
      safeText(group.warnings),
      safeText(group.outOfControl),
    ];
    values.forEach((value, index) => {
      doc.text(value, x, doc.y, { width: widths[index] });
      x += widths[index];
    });
    doc.moveDown(0.25);
  }
}

function renderDailyDigestPdf(digest, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  doc.pipe(outputStream);
  drawDigestSummaryPage(doc, digest);
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(8).text(
    "This digest summarizes the day's shift reports. Refer to the individual shift report PDFs for the full SPC control chart detail."
  );

  for (const report of digest.reports) {
    drawDigestReportSection(doc, report);
  }

  doc.end();
  return doc;
}

function renderDailyDigestPdfBuffer(digest) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    renderDailyDigestPdf(digest, stream);
  });
}

function buildReportCsv(context) {
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

module.exports = {
  calcStats,
  countAlerts,
  safeText,
  safeNumber,
  formatTime,
  escapeCsv,
  getMeasurementStatusLabel,
  groupMeasurements,
  fetchReportContext,
  fetchDailyDigestContext,
  buildReportCsv,
  renderShiftReportPdf,
  renderShiftReportPdfBuffer,
  renderDailyDigestPdf,
  renderDailyDigestPdfBuffer,
  parseReportData,
  summarizeReportGroups,
};
