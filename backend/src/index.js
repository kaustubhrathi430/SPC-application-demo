const express = require('express');
const cors = require('cors');
const path = require('path');
const migrate = require('./config/migrate');
const { seed } = require('./seeds/seedData');

const linesRouter = require('./routes/lines');
const skusRouter = require('./routes/skus');
const measurementsRouter = require('./routes/measurements');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');

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
