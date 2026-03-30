# SPC Control Chart Application - Klondike Department

On-premise SPC (Statistical Process Control) monitoring application for the Klondike Department at Plant #1352, Covington. Designed for operators to record quality measurements every 30 minutes from production line freezers using laptops, HMIs, and iPads.

## Architecture

- **Frontend**: React 18 + Chart.js (served via Nginx)
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose (3 containers: frontend, backend, database)
- **Network**: Fully on-premise, no internet required

## Features

- **3-step operator workflow**: Line Selection > SKU Selection > SPC Workspace
- **13 SKUs** with product-specific SPC control limits (from PDF spec sheets)
- **3 production lines** (Line 1: 4 freezers, Line 2: 2 freezers, Line 3: 2 freezers)
- **Automatic shift detection**: Day (6AM-6PM) / Night (6PM-6AM)
- **Freezer ribbon tabs** for quick switching between freezers
- **Real-time SPC charts** with color-coded status (green/orange/red)
- **Lead initials** capture for shift lead verification
- **Mix Instruction Sheet confirmation** modal on SKU change
- **Shift reports** with supervisor sign-off and PDF export
- **Admin dashboard** with historical data, CSV/Excel export
- **Photo attachments** for product documentation
- **Touch-optimized** for iPad, HMI, and laptop use

## Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose installed on the server
- No internet required after initial Docker image pull

### Deploy

```bash
# Clone the repository to the on-premise server
git clone <repo-url>
cd SPC-application-demo-1

# Build and start all containers
docker compose up -d --build

# The app is now running at http://<server-ip>:80
```

### Access

- **Operator UI**: `http://<server-ip>/` (port 80)
- **Admin Dashboard**: `http://<server-ip>/admin`
- **API Health Check**: `http://<server-ip>/api/health`

### Stop / Restart

```bash
# Stop all services
docker compose down

# Stop but keep database data
docker compose down

# Restart
docker compose up -d

# Full reset (WARNING: deletes all data)
docker compose down -v
docker compose up -d --build
```

## Project Structure

```
.
├── docker-compose.yml          # Docker orchestration (3 services)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express server entry point
│       ├── config/
│       │   ├── database.js     # PostgreSQL connection pool
│       │   └── migrate.js      # Database schema creation
│       ├── routes/
│       │   ├── lines.js        # GET /api/lines
│       │   ├── skus.js         # GET /api/skus
│       │   ├── measurements.js # CRUD /api/measurements
│       │   ├── reports.js      # Shift reports + PDF generation
│       │   └── admin.js        # Dashboard, history, CSV/Excel export
│       └── seeds/
│           └── seedData.js     # 13 SKUs + 3 lines seed data
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf              # Nginx config with API proxy
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js              # React Router setup
│       ├── index.js            # React entry point
│       ├── components/
│       │   └── SPCChart.js     # Chart.js SPC chart component
│       ├── pages/
│       │   ├── LineSelection.js    # Page 1: Pick production line
│       │   ├── SkuSelection.js     # Page 2: Pick SKU + confirmation
│       │   ├── SPCWorkspace.js     # Page 3: Main SPC data entry
│       │   └── AdminDashboard.js   # Admin: history, reports, export
│       ├── styles/
│       │   └── global.css      # All CSS (matching original design)
│       └── utils/
│           ├── api.js          # API client functions
│           └── helpers.js      # Shift detection, formatting, etc.
```

## Operator Workflow

1. **Select Line** - Choose Line 1, 2, or 3
2. **Select SKU** - Pick the product being produced (13 options)
3. **Confirmation** - Acknowledge "Check with your Mix Instruction Sheet"
4. **SPC Workspace**:
   - Switch between freezers using the ribbon tabs
   - Enter operator initials, lead initials
   - Enter Slice Thickness, Slice Weight, Coating Weight
   - Document any adjustments
   - Attach product photos (optional)
   - Click "Record Measurement"
   - View real-time SPC charts updating
   - At end of shift: Submit Shift Report with supervisor sign-off

## SKUs Included

| Product | Code | Thickness Target | Weight Target | Coating Target |
|---------|------|-----------------|---------------|----------------|
| Klondike Reese's PB Cup | 68300738 | 17.8 | 59.5 | 18.0 |
| Klondike Original MTB | 68689251 | 19.6 | 62.3 | 23.0 |
| Klondike SAB RF NSA Vanilla | 68709233 | 17.8 | 56.5 | 18.0 |
| Klondike Chocolate/Chocolate | 68709237 | 19.6 | 62.1 | 23.0 |
| Klondike SAB NSA Krunch | 68710277 | 17.9 | 57.1 | 15.4 |
| Klondike Krunch Bars | 68710285 | 18.1 | 57.4 | 24.6 |
| Klondike Mint Choc. Chip 12-6PK | 68746232 | 17.7 | 55.7 | 21.3 |
| Klondike Cookies & Creme 12-6PK | 68852583 | 16.8 | 52.9 | 22.1 |
| Klondike Heath | 68852591 | 17.2 | 52.1 | 20.4 |
| Klondike Dark Chocolate | 68921994 | 19.6 | 62.1 | 23.0 |
| Klondike Original (69548143) | 69548143 | 20.1 | 62.3 | 23.0 |
| Klondike Reese's (69549032) | 69549032 | 17.0 | 50.4 | 17.0 |
| Klondike Reese's (69779478) | 69779478 | 17.0 | 50.4 | 17.0 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/lines | List all lines |
| GET | /api/skus | List all active SKUs |
| GET | /api/measurements | List measurements (filtered) |
| GET | /api/measurements/chart-data | Chart data for SPC charts |
| POST | /api/measurements | Record new measurement |
| PUT | /api/measurements/:id | Update measurement |
| DELETE | /api/measurements/:id | Delete measurement |
| GET | /api/reports | List shift reports |
| POST | /api/reports | Create shift report |
| GET | /api/reports/:id | Get single report |
| GET | /api/reports/:id/pdf | Download report as PDF |
| GET | /api/admin/dashboard | Admin dashboard data |
| GET | /api/admin/history | Paginated measurement history |
| GET | /api/admin/export/csv | Export data as CSV |
| GET | /api/admin/export/excel | Export data as Excel |

## Database

Data is persisted in a PostgreSQL volume (`pgdata`). To back up:

```bash
# Backup database
docker exec spc-database pg_dump -U spc_user spc_db > backup.sql

# Restore database
cat backup.sql | docker exec -i spc-database psql -U spc_user spc_db
```

## Browser Compatibility

- Safari (iOS/iPadOS) - Primary target for iPads
- Chrome (Android/Desktop)
- Firefox
- Edge
