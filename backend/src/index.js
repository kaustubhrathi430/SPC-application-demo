const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');

const pool = require('./config/database');
const migrate = require('./config/migrate');
const migrateV2 = require('./config/migrate_v2');
const migrateV3 = require('./config/migrate_v3');
const migrateV4 = require('./config/migrate_v4');
const { seed } = require('./seeds/seedData');
const { buildSystemHealthSnapshot } = require('./utils/systemHealth');

const linesRouter = require('./routes/lines');
const skusRouter = require('./routes/skus');
const measurementsRouter = require('./routes/measurements');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const masterConfigRouter = require('./routes/masterConfig');
const productionOrdersRouter = require('./routes/productionOrders');

const app = express();
const PORT = process.env.PORT || 3001;
const IMAGE_ROOT = process.env.SPC_IMAGE_ROOT || '/data/spc-images';
const BACKUP_ROOT = process.env.SPC_BACKUP_ROOT || '/backups';
const LOG_DIR = process.env.REQUEST_LOG_DIR || '/data/logs';

let server = null;
let shuttingDown = false;

function ensureOperationalDirectories() {
  [IMAGE_ROOT, BACKUP_ROOT, LOG_DIR].forEach((targetPath) => {
    fs.mkdirSync(targetPath, { recursive: true });
  });
}

function resolveAllowedOrigins(req) {
  const allowed = new Set();
  const requestHost = req.get('host');
  if (requestHost) {
    allowed.add(`http://${requestHost}`);
    allowed.add(`https://${requestHost}`);
  }

  if (process.env.APP_ORIGIN) {
    allowed.add(process.env.APP_ORIGIN);
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed;
}

ensureOperationalDirectories();

const accessLogStream = fs.createWriteStream(path.join(LOG_DIR, 'access.log'), { flags: 'a' });

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

const corsOptionsDelegate = (req, callback) => {
  const origin = req.get('origin');
  if (!origin) {
    callback(null, { origin: false });
    return;
  }

  const allowed = resolveAllowedOrigins(req);
  if (allowed.has(origin)) {
    callback(null, { origin: true, credentials: true });
    return;
  }

  callback(new Error('Cross-origin requests are not allowed'));
};

app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

app.use(morgan('combined', { stream: accessLogStream }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/lines', linesRouter);
app.use('/api/skus', skusRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/master-config', masterConfigRouter);
app.use('/api/production-orders', productionOrdersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/detailed', async (req, res) => {
  try {
    const snapshot = await buildSystemHealthSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Failed to build detailed health response:', err);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to build health snapshot',
    });
  }
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Cross-origin requests are not allowed') {
    return res.status(403).json({ error: err.message });
  }
  return next(err);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown.`);

  const exitTimer = setTimeout(async () => {
    console.error('Graceful shutdown timed out. Forcing process exit.');
    try {
      await pool.closePool();
    } finally {
      process.exit(1);
    }
  }, 10000);
  exitTimer.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    await pool.closePool();
    clearTimeout(exitTimer);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(exitTimer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function start() {
  try {
    console.log('Waiting for database...');
    await pool.waitForDatabase();

    console.log('Running database migrations...');
    await migrate();

    console.log('Running v2 migrations...');
    await migrateV2();

    console.log('Running v3 migrations...');
    await migrateV3();

    console.log('Running v4 migrations...');
    await migrateV4();

    console.log('Seeding data...');
    await seed();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`SPC Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    try {
      await pool.closePool();
    } finally {
      process.exit(1);
    }
  }
}

start();
