# SPC Control Chart Application

A mobile-optimized web application for digitizing the Statistical Process Control (SPC) measurement process for Klondike Chocolate production.

## Features

- **Real-time SPC Charts**: Visual representation of measurements with control limits (LCL, LWL, Target, UWL, UCL)
- **Data Entry Form**: Simple, touch-friendly interface for entering measurements
- **Three Parameters**:
  - Slice Thickness (Target: 20.1)
  - Slice Weight (Target: 62.1)
  - Coating Weight (Target: 23.0)
- **Color-coded Status**: 
  - Green: Within control limits
  - Yellow: Warning zone (between LWL/UWL and LCL/UCL)
  - Red: Out of control (beyond LCL/UCL)
- **Data Persistence**: All data stored locally in browser (localStorage)
- **Recent Entries**: View last 10 measurements
- **Mobile/iPad Optimized**: Responsive design optimized for tablet use on production floor

## How to Use

1. **Open the Application**: 
   - Open `index.html` in a web browser
   - For iPad: Add to home screen for app-like experience

2. **Enter Measurements** (Every 30 minutes):
   - Enter operator initials
   - Enter Slice Thickness value
   - Enter Slice Weight value (with optional adjustments)
   - Enter Coating Weight value
   - Tap "Record Measurement"

3. **View Charts**: 
   - SPC charts automatically update on the left side
   - Control limits are displayed as colored lines
   - Data points are color-coded based on their position relative to limits

4. **View Recent Entries**: 
   - Scroll down to see the last 10 measurements
   - Each entry shows time, values, and operator initials

## Control Limits

### Slice Thickness
- LCL: 19.7 | LWL: 19.9 | Target: 20.1 | UWL: 20.3 | UCL: 20.5

### Slice Weight
- LCL: 58.1 | LWL: 60.1 | Target: 62.1 | UWL: 64.1 | UCL: 66.1

### Coating Weight
- LCL: 20.6 | LWL: 21.8 | Target: 23.0 | UWL: 24.2 | UCL: 25.4

## iPad Setup

1. Open the application in Safari on your iPad
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will now appear as an icon on your home screen
5. Open it like a native app - it will run in fullscreen mode

## Data Storage

- All data is stored locally in the browser's localStorage
- Data persists between sessions
- To clear all data, use the "Clear All Data" button (use with caution)

## Browser Compatibility

- Safari (iOS/iPadOS) - Recommended
- Chrome (Android/Desktop)
- Firefox (Desktop)
- Edge (Desktop)

## Technical Details

- Pure HTML/CSS/JavaScript (no build process required)
- Chart.js for SPC chart visualization
- Responsive design with mobile-first approach
- Touch-optimized interface
- LocalStorage for data persistence

## Future Enhancements

- Export data to CSV/Excel
- Print functionality
- Data backup/restore
- Multiple shift support
- Historical data analysis
- Alert notifications for out-of-control conditions

