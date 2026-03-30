import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboard,
  getHistory,
  exportCsv,
  exportExcel,
  getReportPdf,
  getReportCsv,
  getAdminSession,
  adminLogin,
  masterLogin,
  adminLogout,
  getAdminReports,
  getProductionOrdersAdmin,
  getProductionOrderDetail,
  reviewProductionOrder,
  correctMeasurement,
  getAuditLog,
  getBatchCsv,
  getMasterSkus,
  createMasterSku,
  updateMasterSku,
  deactivateMasterSku,
  reactivateMasterSku,
  getMasterLines,
  createMasterLine,
  updateMasterLine,
  updateMasterLineFreezers,
  updateAdminPassword,
  updateMyPassword,
  getMasterAccounts,
  createMasterAccount,
  deleteMasterAccount,
  getMasterHealth,
} from '../utils/api';
import { formatTime, formatDate, downloadText, downloadBlob } from '../utils/helpers';

const INITIAL_FILTERS = {
  line_id: '',
  sku_id: '',
  shift: '',
  date_from: '',
  date_to: '',
};

const CORRECTION_REASON_OPTIONS = [
  { value: 'transcription_error', label: 'Transcription Error' },
  { value: 'wrong_freezer_or_pump', label: 'Wrong Freezer/Pump' },
  { value: 'wrong_operator_or_shift', label: 'Wrong Operator/Shift' },
  { value: 'instrument_error', label: 'Instrument Error' },
  { value: 'approved_rework_adjustment', label: 'Approved Rework Adjustment' },
  { value: 'attachment_fix', label: 'Attachment Fix' },
  { value: 'other', label: 'Other' },
];

const EMPTY_SKU_FORM = {
  id: null,
  product_name: '',
  product_code: '',
  cr_code: '',
  pack_size: '6pk',
  startup_cup_weight_target: '',
  thickness_label: 'Slice Thickness',
  thickness_target: '',
  thickness_lcl: '',
  thickness_lwl: '',
  thickness_uwl: '',
  thickness_ucl: '',
  thickness_unit: 'mm',
  weight_label: 'Slice Weight',
  weight_target: '',
  weight_lcl: '',
  weight_lwl: '',
  weight_uwl: '',
  weight_ucl: '',
  weight_unit: 'grams',
  coating_label: 'Coating Weight',
  coating_target: '',
  coating_lcl: '',
  coating_lwl: '',
  coating_uwl: '',
  coating_ucl: '',
  coating_unit: 'grams',
  sort_order: 999,
  active: true,
};

const EMPTY_LINE_FORM = {
  id: null,
  display_name: '',
  asset_id: '',
  active: true,
  freezers: [{ freezer_number: 1, pump_count: 1, asset_id: '' }],
};

const EMPTY_CORRECTION_FORM = {
  measurementId: null,
  version: '',
  thickness_value: '',
  weight_value: '',
  coating_value: '',
  reason_code: 'transcription_error',
  reason_comment: '',
};

function toEditableValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getStatusColor(status) {
  if (status === 'reviewed') return '#b8860b';
  if (status === 'completed') return '#2e8b57';
  if (status === 'active') return '#1565c0';
  return '#666';
}

function AdminDashboard({ lines, skus, onConfigChanged }) {
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('admin');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [masterCredentials, setMasterCredentials] = useState({ username: '', password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState({ data: [], pagination: null });
  const [reportsData, setReportsData] = useState({ data: [], pagination: null });
  const [ordersData, setOrdersData] = useState({ data: [], pagination: null });
  const [auditData, setAuditData] = useState({ data: [], pagination: null });
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const [masterSkus, setMasterSkus] = useState([]);
  const [masterLines, setMasterLines] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [masterHealth, setMasterHealth] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [historyPage, setHistoryPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [systemLoading, setSystemLoading] = useState(false);

  const [skuForm, setSkuForm] = useState(EMPTY_SKU_FORM);
  const [lineForm, setLineForm] = useState(EMPTY_LINE_FORM);
  const [correctionForm, setCorrectionForm] = useState(EMPTY_CORRECTION_FORM);

  const [adminPasswordForm, setAdminPasswordForm] = useState('');
  const [myPasswordForm, setMyPasswordForm] = useState({ current_password: '', new_password: '' });
  const [newMasterAccount, setNewMasterAccount] = useState({ username: '', password: '' });

  const isMaster = sessionInfo?.role === 'master';

  const resetOrderDetail = () => {
    setSelectedOrderDetail(null);
    setCorrectionForm(EMPTY_CORRECTION_FORM);
  };

  const handleUnauthorized = useCallback(() => {
    setIsAuthenticated(false);
    setSessionInfo(null);
    setDashboard(null);
    setHistory({ data: [], pagination: null });
    setReportsData({ data: [], pagination: null });
    setOrdersData({ data: [], pagination: null });
    setAuditData({ data: [], pagination: null });
    resetOrderDetail();
  }, []);

  const loadDashboard = useCallback(async () => {
    const data = await getDashboard(filters);
    setDashboard(data);
  }, [filters]);

  const loadHistory = useCallback(async () => {
    const params = { ...filters, page: historyPage, per_page: 50 };
    Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });
    const data = await getHistory(params);
    setHistory(data);
  }, [filters, historyPage]);

  const loadReports = useCallback(async () => {
    const params = { ...filters, page: reportsPage, per_page: 50 };
    Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });
    const data = await getAdminReports(params);
    setReportsData(data);
  }, [filters, reportsPage]);

  const loadOrders = useCallback(async () => {
    const params = { ...filters, page: ordersPage, per_page: 50 };
    Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });
    const data = await getProductionOrdersAdmin(params);
    setOrdersData(data);
  }, [filters, ordersPage]);

  const loadAudit = useCallback(async () => {
    const data = await getAuditLog({ page: auditPage, per_page: 50 });
    setAuditData(data);
  }, [auditPage]);

  const loadSystemData = useCallback(async () => {
    if (!isMaster) return;
    setSystemLoading(true);
    try {
      const [skuRows, lineRows, accountRows, health] = await Promise.all([
        getMasterSkus(),
        getMasterLines(),
        getMasterAccounts(),
        getMasterHealth(),
      ]);
      setMasterSkus(skuRows);
      setMasterLines(lineRows);
      setMasterAccounts(accountRows);
      setMasterHealth(health);
    } finally {
      setSystemLoading(false);
    }
  }, [isMaster]);

  const loadOrderDetail = useCallback(async (orderId) => {
    setDetailLoading(true);
    try {
      const detail = await getProductionOrderDetail(orderId);
      setSelectedOrderDetail(detail);
      if (detail.measurements.length > 0) {
        const measurement = detail.measurements[0];
        setCorrectionForm({
          measurementId: measurement.id,
          version: measurement.version,
          thickness_value: toEditableValue(measurement.thickness_value),
          weight_value: toEditableValue(measurement.weight_value),
          coating_value: toEditableValue(measurement.coating_value),
          reason_code: 'transcription_error',
          reason_comment: '',
        });
      } else {
        setCorrectionForm(EMPTY_CORRECTION_FORM);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getAdminSession();
        if (cancelled) return;
        if (session.authenticated) {
          setIsAuthenticated(true);
          setSessionInfo(session);
        } else {
          setIsAuthenticated(false);
        }
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    const delay = ['overview', 'history', 'reports', 'orders'].includes(activeTab) ? 300 : 0;
    const timer = setTimeout(async () => {
      try {
        setTabLoading(true);
        if (activeTab === 'overview') await loadDashboard();
        if (activeTab === 'history') await loadHistory();
        if (activeTab === 'reports') await loadReports();
        if (activeTab === 'orders') await loadOrders();
        if (activeTab === 'audit') await loadAudit();
        if (activeTab === 'system' && isMaster) await loadSystemData();
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          handleUnauthorized();
          return;
        }
        console.error(`Failed to load ${activeTab} tab:`, err);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    filters,
    historyPage,
    reportsPage,
    ordersPage,
    auditPage,
    isAuthenticated,
    isMaster,
    loadAudit,
    loadDashboard,
    loadHistory,
    loadOrders,
    loadReports,
    loadSystemData,
    handleUnauthorized,
  ]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setHistoryPage(1);
    setReportsPage(1);
    setOrdersPage(1);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setPasswordError('');
    try {
      if (authMode === 'admin') {
        await adminLogin(adminPassword);
      } else {
        await masterLogin(masterCredentials.username, masterCredentials.password);
      }
      const session = await getAdminSession();
      setIsAuthenticated(true);
      setSessionInfo(session);
      setAdminPassword('');
      setMasterCredentials({ username: '', password: '' });
      setActiveTab('overview');
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
    setAdminPassword('');
    setMasterCredentials({ username: '', password: '' });
    setPasswordError('');
  };

  const handleExportCsv = async () => {
    const params = { ...filters };
    Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });
    const csvText = await exportCsv(params);
    downloadText(csvText, 'spc-data-export.csv');
  };

  const handleExportExcel = async () => {
    const params = { ...filters };
    Object.keys(params).forEach((key) => { if (!params[key]) delete params[key]; });
    const blob = await exportExcel(params);
    downloadBlob(blob, 'spc-data-export.xlsx');
  };

  const handleDownloadReportPdf = async (reportId) => {
    const blob = await getReportPdf(reportId);
    downloadBlob(blob, `shift-report-${reportId}.pdf`);
  };

  const handleDownloadReportCsv = async (reportId) => {
    const csv = await getReportCsv(reportId);
    downloadText(csv, `shift-report-${reportId}.csv`);
  };

  const handleDownloadBatchCsv = async (orderId) => {
    const csv = await getBatchCsv(orderId);
    downloadText(csv, `production-order-${orderId}.csv`);
  };

  const handleReviewOrder = async (order) => {
    const reviewedBy = window.prompt(`Enter reviewer name for PO ${order.po_number || order.id}`);
    if (!reviewedBy || !reviewedBy.trim()) return;
    await reviewProductionOrder(order.id, reviewedBy.trim());
    await Promise.all([loadOrders(), loadDashboard()]);
    if (selectedOrderDetail?.order?.id === order.id) {
      await loadOrderDetail(order.id);
    }
  };

  const selectMeasurementForCorrection = (measurement) => {
    setCorrectionForm({
      measurementId: measurement.id,
      version: measurement.version,
      thickness_value: toEditableValue(measurement.thickness_value),
      weight_value: toEditableValue(measurement.weight_value),
      coating_value: toEditableValue(measurement.coating_value),
      reason_code: correctionForm.reason_code || 'transcription_error',
      reason_comment: '',
    });
  };

  const handleSubmitCorrection = async (event) => {
    event.preventDefault();
    if (!correctionForm.measurementId) return;
    await correctMeasurement(correctionForm.measurementId, {
      version: correctionForm.version,
      thickness_value: correctionForm.thickness_value === '' ? null : correctionForm.thickness_value,
      weight_value: correctionForm.weight_value === '' ? null : correctionForm.weight_value,
      coating_value: correctionForm.coating_value === '' ? null : correctionForm.coating_value,
      reason_code: correctionForm.reason_code,
      reason_comment: correctionForm.reason_comment,
    });
    if (selectedOrderDetail?.order?.id) {
      await loadOrderDetail(selectedOrderDetail.order.id);
      await Promise.all([loadHistory(), loadAudit(), loadOrders()]);
    }
  };

  const saveSku = async (event) => {
    event.preventDefault();
    const payload = {
      ...skuForm,
      startup_cup_weight_target: skuForm.startup_cup_weight_target === '' ? null : Number(skuForm.startup_cup_weight_target),
      thickness_target: Number(skuForm.thickness_target),
      thickness_lcl: Number(skuForm.thickness_lcl),
      thickness_lwl: Number(skuForm.thickness_lwl),
      thickness_uwl: Number(skuForm.thickness_uwl),
      thickness_ucl: Number(skuForm.thickness_ucl),
      weight_target: Number(skuForm.weight_target),
      weight_lcl: Number(skuForm.weight_lcl),
      weight_lwl: Number(skuForm.weight_lwl),
      weight_uwl: Number(skuForm.weight_uwl),
      weight_ucl: Number(skuForm.weight_ucl),
      coating_target: Number(skuForm.coating_target),
      coating_lcl: Number(skuForm.coating_lcl),
      coating_lwl: Number(skuForm.coating_lwl),
      coating_uwl: Number(skuForm.coating_uwl),
      coating_ucl: Number(skuForm.coating_ucl),
      sort_order: Number(skuForm.sort_order || 999),
    };
    if (skuForm.id) {
      await updateMasterSku(skuForm.id, payload);
    } else {
      await createMasterSku(payload);
    }
    setSkuForm(EMPTY_SKU_FORM);
    await loadSystemData();
    await onConfigChanged?.();
  };

  const toggleSku = async (sku) => {
    if (sku.active) {
      try {
        await deactivateMasterSku(sku.id, false);
      } catch (err) {
        if (err.status === 409) {
          const confirmed = window.confirm(
            `This SKU has ${err.active_order_count} active production order(s). Deactivation only affects future orders. Continue?`
          );
          if (!confirmed) return;
          await deactivateMasterSku(sku.id, true);
        } else {
          throw err;
        }
      }
    } else {
      await reactivateMasterSku(sku.id);
    }
    await loadSystemData();
    await onConfigChanged?.();
  };

  const saveLine = async (event) => {
    event.preventDefault();
    const payload = {
      display_name: lineForm.display_name,
      asset_id: lineForm.asset_id || null,
      active: lineForm.active,
      freezers: lineForm.freezers.map((freezer, index) => ({
        freezer_number: Number(freezer.freezer_number || index + 1),
        pump_count: Number(freezer.pump_count || 1),
        asset_id: freezer.asset_id || null,
      })),
    };
    let saved;
    if (lineForm.id) {
      saved = await updateMasterLine(lineForm.id, payload);
      await updateMasterLineFreezers(lineForm.id, payload.freezers);
    } else {
      saved = await createMasterLine(payload);
    }
    setLineForm(saved ? {
      id: null,
      display_name: '',
      asset_id: '',
      active: true,
      freezers: [{ freezer_number: 1, pump_count: 1, asset_id: '' }],
    } : EMPTY_LINE_FORM);
    await loadSystemData();
    await onConfigChanged?.();
  };

  const saveAdminPassword = async (event) => {
    event.preventDefault();
    if (!adminPasswordForm) return;
    await updateAdminPassword(adminPasswordForm);
    setAdminPasswordForm('');
    window.alert('Admin password updated.');
  };

  const saveMyPassword = async (event) => {
    event.preventDefault();
    await updateMyPassword(myPasswordForm.current_password, myPasswordForm.new_password);
    setMyPasswordForm({ current_password: '', new_password: '' });
    window.alert('Master password updated.');
  };

  const saveMasterAccount = async (event) => {
    event.preventDefault();
    await createMasterAccount(newMasterAccount.username, newMasterAccount.password);
    setNewMasterAccount({ username: '', password: '' });
    await loadSystemData();
  };

  const removeMasterAccount = async (accountId) => {
    const confirmed = window.confirm('Remove this master account?');
    if (!confirmed) return;
    await deleteMasterAccount(accountId);
    await loadSystemData();
  };

  const lineOptions = useMemo(
    () => lines.map((line) => <option key={line.id} value={line.id}>{line.display_name}</option>),
    [lines]
  );
  const skuOptions = useMemo(
    () => skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.product_name} ({sku.product_code})</option>),
    [skus]
  );

  const renderPagination = (pagination, page, setPage) => {
    if (!pagination || pagination.total_pages <= 1) return null;
    return (
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <span>Page {page} of {pagination.total_pages}</span>
        <button disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next</button>
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
        <div className="premium-card" style={{ maxWidth: '460px', width: '100%' }}>
          <div className="card-header">
            <h3>Dashboard Login</h3>
          </div>
          <form onSubmit={handleLogin} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className="icon-btn"
                style={{ flex: 1, borderColor: authMode === 'admin' ? 'var(--accent)' : undefined }}
                onClick={() => setAuthMode('admin')}
              >
                Admin Login
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ flex: 1, borderColor: authMode === 'master' ? 'var(--accent)' : undefined }}
                onClick={() => setAuthMode('master')}
              >
                Master Login
              </button>
            </div>

            {authMode === 'admin' ? (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => { setAdminPassword(event.target.value); setPasswordError(''); }}
                  placeholder="Enter shared admin password"
                  className="premium-input"
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={masterCredentials.username}
                    onChange={(event) => {
                      setMasterCredentials((prev) => ({ ...prev, username: event.target.value }));
                      setPasswordError('');
                    }}
                    placeholder="Master username"
                    className="premium-input"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={masterCredentials.password}
                    onChange={(event) => {
                      setMasterCredentials((prev) => ({ ...prev, password: event.target.value }));
                      setPasswordError('');
                    }}
                    placeholder="Master password"
                    className="premium-input"
                  />
                </div>
              </>
            )}

            {passwordError && (
              <p style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '0.5rem' }}>{passwordError}</p>
            )}

            <button type="submit" className="premium-btn" disabled={authSubmitting}>
              {authSubmitting ? 'Logging In...' : 'Login'}
            </button>
            <button
              type="button"
              className="icon-btn"
              style={{ width: '100%', marginTop: '0.75rem' }}
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
                <label>Role</label>
                <span>{sessionInfo?.role || 'admin'}</span>
              </div>
              {sessionInfo?.username && (
                <div className="header-field">
                  <label>User</label>
                  <span>{sessionInfo.username}</span>
                </div>
              )}
            </div>
          </div>
          <div className="header-nav">
            {['overview', 'orders', 'history', 'reports', 'audit', ...(isMaster ? ['system'] : [])].map((tab) => (
              <button
                key={tab}
                className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' ? 'Overview' :
                  tab === 'orders' ? 'Production Orders' :
                  tab === 'history' ? 'History' :
                  tab === 'reports' ? 'Shift Reports' :
                  tab === 'audit' ? 'Audit Log' : 'System Config'}
              </button>
            ))}
            <button className="nav-btn" onClick={() => navigate('/')}>Operator View</button>
            <button className="nav-btn" style={{ color: '#f44336' }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {activeTab !== 'audit' && activeTab !== 'system' && (
        <div className="admin-header">
          <div className="admin-filters">
            <select value={filters.line_id} onChange={(event) => handleFilterChange('line_id', event.target.value)}>
              <option value="">All Lines</option>
              {lineOptions}
            </select>
            <select value={filters.sku_id} onChange={(event) => handleFilterChange('sku_id', event.target.value)}>
              <option value="">All SKUs</option>
              {skuOptions}
            </select>
            <select value={filters.shift} onChange={(event) => handleFilterChange('shift', event.target.value)}>
              <option value="">All Shifts</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="D">Shift D</option>
            </select>
            <input type="date" value={filters.date_from} onChange={(event) => handleFilterChange('date_from', event.target.value)} />
            <input type="date" value={filters.date_to} onChange={(event) => handleFilterChange('date_to', event.target.value)} />
            <button className="record-btn" onClick={handleExportCsv}>Export CSV</button>
            <button className="back-btn" onClick={handleExportExcel}>Export Excel</button>
          </div>
        </div>
      )}

      <div className="admin-content">
        {tabLoading && (
          <div style={{ padding: '1rem', color: 'var(--text-light)' }}>Loading {activeTab}...</div>
        )}

        {activeTab === 'overview' && dashboard && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Measurements</div>
                <div className="stat-value">{dashboard.total_measurements || 0}</div>
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
                      <th>PO#</th>
                      <th>Operator</th>
                      <th>Measurements</th>
                      <th>PDF</th>
                      <th>CSV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_reports || []).map((report) => (
                      <tr key={report.id}>
                        <td>{report.shift_date}</td>
                        <td>{report.shift}</td>
                        <td>{report.line_name}</td>
                        <td>{report.product_name}</td>
                        <td>{report.po_number || '-'}</td>
                        <td>{report.operator_name}</td>
                        <td>{report.total_measurements}</td>
                        <td><button className="icon-btn" onClick={() => handleDownloadReportPdf(report.id)}>PDF</button></td>
                        <td><button className="icon-btn" onClick={() => handleDownloadReportCsv(report.id)}>CSV</button></td>
                      </tr>
                    ))}
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
              <span className="timestamp-display">{history.pagination?.total || 0} total records</span>
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
                  {history.data.map((row) => (
                    <tr key={row.id}>
                      <td>{row.shift_date}</td>
                      <td>{formatTime(row.recorded_at)}</td>
                      <td>{row.shift}</td>
                      <td>{row.line_name}</td>
                      <td>{row.freezer_number}</td>
                      <td>{row.pump_number || 1}</td>
                      <td>{row.po_number || '-'}</td>
                      <td>{row.product_name}</td>
                      <td>{row.thickness_value ?? '-'}</td>
                      <td>{row.weight_value ?? '-'}</td>
                      <td>{row.coating_value ?? '-'}</td>
                      <td>{row.status_overall || '-'}</td>
                      <td>{row.operator_initials}</td>
                      <td>{row.adjustments || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(history.pagination, historyPage, setHistoryPage)}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Shift Reports</h3>
              <span className="timestamp-display">{reportsData.pagination?.total || 0} total reports</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
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
                    <th>CSV</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData.data.map((report) => (
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
                      <td><button className="icon-btn" onClick={() => handleDownloadReportPdf(report.id)}>PDF</button></td>
                      <td><button className="icon-btn" onClick={() => handleDownloadReportCsv(report.id)}>CSV</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(reportsData.pagination, reportsPage, setReportsPage)}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Production Orders</h3>
              <span className="timestamp-display">{ordersData.pagination?.total || 0} total orders</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO#</th>
                    <th>Line</th>
                    <th>Product</th>
                    <th>Shift</th>
                    <th>Date</th>
                    <th>Best Buy Code</th>
                    <th>Status</th>
                    <th># Measurements</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.data.map((order) => (
                    <tr key={order.id} onClick={() => loadOrderDetail(order.id)} style={{ cursor: 'pointer' }}>
                      <td>{order.po_number || '-'}</td>
                      <td>{order.line_name}</td>
                      <td>{order.product_name}</td>
                      <td>{order.shift}</td>
                      <td>{order.shift_date}</td>
                      <td>{order.best_buy_code}</td>
                      <td style={{ color: getStatusColor(order.status), fontWeight: 700 }}>{order.status}</td>
                      <td>{order.measurement_count}</td>
                      <td>
                        {order.status === 'completed' ? (
                          <button
                            className="icon-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleReviewOrder(order);
                            }}
                          >
                            Review
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>
                            {order.status === 'reviewed' ? 'Locked' : 'Open'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(ordersData.pagination, ordersPage, setOrdersPage)}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="premium-card">
            <div className="card-header">
              <h3>Audit Log</h3>
              <span className="timestamp-display">{auditData.pagination?.total || 0} entries</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
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
                  {auditData.data.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)} {formatTime(row.created_at)}</td>
                      <td>{row.table_name}</td>
                      <td>{row.record_id}</td>
                      <td>{row.action}</td>
                      <td>{row.changed_by}</td>
                      <td>{row.reason || '-'}</td>
                      <td style={{ maxWidth: '340px', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                        {[row.old_values ? `old: ${JSON.stringify(row.old_values)}` : null, row.new_values ? `new: ${JSON.stringify(row.new_values)}` : null].filter(Boolean).join('\n') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(auditData.pagination, auditPage, setAuditPage)}
          </div>
        )}

        {activeTab === 'system' && isMaster && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="premium-card" style={{ padding: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>SKU Management</h3>
              {systemLoading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Code</th>
                          <th>CR</th>
                          <th>Sort</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterSkus.map((sku) => (
                          <tr key={sku.id}>
                            <td>{sku.product_name}</td>
                            <td>{sku.product_code}</td>
                            <td>{sku.cr_code || '-'}</td>
                            <td>{sku.sort_order}</td>
                            <td>{sku.active ? 'Active' : 'Inactive'}</td>
                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="icon-btn" onClick={() => setSkuForm({ ...EMPTY_SKU_FORM, ...sku })}>Edit</button>
                              <button className="icon-btn" onClick={() => toggleSku(sku)}>{sku.active ? 'Deactivate' : 'Reactivate'}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <form onSubmit={saveSku} style={{ display: 'grid', gap: '0.6rem' }}>
                    <h4>{skuForm.id ? 'Edit SKU' : 'Add SKU'}</h4>
                    {['product_name', 'product_code', 'cr_code', 'pack_size', 'startup_cup_weight_target', 'sort_order'].map((field) => (
                      <input
                        key={field}
                        className="premium-input"
                        placeholder={field}
                        value={skuForm[field] ?? ''}
                        onChange={(event) => setSkuForm((prev) => ({ ...prev, [field]: event.target.value }))}
                      />
                    ))}
                    {[
                      ['thickness', 'Thickness'],
                      ['weight', 'Weight'],
                      ['coating', 'Coating'],
                    ].map(([prefix, label]) => (
                      <div key={prefix} style={{ display: 'grid', gap: '0.4rem' }}>
                        <strong>{label}</strong>
                        {['label', 'target', 'lcl', 'lwl', 'uwl', 'ucl', 'unit'].map((suffix) => (
                          <input
                            key={`${prefix}_${suffix}`}
                            className="premium-input"
                            placeholder={`${label} ${suffix.toUpperCase()}`}
                            value={skuForm[`${prefix}_${suffix}`] ?? ''}
                            onChange={(event) => setSkuForm((prev) => ({ ...prev, [`${prefix}_${suffix}`]: event.target.value }))}
                          />
                        ))}
                      </div>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={skuForm.active}
                        onChange={(event) => setSkuForm((prev) => ({ ...prev, active: event.target.checked }))}
                      />
                      Active
                    </label>
                    <button type="submit" className="premium-btn">{skuForm.id ? 'Save SKU' : 'Create SKU'}</button>
                    <button type="button" className="icon-btn" onClick={() => setSkuForm(EMPTY_SKU_FORM)}>Clear</button>
                  </form>
                </div>
              )}
            </div>

            <div className="premium-card" style={{ padding: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Line Management</h3>
              {systemLoading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Line</th>
                          <th>Asset ID</th>
                          <th>Freezers</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterLines.map((line) => (
                          <tr key={line.id}>
                            <td>{line.display_name}</td>
                            <td>{line.asset_id || '-'}</td>
                            <td>{(line.freezers || []).map((freezer) => `#${freezer.freezer_number} (${freezer.pump_count} pump${freezer.pump_count > 1 ? 's' : ''})`).join(', ')}</td>
                            <td>{line.active ? 'Active' : 'Inactive'}</td>
                            <td><button className="icon-btn" onClick={() => setLineForm({
                              id: line.id,
                              display_name: line.display_name,
                              asset_id: line.asset_id || '',
                              active: line.active !== false,
                              freezers: (line.freezers || []).map((freezer) => ({
                                freezer_number: freezer.freezer_number,
                                pump_count: freezer.pump_count,
                                asset_id: freezer.asset_id || '',
                              })),
                            })}>Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <form onSubmit={saveLine} style={{ display: 'grid', gap: '0.6rem' }}>
                    <h4>{lineForm.id ? 'Edit Line' : 'Add Line'}</h4>
                    <input
                      className="premium-input"
                      placeholder="Display Name"
                      value={lineForm.display_name}
                      onChange={(event) => setLineForm((prev) => ({ ...prev, display_name: event.target.value }))}
                    />
                    <input
                      className="premium-input"
                      placeholder="Asset ID (optional)"
                      value={lineForm.asset_id}
                      onChange={(event) => setLineForm((prev) => ({ ...prev, asset_id: event.target.value }))}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={lineForm.active}
                        onChange={(event) => setLineForm((prev) => ({ ...prev, active: event.target.checked }))}
                      />
                      Active
                    </label>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <strong>Freezers</strong>
                      {lineForm.freezers.map((freezer, index) => (
                        <div key={`${freezer.freezer_number}-${index}`} style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 1fr auto', gap: '0.4rem' }}>
                          <input
                            className="premium-input"
                            placeholder="Freezer #"
                            value={freezer.freezer_number}
                            onChange={(event) => setLineForm((prev) => {
                              const next = [...prev.freezers];
                              next[index] = { ...next[index], freezer_number: event.target.value };
                              return { ...prev, freezers: next };
                            })}
                          />
                          <input
                            className="premium-input"
                            placeholder="Pump Count"
                            value={freezer.pump_count}
                            onChange={(event) => setLineForm((prev) => {
                              const next = [...prev.freezers];
                              next[index] = { ...next[index], pump_count: event.target.value };
                              return { ...prev, freezers: next };
                            })}
                          />
                          <input
                            className="premium-input"
                            placeholder="Freezer Asset ID"
                            value={freezer.asset_id}
                            onChange={(event) => setLineForm((prev) => {
                              const next = [...prev.freezers];
                              next[index] = { ...next[index], asset_id: event.target.value };
                              return { ...prev, freezers: next };
                            })}
                          />
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setLineForm((prev) => ({
                              ...prev,
                              freezers: prev.freezers.filter((_, freezerIndex) => freezerIndex !== index),
                            }))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setLineForm((prev) => ({
                          ...prev,
                          freezers: [...prev.freezers, { freezer_number: prev.freezers.length + 1, pump_count: 1, asset_id: '' }],
                        }))}
                      >
                        Add Freezer
                      </button>
                    </div>
                    <button type="submit" className="premium-btn">{lineForm.id ? 'Save Line' : 'Create Line'}</button>
                    <button type="button" className="icon-btn" onClick={() => setLineForm(EMPTY_LINE_FORM)}>Clear</button>
                  </form>
                </div>
              )}
            </div>

            <div className="premium-card" style={{ padding: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Passwords and Master Accounts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <form onSubmit={saveAdminPassword} style={{ display: 'grid', gap: '0.6rem' }}>
                  <h4>Change Admin Password</h4>
                  <input className="premium-input" type="password" value={adminPasswordForm} onChange={(event) => setAdminPasswordForm(event.target.value)} placeholder="New admin password" />
                  <button type="submit" className="premium-btn">Update Admin Password</button>
                </form>
                <form onSubmit={saveMyPassword} style={{ display: 'grid', gap: '0.6rem' }}>
                  <h4>Change My Password</h4>
                  <input className="premium-input" type="password" value={myPasswordForm.current_password} onChange={(event) => setMyPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))} placeholder="Current password" />
                  <input className="premium-input" type="password" value={myPasswordForm.new_password} onChange={(event) => setMyPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))} placeholder="New password" />
                  <button type="submit" className="premium-btn">Update My Password</button>
                </form>
                <form onSubmit={saveMasterAccount} style={{ display: 'grid', gap: '0.6rem' }}>
                  <h4>Add Master Account</h4>
                  <input className="premium-input" value={newMasterAccount.username} onChange={(event) => setNewMasterAccount((prev) => ({ ...prev, username: event.target.value }))} placeholder="Username" />
                  <input className="premium-input" type="password" value={newMasterAccount.password} onChange={(event) => setNewMasterAccount((prev) => ({ ...prev, password: event.target.value }))} placeholder="Password" />
                  <button type="submit" className="premium-btn">Create Master Account</button>
                </form>
              </div>
              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.username}</td>
                        <td>{formatDate(account.created_at)}</td>
                        <td><button className="icon-btn" onClick={() => removeMasterAccount(account.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="premium-card" style={{ padding: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>System Health</h3>
              {masterHealth ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
                  <div className="stat-card">
                    <div className="stat-label">DB Status</div>
                    <div className="stat-value">{masterHealth.db?.status || '-'}</div>
                    <div>{masterHealth.db?.latency_ms ?? '-'} ms</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">App Version</div>
                    <div className="stat-value">{masterHealth.app_version || 'dev'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Last Backup</div>
                    <div style={{ fontSize: '0.9rem' }}>{masterHealth.last_backup?.created_at ? formatDate(masterHealth.last_backup.created_at) : 'None'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Disk</div>
                    <div style={{ fontSize: '0.9rem' }}>
                      Data: {masterHealth.disk?.data?.free_bytes ?? '-'} free
                      <br />
                      Backups: {masterHealth.disk?.backups?.free_bytes ?? '-'} free
                    </div>
                  </div>
                  <div className="premium-card" style={{ gridColumn: '1 / -1', padding: '1rem' }}>
                    <h4>Row Counts</h4>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(masterHealth.counts || {}, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <p>No health data loaded.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {(selectedOrderDetail || detailLoading) && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="premium-card" style={{ width: 'min(1100px, 95vw)', maxHeight: '90vh', overflow: 'auto', padding: '1rem' }}>
            <div className="card-header">
              <h3>Production Order Detail</h3>
              <button className="icon-btn" onClick={resetOrderDetail}>Close</button>
            </div>
            {detailLoading || !selectedOrderDetail ? (
              <div style={{ padding: '1rem' }}>Loading batch detail...</div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="premium-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div><strong>PO#:</strong> {selectedOrderDetail.order.po_number || '-'}</div>
                      <div><strong>Line:</strong> {selectedOrderDetail.order.line_name}</div>
                      <div><strong>Product:</strong> {selectedOrderDetail.order.product_name} ({selectedOrderDetail.order.product_code})</div>
                      <div><strong>Shift/Date:</strong> {selectedOrderDetail.order.shift} / {selectedOrderDetail.order.shift_date}</div>
                      <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedOrderDetail.order.status) }}>{selectedOrderDetail.order.status}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {selectedOrderDetail.report && (
                        <>
                          <button className="icon-btn" onClick={() => handleDownloadReportPdf(selectedOrderDetail.report.id)}>PDF</button>
                          <button className="icon-btn" onClick={() => handleDownloadReportCsv(selectedOrderDetail.report.id)}>CSV</button>
                        </>
                      )}
                      {!selectedOrderDetail.report && (
                        <button className="icon-btn" onClick={() => handleDownloadBatchCsv(selectedOrderDetail.order.id)}>CSV</button>
                      )}
                      {selectedOrderDetail.order.status === 'completed' && (
                        <button className="icon-btn" onClick={() => handleReviewOrder(selectedOrderDetail.order)}>Review & Lock</button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="premium-card" style={{ padding: '1rem', overflowX: 'auto' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Readings</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Freezer</th>
                          <th>Pump</th>
                          <th>Time</th>
                          <th>Thickness</th>
                          <th>Weight</th>
                          <th>Coating</th>
                          <th>Status</th>
                          <th>Operator</th>
                          <th>Lead</th>
                          <th>Adjustments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrderDetail.measurements.map((measurement) => (
                          <tr key={measurement.id} onClick={() => selectMeasurementForCorrection(measurement)} style={{ cursor: 'pointer' }}>
                            <td>{measurement.freezer_number}</td>
                            <td>{measurement.pump_number || 1}</td>
                            <td>{formatTime(measurement.recorded_at)}</td>
                            <td>{measurement.thickness_value ?? '-'}</td>
                            <td>{measurement.weight_value ?? '-'}</td>
                            <td>{measurement.coating_value ?? '-'}</td>
                            <td>{measurement.status_overall || '-'}</td>
                            <td>{measurement.operator_initials}</td>
                            <td>{measurement.lead_initials || '-'}</td>
                            <td>{measurement.adjustments || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="premium-card" style={{ padding: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Correction</h4>
                    <form onSubmit={handleSubmitCorrection} style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        Select a measurement row, then submit an audited correction.
                      </div>
                      <input className="premium-input" value={correctionForm.measurementId || ''} placeholder="Measurement ID" readOnly />
                      <input className="premium-input" value={correctionForm.thickness_value} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, thickness_value: event.target.value }))} placeholder="Thickness" />
                      <input className="premium-input" value={correctionForm.weight_value} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, weight_value: event.target.value }))} placeholder="Weight" />
                      <input className="premium-input" value={correctionForm.coating_value} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, coating_value: event.target.value }))} placeholder="Coating" />
                      <select className="premium-input" value={correctionForm.reason_code} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, reason_code: event.target.value }))}>
                        {CORRECTION_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <textarea className="premium-input" value={correctionForm.reason_comment} onChange={(event) => setCorrectionForm((prev) => ({ ...prev, reason_comment: event.target.value }))} placeholder="Reason comment" rows={4} />
                      <button type="submit" className="premium-btn" disabled={!correctionForm.measurementId}>Submit Correction</button>
                    </form>
                  </div>
                </div>

                <div className="premium-card" style={{ padding: '1rem', overflowX: 'auto' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Correction / Audit Log</h4>
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
                      {selectedOrderDetail.audit.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.created_at)} {formatTime(entry.created_at)}</td>
                          <td>{entry.table_name}</td>
                          <td>{entry.record_id}</td>
                          <td>{entry.action}</td>
                          <td>{entry.changed_by}</td>
                          <td>{entry.reason || '-'}</td>
                          <td style={{ maxWidth: '340px', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                            {[entry.old_values ? `old: ${JSON.stringify(entry.old_values)}` : null, entry.new_values ? `new: ${JSON.stringify(entry.new_values)}` : null].filter(Boolean).join('\n') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
