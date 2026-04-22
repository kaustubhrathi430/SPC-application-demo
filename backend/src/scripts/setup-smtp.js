#!/usr/bin/env node

/**
 * SPC System — SMTP Setup
 *
 * Run this script during initial deployment to collect SMTP details and
 * write them into the repo root `.env` file. Docker Compose picks these
 * values up automatically on the next `docker compose up`.
 *
 * Usage:
 *   node src/scripts/setup-smtp.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const ENV_PATH = path.join(REPO_ROOT, '.env');

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer));
  });
}

function questionHidden(rl, prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);

    if (!stdin.isTTY) {
      rl.question('', (answer) => resolve(answer));
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    const onData = (ch) => {
      if (ch === '\u0003') {
        stdout.write('\n');
        process.exit(1);
      }
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(value);
        return;
      }
      if (ch === '\u007F' || ch === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      value += ch;
      stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

function parseBool(answer, fallback) {
  const normalized = String(answer || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['y', 'yes', 'true', '1'].includes(normalized)) return true;
  if (['n', 'no', 'false', '0'].includes(normalized)) return false;
  return fallback;
}

function parseInteger(answer, fallback) {
  const value = parseInt(String(answer || '').trim(), 10);
  return Number.isFinite(value) ? value : fallback;
}

function escapeEnvValue(value) {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '$$');
  return `"${escaped}"`;
}

function upsertEnvValue(lines, key, value) {
  const rendered = `${key}=${escapeEnvValue(value)}`;
  const keyPattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  let updated = false;
  const next = lines.map((line) => {
    if (keyPattern.test(line)) {
      updated = true;
      return rendered;
    }
    return line;
  });
  if (!updated) {
    next.push(rendered);
  }
  return next;
}

function readExistingEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    return [];
  }
  return fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
}

function writeEnv(lines) {
  const normalized = lines
    .filter((line, index, array) => !(line === '' && index === array.length - 1))
    .join('\n');
  fs.writeFileSync(ENV_PATH, `${normalized}\n`, { mode: 0o600 });
}

async function main() {
  const rl = createInterface();
  const envLines = readExistingEnv();

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      SPC System — SMTP Setup             ║');
  console.log('║      Plant #1352, Covington              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`This will write SMTP settings into: ${ENV_PATH}`);
  console.log('');

  const host = (await question(rl, 'SMTP Host: ')).trim();
  const port = parseInteger(await question(rl, 'SMTP Port [587]: '), 587);
  const user = (await question(rl, 'SMTP Username: ')).trim();
  const pass = await questionHidden(rl, 'SMTP Password: ');
  const from = (await question(rl, 'SMTP From Address: ')).trim();
  const secure = parseBool(await question(rl, 'Use secure SMTP/TLS? (y/N): '), false);
  const rejectUnauthorized = parseBool(
    await question(rl, 'Reject unauthorized TLS certificates? (Y/n): '),
    true
  );
  const timeZone = (await question(rl, 'Email Time Zone [America/Chicago]: ')).trim() || 'America/Chicago';
  const digestTime = (await question(rl, 'Daily Digest Time [23:55]: ')).trim() || '23:55';
  const pollIntervalMs = parseInteger(await question(rl, 'Email Poll Interval ms [15000]: '), 15000);
  const maxAttempts = parseInteger(await question(rl, 'Max Delivery Attempts [5]: '), 5);
  const digestLookbackDays = parseInteger(await question(rl, 'Digest Lookback Days [7]: '), 7);

  rl.close();

  if (!host || !user || !pass || !from) {
    console.error('SMTP host, username, password, and from address are required.');
    process.exit(1);
  }

  let nextLines = envLines.slice();
  nextLines = upsertEnvValue(nextLines, 'SMTP_HOST', host);
  nextLines = upsertEnvValue(nextLines, 'SMTP_PORT', String(port));
  nextLines = upsertEnvValue(nextLines, 'SMTP_USER', user);
  nextLines = upsertEnvValue(nextLines, 'SMTP_PASS', pass);
  nextLines = upsertEnvValue(nextLines, 'SMTP_FROM', from);
  nextLines = upsertEnvValue(nextLines, 'SMTP_SECURE', secure ? 'true' : 'false');
  nextLines = upsertEnvValue(nextLines, 'SMTP_REJECT_UNAUTHORIZED', rejectUnauthorized ? 'true' : 'false');
  nextLines = upsertEnvValue(nextLines, 'EMAIL_TIME_ZONE', timeZone);
  nextLines = upsertEnvValue(nextLines, 'EMAIL_DAILY_DIGEST_TIME', digestTime);
  nextLines = upsertEnvValue(nextLines, 'EMAIL_POLL_INTERVAL_MS', String(pollIntervalMs));
  nextLines = upsertEnvValue(nextLines, 'EMAIL_MAX_ATTEMPTS', String(maxAttempts));
  nextLines = upsertEnvValue(nextLines, 'EMAIL_DIGEST_LOOKBACK_DAYS', String(digestLookbackDays));

  writeEnv(nextLines);

  console.log('');
  console.log('SMTP settings saved.');
  console.log(`  File: ${ENV_PATH}`);
  console.log('Next steps:');
  console.log('  1. Run `docker compose up -d --build` from the repo root.');
  console.log('  2. Open `/admin` and configure recipient lists in System Config.');
  console.log('  3. Use SMTP Test Send before enabling production use.');
  console.log('');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('SMTP setup failed:', err);
    process.exit(1);
  });
}
