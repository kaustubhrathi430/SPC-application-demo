const express = require('express');
const cors = require('cors');
const path = require('path');
const migrate = require('./config/migrate');
const migrateV2 = require('./config/migrate_v2');
const migrateV3 = require('./config/migrate_v3');
const { seed } = require('./seeds/seedData');

const linesRouter = require('./routes/lines');
const skusRouter = require('./routes/skus');
const measurementsRouter = require('./routes/measurements');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const productionOrdersRouter = require('./routes/productionOrders');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/lines', linesRouter);
app.use('/api/skus', skusRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/production-orders', productionOrdersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// Start server
const start = async () => {
  try {
    // Run migrations
    console.log('Running database migrations...');
    await migrate();

    // Run v2 migrations (shift A/B/C/D, best_buy_code, production_orders)
    console.log('Running v2 migrations...');
    await migrateV2();

    // Run v3 migrations (line_freezers, audit_log, auth, pump, idempotency, indexes)
    console.log('Running v3 migrations...');
    await migrateV3();

    // Seed data
    console.log('Seeding data...');
    await seed();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SPC Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
