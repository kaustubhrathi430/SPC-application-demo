import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboard,
  getHistory,
  exportCsv,
  exportExcel,
  getReportPdf,
  getAdminSession,
  adminLogin,
  adminLogout,
  getAdminReports,
  getProductionOrdersAdmin,
  reviewProductionOrder,
  getAuditLog,
} from '../utils/api';
import { formatTime, formatDate, downloadText, downloadBlob } from '../utils/helpers';

const INITIAL_FILTERS = {
  line_id: '',
  sku_id: '',
  shift: '',
  date_from: '',
  date_to: '',
};

function AdminDashboard({ lines, skus }) {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState(null);
  const [reportsData, setReportsData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [auditData, setAuditData] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [historyPage, setHistoryPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const handleUnauthorized = useCallback(() => {
    setIsAuthenticated(false);
    setSessionInfo(null);
    setDashboard(null);
    setHistory(null);
    setReportsData(null);
    setOrdersData(null);
    setAuditData(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboard(filters);
      setDashboard(data);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Failed to load dashboard:', err);
    }
  }, [filters, handleUnauthorized]);

  const loadHistory = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = { ...filters, page: historyPage, per_page: 50 };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const data = await getHistory(params);
      setHistory(data);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Failed to load history:', err);
    } finally {
      setTabLoading(false);
    }
  }, [filters, historyPage, handleUnauthorized]);

  const loadReports = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = { ...filters, page: reportsPage, per_page: 50 };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const data = await getAdminReports(params);
      setReportsData(data);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Failed to load reports:', err);
    } finally {
      setTabLoading(false);
    }
  }, [filters, reportsPage, handleUnauthorized]);

  const loadOrders = useCallback(async () => {
    setTabLoading(true);
    try {
      const params = { ...filters, page: ordersPage, per_page: 50 };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const data = await getProductionOrdersAdmin(params);
      setOrdersData(data);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Failed to load production orders:', err);
    } finally {
      setTabLoading(false);
    }
  }, [filters, ordersPage, handleUnauthorized]);

  const loadAudit = useCallback(async () => {
    setTabLoading(true);
    try {
      const data = await getAuditLog({ page: auditPage, per_page: 50 });
      setAuditData(data);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Failed to load audit log:', err);
    } finally {
      setTabLoading(false);
    }
  }, [auditPage, handleUnauthorized]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const session = await getAdminSession();
        if (cancelled) return;

        if (!session.authenticated) {
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        setSessionInfo(session);
        await loadDashboard();
      } catch (err) {
        if (!cancelled && err.status !== 401) {
          console.error('Failed to restore admin session:', err);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'history') loadHistory();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'audit') loadAudit();
  }, [activeTab, isAuthenticated, loadHistory, loadReports, loadOrders, loadAudit]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setHistoryPage(1);
    setReportsPage(1);
    setOrdersPage(1);
  };

  const applyFilters = async () => {
    await loadDashboard();
    if (activeTab === 'history') await loadHistory();
    if (activeTab === 'reports') await loadReports();
    if (activeTab === 'orders') await loadOrders();
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setPasswordError('');

    try {
      await adminLogin(passwordInput);
      const session = await getAdminSession();
      setIsAuthenticated(true);
      setSessionInfo(session);
      setPasswordInput('');
      await loadDashboard();
    } catch (err) {
      setPasswordError(err.message || 'Login failed');
    } finally {
      setAuthChecked(true);
      setLoading(false);
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.warn('Logout failed:', err);
    }
    handleUnauthorized();
    setPasswordInput('');
    setPasswordError('');
  };

  const handleExportCsv = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const csvText = await exportCsv(params);
      downloadText(csvText, 'spc-data-export.csv');
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Export CSV failed:', err);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const blob = await exportExcel(params);
      downloadBlob(blob, 'spc-data-export.xlsx');
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
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

  const handleReviewOrder = async (order) => {
    const reviewedBy = window.prompt(
      `Enter reviewer name for PO ${order.po_number || order.id}`
    );

    if (!reviewedBy || !reviewedBy.trim()) return;

    try {
      await reviewProductionOrder(order.id, reviewedBy.trim());
      await Promise.all([loadOrders(), loadDashboard()]);
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized();
        return;
      }
      window.alert(err.message || 'Failed to review production order');
    }
  };

  const renderPagination = (pagination, page, setPage) => {
    if (!pagination || pagination.total_pages <= 1) return null;

    return (
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </button>
        <span>Page {page} of {pagination.total_pages}</span>
        <button
          disabled={page >= pagination.total_pages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading && !authChecked) {
    return (
      <div className="selection-page">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="selection-page"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="logo-fallback" style={{ marginBottom: '2rem' }}>
          <div className="logo-text">KLONDIKE</div>
          <div className="logo-subtext">ADMIN ACCESS</div>
        </div>
        <div className="premium-card" style={{ maxWidth: '420px', width: '100%' }}>
          <div className="card-header">
            <h3>Admin Dashboard Login</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} style={{ padding: '1.5rem' }}>
            <div
              style={{
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-light)',
                lineHeight: 1.5,
              }}
            >
              Server-backed session login. The password is verified by the backend and stored in an
              HTTP-only cookie instead of `sessionStorage`.
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter admin password"
                className="premium-input"
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
              className="premium-btn"
              style={{ width: '100%' }}
              disabled={authSubmitting}
            >
              {authSubmitting ? 'Logging In...' : 'Login'}
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

  return (
    <div>
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
              <div className="header-field">
                <label>Role:</label>
                <span>{sessionInfo?.role || 'admin'}</span>
              </div>
              {sessionInfo?.username && (
                <div className="header-field">
                  <label>User:</label>
                  <span>{sessionInfo.username}</span>
                </div>
              )}
            </div>
          </div>
          <div className="header-nav">
            <button className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              History
            </button>
            <button className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              Reports
            </button>
            <button className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              Orders
            </button>
            <button className={`nav-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
              Audit
            </button>
            <button className="nav-btn" onClick={() => navigate('/')}>
              Operator View
            </button>
            <button className="nav-btn" onClick={handleLogout} style={{ color: '#f44336' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-filters">
            <select value={filters.line_id} onChange={(e) => handleFilterChange('line_id', e.target.value)}>
              <option value="">All Lines</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>{line.display_name}</option>
              ))}
            </select>
            <select value={filters.sku_id} onChange={(e) => handleFilterChange('sku_id', e.target.value)}>
              <option value="">All SKUs</option>
              {skus.map((sku) => (
                <option key={sku.id} value={sku.id}>{sku.product_name} ({sku.product_code})</option>
              ))}
            </select>
            <select value={filters.shift} onChange={(e) => handleFilterChange('shift', e.target.value)}>
              <option value="">All Shifts</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="D">Shift D</option>
            </select>
            <input type="date" value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
            <input type="date" value={filters.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
            <button className="nav-btn" onClick={applyFilters}>
              Apply Filters
            </button>
          </div>
          <div className="export-btns">
            <button className="export-btn" onClick={handleExportCsv}>Export CSV</button>
            <button className="export-btn" onClick={handleExportExcel}>Export Excel</button>
          </div>
        </div>

        {tabLoading && activeTab !== 'overview' && (
          <div className="premium-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            Loading {activeTab}...
          </div>
        )}

        {activeTab === 'overview' && dashboard && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Measurements</div>
                <div className="stat-value">{dashboard.total_measurements}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Orders</div>
                <div className="stat-value">{dashboard.order_stats?.active || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed Orders</div>
                <div className="stat-value">{dashboard.order_stats?.completed || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Reviewed Orders</div>
                <div className="stat-value">{dashboard.order_stats?.reviewed || 0}</div>
              </div>
            </div>

            <div className="premium-card" style={{ marginBottom: '1.5rem' }}>
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
                      <th>PO#</th>
                      <th>Operator</th>
                      <th>Measurements</th>
                      <th>OOC</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_reports || []).map((report) => {
                      const totalOoc = (report.thickness_out_of_control || 0)
                        + (report.weight_out_of_control || 0)
                        + (report.coating_out_of_control || 0);

                      return (
                        <tr key={report.id}>
                          <td>{report.shift_date}</td>
                          <td>{report.shift}</td>
                          <td>{report.line_name}</td>
                          <td>{report.product_name}</td>
                          <td>{report.po_number || '-'}</td>
                          <td>{report.operator_name}</td>
                          <td>{report.total_measurements}</td>
                          <td style={{ color: totalOoc > 0 ? '#f44336' : '#00c853', fontWeight: 600 }}>
                            {totalOoc}
                          </td>
                          <td>
                            <button className="icon-btn" onClick={() => handleDownloadReportPdf(report.id)}>
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
                    <th>Pump</th>
                    <th>PO#</th>
                    <th>Product</th>
                    <th>Thickness</th>
                    <th>Weight</th>
                    <th>Coating</th>
                    <th>Status</th>
                    <th>Operator</th>
                    <th>Adjustments</th>
                  </tr>
                </thead>
                <tbody>
                  {history && history.data.map((row) => (
                    <tr key={row.id}>
                      <td>{row.shift_date}</td>
                      <td>{formatTime(row.recorded_at)}</td>
                      <td>{row.shift}</td>
                      <td>{row.line_name}</td>
                      <td>#{row.freezer_number}</td>
                      <td>{row.pump_number || 1}</td>
                      <td>{row.po_number || '-'}</td>
                      <td>{row.product_name}</td>
                      <td>{row.thickness_value ? parseFloat(row.thickness_value) : '-'}</td>
                      <td>{row.weight_value ? parseFloat(row.weight_value) : '-'}</td>
                      <td>{row.coating_value ? parseFloat(row.coating_value) : '-'}</td>
                      <td>{row.status_overall || '-'}</td>
                      <td>{row.operator_initials}</td>
                      <td>{row.adjustments || '-'}</td>
                    </tr>
                  ))}
                  {history && history.data.length === 0 && (
                    <tr><td colSpan={14} style={{ textAlign: 'center', padding: '2rem' }}>No data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {history && renderPagination(history.pagination, historyPage, setHistoryPage)}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Shift Reports</h3>
              <span className="timestamp-display">
                {reportsData ? `${reportsData.pagination.total} total reports` : 'Loading...'}
              </span>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Product</th>
                    <th>PO#</th>
                    <th>Lot</th>
                    <th>Operator</th>
                    <th>Supervisor</th>
                    <th>Measurements</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData && reportsData.data.map((report) => (
                    <tr key={report.id}>
                      <td>{report.shift_date}</td>
                      <td>{report.shift}</td>
                      <td>{report.line_name}</td>
                      <td>{report.product_name}</td>
                      <td>{report.po_number || '-'}</td>
                      <td>{report.best_buy_code || '-'}</td>
                      <td>{report.operator_name}</td>
                      <td>{report.supervisor_name || '-'}</td>
                      <td>{report.total_measurements}</td>
                      <td>
                        <button className="icon-btn" onClick={() => handleDownloadReportPdf(report.id)}>
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reportsData && reportsData.data.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>No reports found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {reportsData && renderPagination(reportsData.pagination, reportsPage, setReportsPage)}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Production Orders</h3>
              <span className="timestamp-display">
                {ordersData ? `${ordersData.pagination.total} total orders` : 'Loading...'}
              </span>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Product</th>
                    <th>PO#</th>
                    <th>Lot</th>
                    <th>Status</th>
                    <th>Measurements</th>
                    <th>Reviewed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData && ordersData.data.map((order) => (
                    <tr key={order.id}>
                      <td>{order.shift_date}</td>
                      <td>{order.shift}</td>
                      <td>{order.line_name}</td>
                      <td>{order.product_name}</td>
                      <td>{order.po_number || '-'}</td>
                      <td>{order.best_buy_code}</td>
                      <td>{order.status}</td>
                      <td>{order.measurement_count}</td>
                      <td>{order.reviewed_by || '-'}</td>
                      <td>
                        {order.status === 'completed' ? (
                          <button className="icon-btn" onClick={() => handleReviewOrder(order)}>
                            Review
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                            {order.status === 'reviewed' ? 'Locked' : 'In Progress'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {ordersData && ordersData.data.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>No production orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {ordersData && renderPagination(ordersData.pagination, ordersPage, setOrdersPage)}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Audit Log</h3>
              <span className="timestamp-display">
                {auditData ? `${auditData.pagination.total} entries` : 'Loading...'}
              </span>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Table</th>
                    <th>Record</th>
                    <th>Action</th>
                    <th>By</th>
                    <th>Reason</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData && auditData.data.map((row) => {
                    const changes = [];
                    if (row.old_values) changes.push(`old: ${JSON.stringify(row.old_values)}`);
                    if (row.new_values) changes.push(`new: ${JSON.stringify(row.new_values)}`);

                    return (
                      <tr key={row.id}>
                        <td>{formatDate(row.created_at)} {formatTime(row.created_at)}</td>
                        <td>{row.table_name}</td>
                        <td>{row.record_id}</td>
                        <td>{row.action}</td>
                        <td>{row.changed_by}</td>
                        <td>{row.reason || '-'}</td>
                        <td style={{ maxWidth: '340px', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                          {changes.join('\n') || '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {auditData && auditData.data.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No audit entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {auditData && renderPagination(auditData.pagination, auditPage, setAuditPage)}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
