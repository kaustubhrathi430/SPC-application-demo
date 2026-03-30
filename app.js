// SPC Control Limits Configuration
const SPC_CONFIG = {
    thickness: {
        name: 'SLICE THICKNESS',
        target: 20.1,
        lcl: 19.7,
        lwl: 19.9,
        uwl: 20.3,
        ucl: 20.5,
        unit: 'mm'
    },
    weight: {
        name: 'SLICE WEIGHT',
        target: 62.1,
        lcl: 58.1,
        lwl: 60.1,
        uwl: 64.1,
        ucl: 66.1,
        unit: 'grams'
    },
    coating: {
        name: 'COATING WEIGHT',
        target: 23.0,
        lcl: 20.6,
        lwl: 21.8,
        uwl: 24.2,
        ucl: 25.4,
        unit: 'grams'
    }
};

// Chart instances
let thicknessChart, weightChart, coatingChart;

// Global variables for images
let attachedImages = [];
// Cache for data to avoid constant fetching for small updates
let cachedData = {
    thickness: [],
    weight: [],
    coating: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeCharts();
    loadData(); // This is now async, but we don't await it here
    setupFormHandler();
    setupClearButton();
    setupSubmitSheet();
    setupImageUpload();
    setupHeaderFields();
    updateTimestamp();
    setInterval(updateTimestamp, 1000); // Update timestamp every second
});

// Update current timestamp display
function updateTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timestampEl = document.getElementById('currentTimestamp');
    if (timestampEl) {
        timestampEl.textContent = `${dateStr} ${timeStr}`;
    }
}

// Get current date and time
function getCurrentDateTime() {
    const now = new Date();
    return {
        date: now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }),
        time: getCurrentTime(),
        timestamp: now.toISOString(),
        fullDateTime: now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };
}

// Get current time in HHMM format
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
}

// Format time for display
function formatTime(time) {
    if (time && time.length === 4) {
        return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    return time || '';
}

// Initialize SPC Charts
function initializeCharts() {
    // Thickness Chart
    const thicknessCtx = document.getElementById('thicknessChart').getContext('2d');
    thicknessChart = createSPCChart(thicknessCtx, 'thickness');

    // Weight Chart
    const weightCtx = document.getElementById('weightChart').getContext('2d');
    weightChart = createSPCChart(weightCtx, 'weight');

    // Coating Chart
    const coatingCtx = document.getElementById('coatingChart').getContext('2d');
    coatingChart = createSPCChart(coatingCtx, 'coating');
}

// Create SPC Chart with control limits and smooth curves
function createSPCChart(ctx, parameter) {
    const config = SPC_CONFIG[parameter];

    // Calculate Y-axis range with padding
    const range = config.ucl - config.lcl;
    const padding = range * 0.2;
    const min = config.lcl - padding;
    const max = config.ucl + padding;

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                // Data points with smooth curves
                {
                    label: config.name,
                    data: [],
                    borderColor: '#0066ff',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#0066ff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    tension: 0.4, // Smooth curves
                    fill: false,
                    cubicInterpolationMode: 'monotone'
                },
                // Target line
                {
                    label: 'Target',
                    data: [],
                    borderColor: '#00c853',
                    borderWidth: 2.5,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    fill: false,
                    pointStyle: false,
                    tension: 0
                },
                // UCL line
                {
                    label: 'UCL',
                    data: [],
                    borderColor: '#f44336',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    pointStyle: false,
                    tension: 0
                },
                // LCL line
                {
                    label: 'LCL',
                    data: [],
                    borderColor: '#f44336',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    pointStyle: false,
                    tension: 0
                },
                // UWL line
                {
                    label: 'UWL',
                    data: [],
                    borderColor: '#ff9800',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    pointStyle: false,
                    tension: 0
                },
                // LWL line
                {
                    label: 'LWL',
                    data: [],
                    borderColor: '#ff9800',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    pointStyle: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 10,
                        padding: 6,
                        font: {
                            size: 10
                        },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 10,
                    titleFont: {
                        size: 12,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: min,
                    max: max,
                    grid: {
                        color: function (context) {
                            const value = context.tick.value;
                            if (Math.abs(value - config.target) < 0.01) {
                                return 'rgba(0, 200, 83, 0.2)';
                            } else if (Math.abs(value - config.ucl) < 0.01 || Math.abs(value - config.lcl) < 0.01) {
                                return 'rgba(244, 67, 54, 0.2)';
                            } else if (Math.abs(value - config.uwl) < 0.01 || Math.abs(value - config.lwl) < 0.01) {
                                return 'rgba(255, 152, 0, 0.2)';
                            }
                            return 'rgba(0, 0, 0, 0.05)';
                        }
                    },
                    ticks: {
                        precision: 1,
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Update chart with new data
function updateChart(chart, parameter, data) {
    const config = SPC_CONFIG[parameter];

    if (!chart) {
        console.error(`Chart not initialized for parameter: ${parameter}`);
        return;
    }

    if (!data || data.length === 0) {
        // Initialize with empty data but show control limits
        chart.data.labels = ['Start'];
        chart.data.datasets[0].data = [];
        chart.data.datasets[1].data = [config.target];
        chart.data.datasets[2].data = [config.ucl];
        chart.data.datasets[3].data = [config.lcl];
        chart.data.datasets[4].data = [config.uwl];
        chart.data.datasets[5].data = [config.lwl];
        chart.update();
        updateChartStats(parameter, []);
        return;
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => {
        return new Date(a.timestamp || a.fullDateTime) - new Date(b.timestamp || b.fullDateTime);
    });

    // Update labels and data points
    chart.data.labels = sortedData.map(entry => formatTime(entry.time));
    chart.data.datasets[0].data = sortedData.map(entry => entry.value);

    // Update control limit lines
    const length = sortedData.length;
    chart.data.datasets[1].data = new Array(length).fill(config.target); // Target
    chart.data.datasets[2].data = new Array(length).fill(config.ucl); // UCL
    chart.data.datasets[3].data = new Array(length).fill(config.lcl); // LCL
    chart.data.datasets[4].data = new Array(length).fill(config.uwl); // UWL
    chart.data.datasets[5].data = new Array(length).fill(config.lwl); // LWL

    // Color code data points based on control limits
    chart.data.datasets[0].pointBackgroundColor = sortedData.map(entry => {
        if (entry.value <= config.lcl || entry.value >= config.ucl) {
            return '#f44336'; // Out of control - red
        } else if (entry.value <= config.lwl || entry.value >= config.uwl) {
            return '#ff9800'; // Warning - orange
        } else {
            return '#00c853'; // In control - green
        }
    });

    chart.update('active');
    updateChartStats(parameter, sortedData);
}

// Update chart statistics
function updateChartStats(parameter, data) {
    const config = SPC_CONFIG[parameter];
    const statsEl = document.getElementById(`${parameter}Stats`);

    if (!statsEl) return;

    if (data.length === 0) {
        statsEl.textContent = 'No data';
        return;
    }

    const latest = data[data.length - 1];
    const status = latest.value <= config.lcl || latest.value >= config.ucl ? 'Out' :
        latest.value <= config.lwl || latest.value >= config.uwl ? 'Warning' : 'OK';

    statsEl.textContent = `Latest: ${latest.value} | Status: ${status}`;
}

// Save data to localStorage - DEPRECATED in favor of API
// Keeping this empty function to prevent errors if called,
// though we should remove calls to it.
function saveData() {
    // No-op: Data is now saved per-action via API
    console.log('saveData called - no-op in API mode');
}

// Load data from Server
async function loadData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();

        // Update cache
        cachedData.thickness = data.thickness || [];
        cachedData.weight = data.weight || [];
        cachedData.coating = data.coating || [];
        if (data.images) attachedImages = data.images;

        // Update charts
        updateChart(thicknessChart, 'thickness', cachedData.thickness);
        updateChart(weightChart, 'weight', cachedData.weight);
        updateChart(coatingChart, 'coating', cachedData.coating);

        // Update entries list
        updateEntriesList();

        // Update images
        updateImagePreview();

    } catch (e) {
        console.error('Error loading data:', e);
        // Initialize empty charts on error
        updateChart(thicknessChart, 'thickness', []);
        updateChart(weightChart, 'weight', []);
        updateChart(coatingChart, 'coating', []);
    }
}

// Get data for a parameter
// Get data for a parameter from cache
function getData(parameter) {
    return cachedData[parameter] || [];
}

// Add data point with shared timestamp
async function addDataPointWithTimestamp(parameter, value, operator, adjustments = '', sharedTimestamp) {
    const dateTime = getCurrentDateTime();

    // Use shared timestamp if provided, otherwise create new
    const timestamp = sharedTimestamp || dateTime.timestamp;
    const date = sharedTimestamp ? new Date(sharedTimestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : dateTime.date;
    const time = sharedTimestamp ? (() => {
        const d = new Date(sharedTimestamp);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}${minutes}`;
    })() : dateTime.time;

    const newEntry = {
        id: Date.now() + Math.random().toString(), // Use string ID
        parameter: parameter,
        time: time.length === 4 ? time : getCurrentTime(),
        date: date,
        timestamp: timestamp,
        value: parseFloat(value),
        operator: operator,
        adjustments: adjustments
    };

    try {
        const response = await fetch('/api/measurements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEntry)
        });

        if (!response.ok) throw new Error('Failed to save measurement');

        // Optimistically update cache and UI
        cachedData[parameter].push(newEntry);

        // Update specific chart
        if (parameter === 'thickness') updateChart(thicknessChart, 'thickness', cachedData.thickness);
        else if (parameter === 'weight') updateChart(weightChart, 'weight', cachedData.weight);
        else if (parameter === 'coating') updateChart(coatingChart, 'coating', cachedData.coating);

        return newEntry.id;
    } catch (e) {
        console.error('Error saving measurement:', e);
        alert('Failed to save measurement. Please try again.');
        return null;
    }
}

// Add data point (legacy function for compatibility)
function addDataPoint(parameter, value, operator, adjustments = '') {
    return addDataPointWithTimestamp(parameter, value, operator, adjustments);
}

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }

    try {
        const response = await fetch(`/api/measurements/${entryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete');

        // Optimistically remove from cache
        ['thickness', 'weight', 'coating'].forEach(parameter => {
            cachedData[parameter] = cachedData[parameter].filter(entry => entry.id !== entryId);

            // Update charts
            if (parameter === 'thickness') updateChart(thicknessChart, 'thickness', cachedData.thickness);
            else if (parameter === 'weight') updateChart(weightChart, 'weight', cachedData.weight);
            else if (parameter === 'coating') updateChart(coatingChart, 'coating', cachedData.coating);
        });

        updateEntriesList();

    } catch (e) {
        console.error('Error deleting entry:', e);
        alert('Failed to delete entry. Please check connection.');
    }
}

// Edit entry
function editEntry(entryId) {
    // Find the entry in any parameter
    let entry = null;
    let parameter = null;

    for (const param of ['thickness', 'weight', 'coating']) {
        const data = getData(param);
        const found = data.find(e => e.id === entryId);
        if (found) {
            entry = found;
            parameter = param;
            break;
        }
    }

    if (!entry) return;

    // Populate form with entry data
    const form = document.getElementById('measurementForm');
    const allData = {
        thickness: getData('thickness'),
        weight: getData('weight'),
        coating: getData('coating')
    };

    // Find all entries with same timestamp (they were entered together)
    const sameTimeEntries = {
        thickness: allData.thickness.find(e => e.timestamp === entry.timestamp),
        weight: allData.weight.find(e => e.timestamp === entry.timestamp),
        coating: allData.coating.find(e => e.timestamp === entry.timestamp)
    };

    if (sameTimeEntries.thickness) {
        document.getElementById('thicknessValue').value = sameTimeEntries.thickness.value;
    }
    if (sameTimeEntries.weight) {
        document.getElementById('weightValue').value = sameTimeEntries.weight.value;
        document.getElementById('weightAdjustments').value = sameTimeEntries.weight.adjustments || '';
    }
    if (sameTimeEntries.coating) {
        document.getElementById('coatingValue').value = sameTimeEntries.coating.value;
    }
    if (sameTimeEntries.thickness) {
        document.getElementById('operatorInitials').value = sameTimeEntries.thickness.operator;
    }

    // Delete old entries
    deleteEntry(entryId);

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('operatorInitials').focus();
}

// Setup form handler
function setupFormHandler() {
    const form = document.getElementById('measurementForm');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const operator = document.getElementById('operatorInitials').value.trim();
        const thickness = document.getElementById('thicknessValue').value;
        const weight = document.getElementById('weightValue').value;
        const coating = document.getElementById('coatingValue').value;
        const adjustments = document.getElementById('weightAdjustments').value.trim();

        if (!operator) {
            alert('Please enter operator initials');
            return;
        }

        // Add all three measurements with same timestamp
        const dateTime = getCurrentDateTime();
        const sharedTimestamp = dateTime.timestamp;

        // Create entries with shared timestamp (await sequentially to ensure order)
        (async () => {
            await addDataPointWithTimestamp('thickness', thickness, operator, '', sharedTimestamp);
            await addDataPointWithTimestamp('weight', weight, operator, adjustments, sharedTimestamp);
            await addDataPointWithTimestamp('coating', coating, operator, '', sharedTimestamp); // Fixed typo in function name

            // Update entries list after adding all data
            updateEntriesList();
        })();

        // Reset form (keep operator initials)
        document.getElementById('thicknessValue').value = '';
        document.getElementById('weightValue').value = '';
        document.getElementById('coatingValue').value = '';
        document.getElementById('weightAdjustments').value = '';

        // Show success feedback
        const submitBtn = form.querySelector('.premium-btn');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>✓ Recorded!</span>';
        submitBtn.style.background = '#00c853';

        setTimeout(() => {
            submitBtn.innerHTML = originalHTML;
            submitBtn.style.background = '';
        }, 2000);

        // Focus on first input for next entry
        document.getElementById('thicknessValue').focus();
    });
}

// Setup clear button
function setupClearButton() {
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                alert('Clearing all data is disabled in server mode for safety.');
            });
        }
    }
}

// Update entries list with edit/delete buttons
function updateEntriesList() {
    const entriesList = document.getElementById('entriesList');
    const thicknessData = getData('thickness');
    const weightData = getData('weight');
    const coatingData = getData('coating');

    if (thicknessData.length === 0 && weightData.length === 0 && coatingData.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <p>No entries yet</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">Start recording measurements above</p>
            </div>
        `;
        return;
    }

    // Get all unique timestamps
    const allTimestamps = new Set();
    thicknessData.forEach(d => allTimestamps.add(d.timestamp));
    weightData.forEach(d => allTimestamps.add(d.timestamp));
    coatingData.forEach(d => allTimestamps.add(d.timestamp));

    // Sort by timestamp (most recent first)
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => {
        return new Date(b) - new Date(a);
    });

    entriesList.innerHTML = sortedTimestamps.slice(0, 15).map(timestamp => {
        const tEntry = thicknessData.find(d => d.timestamp === timestamp);
        const wEntry = weightData.find(d => d.timestamp === timestamp);
        const cEntry = coatingData.find(d => d.timestamp === timestamp);

        const entry = tEntry || wEntry || cEntry;
        const operator = entry?.operator || 'N/A';
        const date = entry?.date || '';
        const time = entry?.time ? formatTime(entry.time) : '';

        return `
            <div class="entry-item">
                <div class="entry-header">
                    <div>
                        <div class="entry-time">${time}</div>
                        <div class="entry-date">${date}</div>
                    </div>
                    <div class="entry-actions">
                        <button class="icon-btn" onclick="editEntry('${entry.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="icon-btn delete" onclick="deleteEntry('${entry.id}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="entry-data">
                    ${tEntry ? `
                        <div class="data-item">
                            <div class="data-label">Thickness</div>
                            <div class="data-value">${tEntry.value}</div>
                        </div>
                    ` : ''}
                    ${wEntry ? `
                        <div class="data-item">
                            <div class="data-label">Weight</div>
                            <div class="data-value">${wEntry.value}${wEntry.adjustments ? ' (' + wEntry.adjustments + ')' : ''}</div>
                        </div>
                    ` : ''}
                    ${cEntry ? `
                        <div class="data-item">
                            <div class="data-label">Coating</div>
                            <div class="data-value">${cEntry.value}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="entry-operator">Operator: ${operator}</div>
            </div>
        `;
    }).join('');
}

// Make functions globally available for onclick handlers
window.editEntry = editEntry;
window.deleteEntry = deleteEntry;

// Setup header fields to save on change
function setupHeaderFields() {
    const productCodeInput = document.getElementById('productCode');
    const productNameInput = document.getElementById('productName');
    const freezerNameInput = document.getElementById('freezerName');

    [productCodeInput, productNameInput, freezerNameInput].forEach(input => {
        if (input) {
            input.addEventListener('change', function () {
                saveData();
            });
        }
    });
}

// Setup image upload
function setupImageUpload() {
    const imageInput = document.getElementById('productImage');
    if (imageInput) {
        // Already handled by handleImageUpload in HTML
    }
}

// Handle image upload
window.handleImageUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const imageData = {
            id: Date.now(),
            data: e.target.result,
            name: file.name,
            timestamp: new Date().toISOString()
        };
        attachedImages.push(imageData);
        updateImagePreview();
        saveData();

        // Update upload button text
        const uploadText = document.getElementById('imageUploadText');
        if (uploadText) {
            uploadText.textContent = `${attachedImages.length} Photo${attachedImages.length > 1 ? 's' : ''} Attached`;
        }
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
};

// Update image preview
function updateImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;

    if (attachedImages.length === 0) {
        preview.innerHTML = '';
        const uploadText = document.getElementById('imageUploadText');
        if (uploadText) {
            uploadText.textContent = 'Attach Photo';
        }
        return;
    }

    preview.innerHTML = attachedImages.map((img, index) => `
        <div class="image-preview-item">
            <img src="${img.data}" alt="${img.name}">
            <button class="remove-image" onclick="removeImage(${img.id})" title="Remove">×</button>
        </div>
    `).join('');
}

// Remove image
window.removeImage = function (imageId) {
    attachedImages = attachedImages.filter(img => img.id !== imageId);
    updateImagePreview();
    saveData();

    const uploadText = document.getElementById('imageUploadText');
    if (uploadText) {
        uploadText.textContent = attachedImages.length > 0
            ? `${attachedImages.length} Photo${attachedImages.length > 1 ? 's' : ''} Attached`
            : 'Attach Photo';
    }
};

// Setup submit sheet button
function setupSubmitSheet() {
    const submitBtn = document.getElementById('submitSheetBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async function () {
            await generateShiftReport();
        });
    }
}

// Generate shift report with LLM summary
async function generateShiftReport() {
    const reportEl = document.getElementById('shiftReport');
    if (!reportEl) return;

    // Show loading state
    reportEl.classList.add('show');
    reportEl.innerHTML = `
        <div class="shift-report-loading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p>Generating shift report...</p>
        </div>
    `;

    try {
        // Collect all data
        const thicknessData = getData('thickness');
        const weightData = getData('weight');
        const coatingData = getData('coating');
        const productName = document.getElementById('productName')?.value || 'Klondike Chocolate/Chocolate';
        const productCode = document.getElementById('productCode')?.value || '9573493';
        const freezerName = document.getElementById('freezerName')?.value || '2';

        // Prepare data summary
        const dataSummary = {
            productName,
            productCode,
            freezerName,
            totalMeasurements: Math.max(thicknessData.length, weightData.length, coatingData.length),
            thickness: {
                entries: thicknessData.length,
                latest: thicknessData[thicknessData.length - 1]?.value || 'N/A',
                average: thicknessData.length > 0
                    ? (thicknessData.reduce((sum, e) => sum + e.value, 0) / thicknessData.length).toFixed(2)
                    : 'N/A',
                outOfControl: thicknessData.filter(e => e.value <= SPC_CONFIG.thickness.lcl || e.value >= SPC_CONFIG.thickness.ucl).length,
                warnings: thicknessData.filter(e => (e.value <= SPC_CONFIG.thickness.lwl || e.value >= SPC_CONFIG.thickness.uwl) &&
                    e.value > SPC_CONFIG.thickness.lcl && e.value < SPC_CONFIG.thickness.ucl).length
            },
            weight: {
                entries: weightData.length,
                latest: weightData[weightData.length - 1]?.value || 'N/A',
                average: weightData.length > 0
                    ? (weightData.reduce((sum, e) => sum + e.value, 0) / weightData.length).toFixed(2)
                    : 'N/A',
                outOfControl: weightData.filter(e => e.value <= SPC_CONFIG.weight.lcl || e.value >= SPC_CONFIG.weight.ucl).length,
                warnings: weightData.filter(e => (e.value <= SPC_CONFIG.weight.lwl || e.value >= SPC_CONFIG.weight.uwl) &&
                    e.value > SPC_CONFIG.weight.lcl && e.value < SPC_CONFIG.weight.ucl).length
            },
            coating: {
                entries: coatingData.length,
                latest: coatingData[coatingData.length - 1]?.value || 'N/A',
                average: coatingData.length > 0
                    ? (coatingData.reduce((sum, e) => sum + e.value, 0) / coatingData.length).toFixed(2)
                    : 'N/A',
                outOfControl: coatingData.filter(e => e.value <= SPC_CONFIG.coating.lcl || e.value >= SPC_CONFIG.coating.ucl).length,
                warnings: coatingData.filter(e => (e.value <= SPC_CONFIG.coating.lwl || e.value >= SPC_CONFIG.coating.uwl) &&
                    e.value > SPC_CONFIG.coating.lcl && e.value < SPC_CONFIG.coating.ucl).length
            },
            images: attachedImages.length,
            shiftStart: thicknessData.length > 0 ? thicknessData[0].fullDateTime : 'N/A',
            shiftEnd: thicknessData.length > 0 ? thicknessData[thicknessData.length - 1].fullDateTime : 'N/A'
        };

        // Create prompt for LLM
        const prompt = `Analyze this SPC (Statistical Process Control) shift report data and provide a comprehensive summary:

Product: ${dataSummary.productName}
Product Code: ${dataSummary.productCode}
Freezer: ${dataSummary.freezerName}
Total Measurements: ${dataSummary.totalMeasurements}
Shift Period: ${dataSummary.shiftStart} to ${dataSummary.shiftEnd}

SLICE THICKNESS:
- Total Entries: ${dataSummary.thickness.entries}
- Latest Value: ${dataSummary.thickness.latest}
- Average: ${dataSummary.thickness.average}
- Out of Control: ${dataSummary.thickness.outOfControl}
- Warnings: ${dataSummary.thickness.warnings}
- Control Limits: LCL 19.7, Target 20.1, UCL 20.5

SLICE WEIGHT:
- Total Entries: ${dataSummary.weight.entries}
- Latest Value: ${dataSummary.weight.latest}
- Average: ${dataSummary.weight.average}
- Out of Control: ${dataSummary.weight.outOfControl}
- Warnings: ${dataSummary.weight.warnings}
- Control Limits: LCL 58.1, Target 62.1, UCL 66.1

COATING WEIGHT:
- Total Entries: ${dataSummary.coating.entries}
- Latest Value: ${dataSummary.coating.latest}
- Average: ${dataSummary.coating.average}
- Out of Control: ${dataSummary.coating.outOfControl}
- Warnings: ${dataSummary.coating.warnings}
- Control Limits: LCL 20.6, Target 23.0, UCL 25.4

Product Photos: ${dataSummary.images}

Provide a professional shift report summary including:
1. Overall process performance assessment
2. Key observations and trends
3. Quality control status
4. Recommendations for next shift
5. Any concerns or issues identified`;

        // Use web search to get LLM analysis (simulated)
        // In production, you would call an actual LLM API
        const summary = await generateLLMSummary(prompt, dataSummary);

        // Display report
        reportEl.innerHTML = `
            <h4>Shift Report Summary</h4>
            <div class="shift-report-content">${summary}</div>
        `;

    } catch (error) {
        console.error('Error generating report:', error);
        reportEl.innerHTML = `
            <h4>Shift Report Summary</h4>
            <div class="shift-report-content">
                <p style="color: var(--danger);">Error generating report. Please try again.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Generate LLM summary (using web search as fallback)
async function generateLLMSummary(prompt, dataSummary) {
    try {
        // Try to use web search to get insights
        // In a real implementation, you would call an LLM API like OpenAI, Anthropic, etc.

        // For now, generate a comprehensive summary based on the data
        let summary = `SHIFT REPORT SUMMARY\n`;
        summary += `═══════════════════════════════════════\n\n`;
        summary += `Product: ${dataSummary.productName}\n`;
        summary += `Product Code: ${dataSummary.productCode}\n`;
        summary += `Freezer: ${dataSummary.freezerName}\n`;
        summary += `Shift Period: ${dataSummary.shiftStart} to ${dataSummary.shiftEnd}\n`;
        summary += `Total Measurements: ${dataSummary.totalMeasurements}\n\n`;

        summary += `OVERALL PERFORMANCE:\n`;
        const totalOutOfControl = dataSummary.thickness.outOfControl + dataSummary.weight.outOfControl + dataSummary.coating.outOfControl;
        const totalWarnings = dataSummary.thickness.warnings + dataSummary.weight.warnings + dataSummary.coating.warnings;

        if (totalOutOfControl === 0 && totalWarnings === 0) {
            summary += `✓ Excellent process control maintained throughout the shift.\n`;
            summary += `✓ All measurements within acceptable limits.\n`;
        } else if (totalOutOfControl === 0) {
            summary += `⚠ Process generally in control with ${totalWarnings} warning(s) noted.\n`;
            summary += `⚠ Monitor trends closely in next shift.\n`;
        } else {
            summary += `✗ Process control issues detected: ${totalOutOfControl} out-of-control measurement(s).\n`;
            summary += `✗ Immediate attention required.\n`;
        }

        summary += `\nPARAMETER ANALYSIS:\n\n`;

        summary += `SLICE THICKNESS:\n`;
        summary += `  • Latest: ${dataSummary.thickness.latest} (Target: 20.1)\n`;
        summary += `  • Average: ${dataSummary.thickness.average}\n`;
        summary += `  • Status: ${dataSummary.thickness.outOfControl > 0 ? '⚠ Out of Control' : dataSummary.thickness.warnings > 0 ? '⚠ Warnings' : '✓ In Control'}\n`;
        if (dataSummary.thickness.outOfControl > 0) {
            summary += `  • Action: Review thickness settings and calibration\n`;
        }
        summary += `\n`;

        summary += `SLICE WEIGHT:\n`;
        summary += `  • Latest: ${dataSummary.weight.latest} (Target: 62.1)\n`;
        summary += `  • Average: ${dataSummary.weight.average}\n`;
        summary += `  • Status: ${dataSummary.weight.outOfControl > 0 ? '⚠ Out of Control' : dataSummary.weight.warnings > 0 ? '⚠ Warnings' : '✓ In Control'}\n`;
        if (dataSummary.weight.outOfControl > 0) {
            summary += `  • Action: Check filler settings and product consistency\n`;
        }
        summary += `\n`;

        summary += `COATING WEIGHT:\n`;
        summary += `  • Latest: ${dataSummary.coating.latest} (Target: 23.0)\n`;
        summary += `  • Average: ${dataSummary.coating.average}\n`;
        summary += `  • Status: ${dataSummary.coating.outOfControl > 0 ? '⚠ Out of Control' : dataSummary.coating.warnings > 0 ? '⚠ Warnings' : '✓ In Control'}\n`;
        if (dataSummary.coating.outOfControl > 0) {
            summary += `  • Action: Verify coating equipment and flow rates\n`;
        }
        summary += `\n`;

        summary += `RECOMMENDATIONS:\n`;
        if (totalOutOfControl === 0) {
            summary += `1. Continue current process parameters\n`;
            summary += `2. Maintain regular 30-minute measurement intervals\n`;
            summary += `3. Monitor for any trend changes\n`;
        } else {
            summary += `1. Investigate root causes of out-of-control measurements\n`;
            summary += `2. Review equipment calibration and settings\n`;
            summary += `3. Increase monitoring frequency if issues persist\n`;
            summary += `4. Document all adjustments made during shift\n`;
        }

        if (dataSummary.images > 0) {
            summary += `\nProduct Photos: ${dataSummary.images} photo(s) attached for visual reference.\n`;
        }

        summary += `\n═══════════════════════════════════════\n`;
        summary += `Report Generated: ${new Date().toLocaleString()}\n`;

        return summary;

    } catch (error) {
        throw new Error('Failed to generate summary: ' + error.message);
    }
}

// Auto-focus first input on load
window.addEventListener('load', function () {
    setTimeout(() => {
        const firstInput = document.getElementById('operatorInitials');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
});
