#!/usr/bin/env node

/**
 * SPC System — Master Account Setup
 *
 * Run this script once during initial deployment to create the
 * master owner account and set the admin shared password.
 *
 * Usage:
 *   node src/scripts/setup-master.js
 *
 * The script will prompt for:
 *   - Master username
 *   - Master password
 *   - Admin shared password (used by quality team, supervisors, managers)
 */

const readline = require('readline');
const crypto = require('crypto');
const pool = require('../config/database');

// Simple bcrypt-like hashing using Node.js built-in crypto (no external dependency)
// Uses PBKDF2 with 100k iterations — secure enough for on-premise use
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

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

// Hide password input (read char by char)
function questionHidden(rl, prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);

    // If not a TTY (piped input), just read normally
    if (!stdin.isTTY) {
      rl.question('', (answer) => resolve(answer));
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (ch) => {
      // Ctrl+C
      if (ch === '\u0003') {
        stdout.write('\n');
        process.exit(1);
      }
      // Enter
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(password);
        return;
      }
      // Backspace
      if (ch === '\u007F' || ch === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      password += ch;
      stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const rl = createInterface();

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   SPC System — Master Account Setup      ║');
  console.log('║   Plant #1352, Covington                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  const client = await pool.connect();

  try {
    // Check if master account already exists
    const existing = await client.query('SELECT COUNT(*) as cnt FROM master_accounts');
    if (parseInt(existing.rows[0].cnt) > 0) {
      console.log('Master account(s) already exist:');
      const accounts = await client.query('SELECT username, created_at FROM master_accounts ORDER BY id');
      accounts.rows.forEach((a) => {
        console.log(`  - ${a.username} (created ${new Date(a.created_at).toLocaleDateString()})`);
      });
      console.log('');
      const proceed = await question(rl, 'Create an additional master account? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    // Get master username
    let username = '';
    while (!username.trim()) {
      username = await question(rl, 'Master Username: ');
      if (!username.trim()) {
        console.log('  Username cannot be empty.');
      }
    }
    username = username.trim().toLowerCase();

    // Check if username already exists
    const userExists = await client.query('SELECT id FROM master_accounts WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      console.log(`  Username "${username}" already exists. Please choose a different one.`);
      rl.close();
      return;
    }

    // Get master password
    let password = '';
    let confirm = '';
    while (true) {
      password = await questionHidden(rl, 'Master Password: ');
      if (password.length < 6) {
        console.log('  Password must be at least 6 characters.');
        continue;
      }
      confirm = await questionHidden(rl, 'Confirm Password: ');
      if (password !== confirm) {
        console.log('  Passwords do not match. Try again.');
        continue;
      }
      break;
    }

    // Get admin shared password (only if not set yet)
    const adminConfig = await client.query("SELECT value FROM master_config WHERE key = 'admin_password_hash'");
    let setAdminPassword = true;
    if (adminConfig.rows.length > 0) {
      console.log('');
      console.log('Admin shared password is already configured.');
      const changeAdmin = await question(rl, 'Change it? (y/N): ');
      setAdminPassword = changeAdmin.toLowerCase() === 'y';
    }

    let adminPassword = '';
    if (setAdminPassword) {
      console.log('');
      console.log('Set the ADMIN shared password (used by quality team, supervisors, managers):');
      while (true) {
        adminPassword = await questionHidden(rl, 'Admin Password: ');
        if (adminPassword.length < 4) {
          console.log('  Password must be at least 4 characters.');
          continue;
        }
        confirm = await questionHidden(rl, 'Confirm Admin Password: ');
        if (adminPassword !== confirm) {
          console.log('  Passwords do not match. Try again.');
          continue;
        }
        break;
      }
    }

    rl.close();

    // Save to database
    await client.query('BEGIN');

    // Create master account
    const masterHash = hashPassword(password);
    await client.query(
      'INSERT INTO master_accounts (username, password_hash) VALUES ($1, $2)',
      [username, masterHash]
    );

    // Set admin password
    if (setAdminPassword && adminPassword) {
      const adminHash = hashPassword(adminPassword);
      await client.query(
        `INSERT INTO master_config (key, value, updated_by)
         VALUES ('admin_password_hash', $1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW(), updated_by = $2`,
        [adminHash, username]
      );
    }

    // Log to audit
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values)
       VALUES ('master_accounts', 0, 'INSERT', $1, $2)`,
      ['setup-cli', JSON.stringify({ username })]
    );

    await client.query('COMMIT');

    console.log('');
    console.log('Setup complete!');
    console.log(`  Master account: ${username}`);
    if (setAdminPassword) {
      console.log('  Admin shared password: set');
    }
    console.log('');
    console.log('Login at: http://<server>/admin');
    console.log('  - "Admin Login" for quality team / supervisors (shared password)');
    console.log('  - "Master Login" for system configuration (your username + password)');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

// Export for use by other modules
module.exports = { hashPassword, verifyPassword };
