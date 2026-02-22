import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getHistory, exportCsv, exportExcel, getReportPdf } from '../utils/api';
import { formatTime, formatDate, downloadText, downloadBlob } from '../utils/helpers';

const ADMIN_PASSWORD = 'Klondike@12345';

function AdminDashboard({ lines, skus }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    line_id: '', sku_id: '', shift: '', date_from: '', date_to: '',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboard(filters);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }, [filters]);

  const loadHistory = useCallback(async () => {
    try {
      const params = { ...filters, page, per_page: 50 };
      // Remove empty values
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const data = await getHistory(params);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, [filters, page]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDashboard();
      setLoading(false);
    };
    init();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const csvText = await exportCsv(params);
      downloadText(csvText, 'spc-data-export.csv');
    } catch (err) {
      console.error('Export CSV failed:', err);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const blob = await exportExcel(params);
      downloadBlob(blob, 'spc-data-export.xlsx');
    } catch (err) {
      console.error('Export Excel failed:', err);
    }
  };

  const handleDownloadReportPdf = async (reportId) => {
    try {
      const blob = await getReportPdf(reportId);
      downloadBlob(blob, `shift-report-${reportId}.pdf`);
    } catch (err) {
      console.error('Download PDF failed:', err);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="selection-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="logo-fallback" style={{ marginBottom: '2rem' }}>
          <div className="logo-text">KLONDIKE</div>
          <div className="logo-subtext">ADMIN ACCESS</div>
        </div>
        <div className="premium-card" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="card-header">
            <h3>Admin Dashboard Login</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} style={{ padding: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                placeholder="Enter admin password"
                style={{
                  width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0',
                  borderRadius: '8px', fontSize: '1rem',
                  borderColor: passwordError ? '#f44336' : '#e0e0e0',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
              {passwordError && (
                <p style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="record-btn"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Login
            </button>
            <button
              type="button"
              className="back-btn"
              style={{ width: '100%', marginTop: '0.75rem', textAlign: 'center' }}
              onClick={() => navigate('/')}
            >
              Back to Operator View
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="selection-page">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-branding">
          <div className="logo-container">
            <div className="logo-fallback">
              <div className="logo-text" style={{ fontSize: '1.2rem' }}>KLONDIKE</div>
              <div className="logo-subtext">ADMIN DASHBOARD</div>
            </div>
          </div>
          <div className="header-info">
            <h1>SPC Data Dashboard</h1>
            <div className="header-details">
              <div className="header-field">
                <label>Plant #1352, Covington</label>
              </div>
            </div>
          </div>
          <div className="header-nav">
            <button
              className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Shift Reports
            </button>
            <button className="nav-btn" onClick={() => navigate('/')}>
              Operator View
            </button>
            <button
              className="nav-btn"
              onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuthenticated(false); }}
              style={{ color: '#f44336' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        {/* Filters */}
        <div className="admin-header">
          <div className="admin-filters">
            <select
              value={filters.line_id}
              onChange={e => handleFilterChange('line_id', e.target.value)}
            >
              <option value="">All Lines</option>
              {lines.map(l => (
                <option key={l.id} value={l.id}>{l.display_name}</option>
              ))}
            </select>
            <select
              value={filters.sku_id}
              onChange={e => handleFilterChange('sku_id', e.target.value)}
            >
              <option value="">All SKUs</option>
              {skus.map(s => (
                <option key={s.id} value={s.id}>{s.product_name} ({s.product_code})</option>
              ))}
            </select>
            <select
              value={filters.shift}
              onChange={e => handleFilterChange('shift', e.target.value)}
            >
              <option value="">All Shifts</option>
              <option value="Day">Day Shift</option>
              <option value="Night">Night Shift</option>
            </select>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => handleFilterChange('date_from', e.target.value)}
              placeholder="From"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={e => handleFilterChange('date_to', e.target.value)}
              placeholder="To"
            />
            <button
              className="nav-btn"
              onClick={() => { loadDashboard(); if (activeTab === 'history') loadHistory(); }}
            >
              Apply Filters
            </button>
          </div>
          <div className="export-btns">
            <button className="export-btn" onClick={handleExportCsv}>Export CSV</button>
            <button className="export-btn" onClick={handleExportExcel}>Export Excel</button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Measurements</div>
                <div className="stat-value">{dashboard.total_measurements}</div>
              </div>
              {dashboard.line_stats.map(ls => (
                <div key={ls.line_id} className="stat-card">
                  <div className="stat-label">{ls.display_name}</div>
                  <div className="stat-value">{ls.total_measurements || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8e8e', marginTop: '0.25rem' }}>
                    {ls.last_measurement
                      ? `Last: ${formatDate(ls.last_measurement)}`
                      : 'No data yet'
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* SKU Usage */}
            <div className="premium-card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3>SKU Usage</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Product Code</th>
                      <th>Measurements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.sku_usage || []).map(s => (
                      <tr key={s.product_code}>
                        <td>{s.product_name}</td>
                        <td>{s.product_code}</td>
                        <td>{s.usage_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="premium-card">
              <div className="card-header">
                <h3>Recent Shift Reports</h3>
              </div>
              <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Line</th>
                      <th>Product</th>
                      <th>Operator</th>
                      <th>Supervisor</th>
                      <th>Measurements</th>
                      <th>OOC</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_reports || []).map(r => {
                      const totalOoc = (r.thickness_out_of_control || 0) +
                        (r.weight_out_of_control || 0) + (r.coating_out_of_control || 0);
                      return (
                        <tr key={r.id}>
                          <td>{r.shift_date}</td>
                          <td>{r.shift}</td>
                          <td>{r.line_name}</td>
                          <td>{r.product_name}</td>
                          <td>{r.operator_name}</td>
                          <td>{r.supervisor_name || '-'}</td>
                          <td>{r.total_measurements}</td>
                          <td style={{ color: totalOoc > 0 ? '#f44336' : '#00c853', fontWeight: 600 }}>
                            {totalOoc}
                          </td>
                          <td>
                            <button
                              className="icon-btn"
                              onClick={() => handleDownloadReportPdf(r.id)}
                              title="Download PDF"
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!dashboard.recent_reports || dashboard.recent_reports.length === 0) && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>No reports yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Measurement History</h3>
              <span className="timestamp-display">
                {history ? `${history.pagination.total} total records` : 'Loading...'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Freezer</th>
                    <th>Product</th>
                    <th>Thickness</th>
                    <th>Weight</th>
                    <th>Coating</th>
                    <th>Operator</th>
                    <th>Lead</th>
                    <th>Adjustments</th>
                  </tr>
                </thead>
                <tbody>
                  {history && history.data.map(row => (
                    <tr key={row.id}>
                      <td>{row.shift_date}</td>
                      <td>{formatTime(row.recorded_at)}</td>
                      <td>{row.shift}</td>
                      <td>{row.line_name}</td>
                      <td>#{row.freezer_number}</td>
                      <td>{row.product_name}</td>
                      <td>{row.thickness_value ? parseFloat(row.thickness_value) : '-'}</td>
                      <td>{row.weight_value ? parseFloat(row.weight_value) : '-'}</td>
                      <td>{row.coating_value ? parseFloat(row.coating_value) : '-'}</td>
                      <td>{row.operator_initials}</td>
                      <td>{row.lead_initials || '-'}</td>
                      <td>{row.adjustments || '-'}</td>
                    </tr>
                  ))}
                  {history && history.data.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem' }}>No data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {history && history.pagination.total_pages > 1 && (
              <div className="pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {history.pagination.total_pages}</span>
                <button
                  disabled={page >= history.pagination.total_pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && dashboard && (
          <div className="premium-card">
            <div className="card-header">
              <h3>All Shift Reports</h3>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Product</th>
                    <th>Operator</th>
                    <th>Supervisor</th>
                    <th>Measurements</th>
                    <th>Thick. OOC</th>
                    <th>Weight OOC</th>
                    <th>Coating OOC</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.recent_reports || []).map(r => (
                    <tr key={r.id}>
                      <td>{r.shift_date}</td>
                      <td>{r.shift}</td>
                      <td>{r.line_name}</td>
                      <td>{r.product_name}</td>
                      <td>{r.operator_name}</td>
                      <td>{r.supervisor_name || '-'}</td>
                      <td>{r.total_measurements}</td>
                      <td style={{ color: r.thickness_out_of_control > 0 ? '#f44336' : 'inherit' }}>
                        {r.thickness_out_of_control || 0}
                      </td>
                      <td style={{ color: r.weight_out_of_control > 0 ? '#f44336' : 'inherit' }}>
                        {r.weight_out_of_control || 0}
                      </td>
                      <td style={{ color: r.coating_out_of_control > 0 ? '#f44336' : 'inherit' }}>
                        {r.coating_out_of_control || 0}
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() => handleDownloadReportPdf(r.id)}
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!dashboard.recent_reports || dashboard.recent_reports.length === 0) && (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>No reports yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
