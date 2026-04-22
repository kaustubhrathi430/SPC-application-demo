const test = require('node:test');
const assert = require('node:assert/strict');

const {
  safeText,
  safeNumber,
  escapeCsv,
  getMeasurementStatusLabel,
  groupMeasurements,
} = require('../src/utils/reportArtifacts');

test('safeText returns fallback for empty values', () => {
  assert.equal(safeText(null), '-');
  assert.equal(safeText(undefined), '-');
  assert.equal(safeText(''), '-');
  assert.equal(safeText('OK'), 'OK');
});

test('safeNumber formats integers and decimals', () => {
  assert.equal(safeNumber(null), '-');
  assert.equal(safeNumber(''), '-');
  assert.equal(safeNumber('abc'), '-');
  assert.equal(safeNumber(12), '12');
  assert.equal(safeNumber(12.3456), '12.346');
});

test('escapeCsv quotes dangerous characters', () => {
  assert.equal(escapeCsv('simple'), 'simple');
  assert.equal(escapeCsv('a,b'), '"a,b"');
  assert.equal(escapeCsv('a"b'), '"a""b"');
});

test('getMeasurementStatusLabel reflects ack state', () => {
  assert.equal(getMeasurementStatusLabel({ status_overall: 'ooc', alert_acknowledged_at: null }), 'OOC');
  assert.equal(getMeasurementStatusLabel({ status_overall: 'ooc', alert_acknowledged_at: '2026-04-21T00:00:00Z' }), 'OOC ACK');
  assert.equal(getMeasurementStatusLabel({ status_overall: 'warning', alert_acknowledged_at: null }), 'WARNING');
  assert.equal(getMeasurementStatusLabel({ status_overall: 'in_control' }), 'OK');
});

test('groupMeasurements sorts freezer and pump grouping', () => {
  const groups = groupMeasurements([
    { freezer_number: 2, pump_number: 2, id: 3 },
    { freezer_number: 1, pump_number: 1, id: 1 },
    { freezer_number: 2, pump_number: 1, id: 2 },
  ]);

  assert.deepEqual(groups.map((group) => [group.freezer, group.pump]), [[1, 1], [2, 1], [2, 2]]);
  assert.equal(groups[0].measurements.length, 1);
});
