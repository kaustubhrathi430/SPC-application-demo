const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const pool = require('../config/database');
const {
  fetchReportContext,
  fetchDailyDigestContext,
  renderShiftReportPdfBuffer,
  renderDailyDigestPdfBuffer,
  safeText,
} = require('../utils/reportArtifacts');

const EMAIL_ATTACHMENT_ROOT = process.env.EMAIL_ATTACHMENT_ROOT || '/data/email-attachments';
const EMAIL_TIME_ZONE = process.env.EMAIL_TIME_ZONE || 'local';
const DIGEST_TIME = process.env.EMAIL_DAILY_DIGEST_TIME || '23:55';
const DEFAULT_MAX_ATTEMPTS = parseInt(process.env.EMAIL_MAX_ATTEMPTS || '5', 10);
const DEFAULT_POLL_INTERVAL_MS = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '15000', 10);
const DIGEST_LOOKBACK_DAYS = parseInt(process.env.EMAIL_DIGEST_LOOKBACK_DAYS || '7', 10);

let cachedTransporter = null;

function ensureDirectories() {
  fs.mkdirSync(EMAIL_ATTACHMENT_ROOT, { recursive: true });
}

function normalizeTimeZone() {
  if (EMAIL_TIME_ZONE === 'local') return undefined;
  return EMAIL_TIME_ZONE;
}

function formatLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseDigestTime() {
  const [hourRaw, minuteRaw] = DIGEST_TIME.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour: Number.isNaN(hour) ? 23 : hour,
    minute: Number.isNaN(minute) ? 55 : minute,
  };
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function isDigestDueForDate(dateString, now = new Date()) {
  const [year, month, day] = dateString.split('-').map(Number);
  const { hour, minute } = parseDigestTime();
  const dueMoment = new Date(year, month - 1, day, hour, minute, 0, 0);
  return now >= dueMoment;
}

function normalizeFilename(value) {
  return String(value || 'attachment')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'attachment';
}

function getSmtpSummary() {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER || '';
  const from = process.env.SMTP_FROM || '';

  return {
    configured: Boolean(host && from),
    ready: Boolean(host && from),
    host: host || null,
    port,
    secure,
    has_auth: Boolean(user),
    from: from || null,
    daily_digest_time: DIGEST_TIME,
    poll_interval_ms: DEFAULT_POLL_INTERVAL_MS,
  };
}

function createTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const summary = getSmtpSummary();
  if (!summary.configured) {
    return null;
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  };

  if (process.env.SMTP_USER) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || '',
    };
  }

  if (process.env.SMTP_REJECT_UNAUTHORIZED !== undefined) {
    config.tls = {
      rejectUnauthorized: String(process.env.SMTP_REJECT_UNAUTHORIZED).toLowerCase() !== 'false',
    };
  }

  cachedTransporter = nodemailer.createTransport(config);
  return cachedTransporter;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('SMTP verification timed out')), timeoutMs);
      timer.unref?.();
    }),
  ]);
}

async function verifyTransporter() {
  const transporter = createTransporter();
  if (!transporter) {
    return { ready: false, configured: false };
  }
  await transporter.verify();
  return { ready: true, configured: true };
}

async function getRecipientsForList(client, listKey) {
  const result = await client.query(
    `SELECT r.id, r.list_key, r.email, r.display_name, r.active
     FROM email_recipients r
     JOIN email_lists l ON l.list_key = r.list_key
     WHERE r.list_key = $1 AND r.active = true AND l.enabled = true
     ORDER BY COALESCE(r.display_name, r.email), r.id`,
    [listKey]
  );
  return result.rows;
}

async function getEmailListsWithRecipients(client = pool) {
  const listResult = await client.query(
    `SELECT l.list_key, l.display_name, l.description, l.enabled,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', r.id,
                  'email', r.email,
                  'display_name', r.display_name,
                  'active', r.active,
                  'created_at', r.created_at,
                  'updated_at', r.updated_at
                )
                ORDER BY COALESCE(r.display_name, r.email), r.id
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'::json
            ) AS recipients
     FROM email_lists l
     LEFT JOIN email_recipients r ON r.list_key = l.list_key
     GROUP BY l.list_key, l.display_name, l.description, l.enabled
     ORDER BY l.list_key`
  );

  return listResult.rows.map((row) => ({
    ...row,
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
  }));
}

async function getEmailQueueSummary(client = pool) {
  const countsResult = await client.query(
    `SELECT status, COUNT(*) AS total
     FROM email_queue
     GROUP BY status`
  );
  const recentResult = await client.query(
    `SELECT *
     FROM email_queue
     ORDER BY created_at DESC
     LIMIT 25`
  );
  const counts = countsResult.rows.reduce((acc, row) => {
    acc[row.status] = parseInt(row.total, 10);
    return acc;
  }, {
    queued: 0,
    sending: 0,
    sent: 0,
    retryable: 0,
    dead: 0,
  });
  counts.backlog = counts.queued + counts.retryable + counts.sending;
  return {
    counts,
    recent: recentResult.rows,
  };
}

async function getEmailOverview() {
  const client = pool;
  const smtpSummary = getSmtpSummary();
  const [lists, queue, smtp] = await Promise.all([
    getEmailListsWithRecipients(client),
    getEmailQueueSummary(client),
    smtpSummary.configured
      ? withTimeout(verifyTransporter(), 3000).catch((err) => ({
        ready: false,
        configured: true,
        error: err.message,
      }))
      : Promise.resolve({ ready: false, configured: false }),
  ]);

  return {
    smtp: {
      ...smtpSummary,
      verification: smtp,
    },
    lists,
    queue,
  };
}

async function getEmailQueuePage({ page = 1, per_page = 25 } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);
  const countResult = await pool.query('SELECT COUNT(*) AS total FROM email_queue');
  const result = await pool.query(
    `SELECT *
     FROM email_queue
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(per_page, 10), offset]
  );
  const total = parseInt(countResult.rows[0].total, 10);
  return {
    data: result.rows,
    pagination: {
      page: parseInt(page, 10),
      per_page: parseInt(per_page, 10),
      total,
      total_pages: Math.ceil(total / parseInt(per_page, 10)),
    },
  };
}

async function createRecipient(listKey, payload) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO email_recipients (list_key, email, display_name, active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        listKey,
        payload.email.trim().toLowerCase(),
        payload.display_name ? payload.display_name.trim() : null,
        payload.active !== false,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateRecipient(id, payload) {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT * FROM email_recipients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return null;
    }
    const result = await client.query(
      `UPDATE email_recipients
       SET email = $1,
           display_name = $2,
           active = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        payload.email.trim().toLowerCase(),
        payload.display_name ? payload.display_name.trim() : null,
        payload.active !== false,
        id,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deactivateRecipient(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE email_recipients
       SET active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function updateEmailList(listKey, payload) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE email_lists
       SET display_name = COALESCE($1, display_name),
           description = COALESCE($2, description),
           enabled = COALESCE($3, enabled),
           updated_at = NOW()
       WHERE list_key = $4
       RETURNING *`,
      [
        payload.display_name ? payload.display_name.trim() : null,
        payload.description ? payload.description.trim() : null,
        payload.enabled === undefined ? null : payload.enabled !== false,
        listKey,
      ]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

function buildAttachmentPath(folder, fileName, buffer) {
  const relativeFolder = path.join(folder);
  const absoluteFolder = path.join(EMAIL_ATTACHMENT_ROOT, relativeFolder);
  fs.mkdirSync(absoluteFolder, { recursive: true });
  const absolutePath = path.join(absoluteFolder, fileName);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  fs.writeFileSync(absolutePath, buffer);
  return {
    attachment_path: absolutePath,
    attachment_name: fileName,
    attachment_mime: 'application/pdf',
    attachment_size_bytes: buffer.length,
    attachment_sha256: sha256,
  };
}

async function getQueueJobByDedupeKey(dedupeKey) {
  const result = await pool.query(
    'SELECT * FROM email_queue WHERE dedupe_key = $1',
    [dedupeKey]
  );
  return result.rows[0] || null;
}

async function insertQueueJob(job) {
  const result = await pool.query(
    `INSERT INTO email_queue (
       queue_type, dedupe_key, mailing_list_key, subject, body_text, body_html,
       recipient_snapshot, payload, attachment_name, attachment_path, attachment_mime,
       attachment_sha256, attachment_size_bytes, status, attempt_count, max_attempts,
       next_attempt_at, created_at, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,
       $7::jsonb,$8::jsonb,$9,$10,$11,
       $12,$13,$14,$15,$16,
       NOW(), NOW(), NOW()
     )
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING *`,
    [
      job.queue_type,
      job.dedupe_key,
      job.mailing_list_key,
      job.subject,
      job.body_text || null,
      job.body_html || null,
      JSON.stringify(job.recipient_snapshot || []),
      JSON.stringify(job.payload || {}),
      job.attachment_name,
      job.attachment_path,
      job.attachment_mime || 'application/pdf',
      job.attachment_sha256 || null,
      job.attachment_size_bytes || null,
      'queued',
      0,
      job.max_attempts || DEFAULT_MAX_ATTEMPTS,
    ]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  return getQueueJobByDedupeKey(job.dedupe_key);
}

async function queueShiftReportEmail(reportId) {
  const dedupeKey = `shift-report:${reportId}`;
  const existing = await getQueueJobByDedupeKey(dedupeKey);
  if (existing) return existing;

  const client = await pool.connect();
  try {
    const context = await fetchReportContext(client, reportId);
    if (!context) {
      return null;
    }

    const recipients = await getRecipientsForList(client, 'shift_report');
    if (recipients.length === 0) {
      return { skipped: true, reason: 'No active shift report recipients configured' };
    }

    const buffer = await renderShiftReportPdfBuffer(context);
    const fileName = normalizeFilename(`shift-report-${context.report.po_number || reportId}-${context.report.shift_date}.pdf`);
    const attachment = buildAttachmentPath(path.join('shift-reports', String(reportId)), fileName, buffer);
    const subject = `SPC Shift Report - PO ${safeText(context.report.po_number, context.report.id)} - ${safeText(context.report.shift_date)} - Shift ${safeText(context.report.shift)}`;

    return insertQueueJob({
      queue_type: 'shift_report',
      dedupe_key: dedupeKey,
      mailing_list_key: 'shift_report',
      subject,
      body_text: [
        `Shift report for ${safeText(context.report.line_name)}`,
        `PO#: ${safeText(context.report.po_number)}`,
        `Product: ${safeText(context.report.product_name)} (${safeText(context.report.product_code)})`,
        `Shift: ${safeText(context.report.shift)} on ${safeText(context.report.shift_date)}`,
      ].join('\n'),
      body_html: null,
      recipient_snapshot: recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        display_name: recipient.display_name,
      })),
      payload: {
        report_id: context.report.id,
        production_order_id: context.report.production_order_id || null,
        shift_date: context.report.shift_date,
        line_name: context.report.line_name,
        po_number: context.report.po_number,
      },
      ...attachment,
    });
  } finally {
    client.release();
  }
}

async function queueDailyDigestEmail(digestDate) {
  const dedupeKey = `daily-digest:${digestDate}`;
  const existing = await getQueueJobByDedupeKey(dedupeKey);
  if (existing) return existing;

  const client = await pool.connect();
  try {
    const digest = await fetchDailyDigestContext(client, digestDate);
    if (!digest.reports.length) {
      return { skipped: true, reason: 'No shift reports found for digest date' };
    }

    const recipients = await getRecipientsForList(client, 'daily_digest');
    if (recipients.length === 0) {
      return { skipped: true, reason: 'No active daily digest recipients configured' };
    }

    const buffer = await renderDailyDigestPdfBuffer(digest);
    const fileName = normalizeFilename(`daily-digest-${digestDate}.pdf`);
    const attachment = buildAttachmentPath(path.join('daily-digests', digestDate), fileName, buffer);
    const subject = `SPC Daily Digest - ${digestDate}`;

    return insertQueueJob({
      queue_type: 'daily_digest',
      dedupe_key: dedupeKey,
      mailing_list_key: 'daily_digest',
      subject,
      body_text: `Daily digest for ${digestDate}`,
      body_html: null,
      recipient_snapshot: recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        display_name: recipient.display_name,
      })),
      payload: {
        digest_date: digestDate,
        report_count: digest.totals.reports,
        measurement_count: digest.totals.measurements,
      },
      ...attachment,
    });
  } finally {
    client.release();
  }
}

async function claimQueueJobs(workerId, limit = 5) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `WITH next_jobs AS (
         SELECT id
         FROM email_queue
         WHERE status IN ('queued', 'retryable')
           AND next_attempt_at <= NOW()
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE email_queue eq
       SET status = 'sending',
           locked_at = NOW(),
           locked_by = $2,
           attempt_count = attempt_count + 1,
           last_error = NULL,
           updated_at = NOW()
       FROM next_jobs
       WHERE eq.id = next_jobs.id
       RETURNING eq.*`,
      [limit, workerId]
    );
    await client.query('COMMIT');
    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function reclaimStaleSendingJobs(workerId, staleMinutes = 20) {
  await pool.query(
    `UPDATE email_queue
     SET status = 'retryable',
         next_attempt_at = NOW(),
         locked_at = NULL,
         locked_by = NULL,
         updated_at = NOW(),
         last_error = COALESCE(last_error, 'Reclaimed after worker restart')
     WHERE status = 'sending'
       AND locked_at < NOW() - ($1 || ' minutes')::interval`,
    [staleMinutes]
  );
}

function buildMailAddresses(snapshot) {
  return (snapshot || [])
    .map((recipient) => {
      if (recipient.display_name) {
        return `"${recipient.display_name}" <${recipient.email}>`;
      }
      return recipient.email;
    })
    .join(', ');
}

function getBackoffDelayMs(attemptCount) {
  return Math.min(Math.pow(2, Math.max(attemptCount - 1, 0)) * 60 * 1000, 60 * 60 * 1000);
}

async function updateJobSuccess(job, response) {
  await pool.query(
    `UPDATE email_queue
     SET status = 'sent',
         sent_at = NOW(),
         updated_at = NOW(),
         last_error = NULL,
         response_data = $2::jsonb
     WHERE id = $1`,
    [job.id, JSON.stringify({
      message_id: response.messageId || null,
      accepted: response.accepted || [],
      rejected: response.rejected || [],
    })]
  );
}

async function updateJobFailure(job, error) {
  const nextAttemptAt = new Date(Date.now() + getBackoffDelayMs(job.attempt_count));
  const terminal = job.attempt_count >= job.max_attempts;
  await pool.query(
    `UPDATE email_queue
     SET status = $2,
         failed_at = CASE WHEN $2 = 'dead' THEN NOW() ELSE failed_at END,
         next_attempt_at = $3,
         updated_at = NOW(),
         locked_at = NULL,
         locked_by = NULL,
         last_error = $4
     WHERE id = $1`,
    [
      job.id,
      terminal ? 'dead' : 'retryable',
      terminal ? null : nextAttemptAt,
      error.message || String(error),
    ]
  );
}

async function sendQueuedEmail(job) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('SMTP is not configured');
  }

  const to = buildMailAddresses(job.recipient_snapshot);
  if (!to) {
    throw new Error('No recipients available for this job');
  }

  const response = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: job.subject,
    text: job.body_text || '',
    html: job.body_html || undefined,
    attachments: job.attachment_path ? [{
      filename: job.attachment_name,
      path: job.attachment_path,
      contentType: job.attachment_mime || 'application/pdf',
    }] : [],
  });

  return response;
}

async function processEmailQueueOnce(workerId, limit = 5) {
  await reclaimStaleSendingJobs(workerId);
  const jobs = await claimQueueJobs(workerId, limit);
  const processed = [];
  for (const job of jobs) {
    try {
      const response = await sendQueuedEmail(job);
      await updateJobSuccess(job, response);
      processed.push({ id: job.id, status: 'sent' });
    } catch (error) {
      await updateJobFailure(job, error);
      processed.push({ id: job.id, status: 'failed', error: error.message || String(error) });
    }
  }
  return processed;
}

async function queueDueDailyDigests() {
  const now = new Date();
  const today = formatLocalDate(now);
  const dueDates = [];
  if (isDigestDueForDate(today, now)) {
    dueDates.push(today);
  }
  for (let offset = 1; offset <= DIGEST_LOOKBACK_DAYS; offset += 1) {
    dueDates.push(formatLocalDate(addDays(now, -offset)));
  }

  for (const digestDate of dueDates) {
    const existing = await getQueueJobByDedupeKey(`daily-digest:${digestDate}`);
    if (!existing) {
      await queueDailyDigestEmail(digestDate);
    }
  }
}

async function sendTestEmail({ recipient_email, subject, message }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('SMTP is not configured');
  }
  if (!recipient_email) {
    throw new Error('recipient_email is required');
  }

  const response = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient_email,
    subject: subject || 'SPC SMTP Test',
    text: message || 'SMTP test from SPC Control Chart system.',
  });

  return response;
}

module.exports = {
  EMAIL_ATTACHMENT_ROOT,
  DEFAULT_POLL_INTERVAL_MS,
  formatLocalDate,
  getSmtpSummary,
  getEmailOverview,
  getEmailQueuePage,
  getEmailListsWithRecipients,
  getEmailQueueSummary,
  createRecipient,
  updateRecipient,
  deactivateRecipient,
  updateEmailList,
  queueShiftReportEmail,
  queueDailyDigestEmail,
  queueDueDailyDigests,
  processEmailQueueOnce,
  sendTestEmail,
  ensureDirectories,
  verifyTransporter,
};
