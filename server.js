const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for images
app.use(express.static(path.join(__dirname))); // Serve static files from current directory

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
    try {
        const measurements = await db.getAllMeasurements();
        const images = await db.getAllImages();

        // Group measurements by parameter
        const data = {
            thickness: measurements.filter(m => m.parameter === 'thickness'),
            weight: measurements.filter(m => m.parameter === 'weight'),
            coating: measurements.filter(m => m.parameter === 'coating'),
            images: images
        };

        res.json(data);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Add measurement
app.post('/api/measurements', async (req, res) => {
    try {
        const measurement = req.body;
        await db.addMeasurement(measurement);
        res.json({ success: true, id: measurement.id });
    } catch (err) {
        console.error('Error adding measurement:', err);
        res.status(500).json({ error: 'Failed to add measurement' });
    }
});

// Delete measurement
app.delete('/api/measurements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.deleteMeasurement(id);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting measurement:', err);
        res.status(500).json({ error: 'Failed to delete measurement' });
    }
});

// Add image
app.post('/api/images', async (req, res) => {
    try {
        const image = req.body;
        await db.addImage(image);
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding image:', err);
        res.status(500).json({ error: 'Failed to add image' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(` - Open your browser and navigate to http://localhost:${PORT}`);
});
