const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseBool,
  parseInteger,
  escapeEnvValue,
  upsertEnvValue,
} = require('../src/scripts/setup-smtp');

test('parseBool understands common truthy and falsy values', () => {
  assert.equal(parseBool('y', false), true);
  assert.equal(parseBool('yes', false), true);
  assert.equal(parseBool('true', false), true);
  assert.equal(parseBool('n', true), false);
  assert.equal(parseBool('no', true), false);
  assert.equal(parseBool('0', true), false);
  assert.equal(parseBool('', true), true);
});

test('parseInteger falls back when input is invalid', () => {
  assert.equal(parseInteger('587', 25), 587);
  assert.equal(parseInteger('abc', 25), 25);
  assert.equal(parseInteger('', 25), 25);
});

test('escapeEnvValue preserves special characters safely', () => {
  assert.equal(escapeEnvValue('simple'), '"simple"');
  assert.equal(escapeEnvValue('a b'), '"a b"');
  assert.equal(escapeEnvValue('a"b\\c'), '"a\\"b\\\\c"');
});

test('upsertEnvValue updates or appends keys', () => {
  const updated = upsertEnvValue(['SMTP_HOST="old"', 'OTHER=value'], 'SMTP_HOST', 'new-host');
  assert.equal(updated[0], 'SMTP_HOST="new-host"');
  assert.ok(updated.includes('OTHER=value'));

  const appended = upsertEnvValue(['OTHER=value'], 'SMTP_PORT', '587');
  assert.ok(appended.includes('SMTP_PORT="587"'));
});
