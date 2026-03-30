const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
// If file doesn't exist, it will be created
const dbPath = path.resolve(__dirname, 'spc_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Create measurements table
        db.run(`CREATE TABLE IF NOT EXISTS measurements (
            id TEXT PRIMARY KEY,
            parameter TEXT NOT NULL,
            value REAL NOT NULL,
            operator TEXT,
            timestamp TEXT,
            date TEXT,
            time TEXT,
            adjustments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating measurements table:', err);
        });

        // Create images table (storing base64 for simplicity in this demo)
        // In a production app, you'd store files on disk and paths in DB
        db.run(`CREATE TABLE IF NOT EXISTS images (
            id TEXT PRIMARY KEY,
            name TEXT,
            data TEXT,
            timestamp TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating images table:', err);
        });
    });
}

// Database interface
const dbInterface = {
    // Get all measurements
    getAllMeasurements: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM measurements ORDER BY timestamp ASC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Add a measurement
    addMeasurement: (measurement) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO measurements (id, parameter, value, operator, timestamp, date, time, adjustments)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                measurement.id,
                measurement.parameter,
                measurement.value,
                measurement.operator,
                measurement.timestamp,
                measurement.date,
                measurement.time,
                measurement.adjustments || ''
            ];
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },

    // Delete a measurement
    deleteMeasurement: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM measurements WHERE id = ?", [id], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },

    // Get all images
    getAllImages: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM images ORDER BY timestamp DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Add an image
    addImage: (image) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO images (id, name, data, timestamp) VALUES (?, ?, ?, ?)`;
            db.run(sql, [image.id, image.name, image.data, image.timestamp], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }
};

module.exports = dbInterface;
