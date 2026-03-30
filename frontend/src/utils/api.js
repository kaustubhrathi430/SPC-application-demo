import { demoApi } from './mockData';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const IS_DEMO = process.env.REACT_APP_DEMO_MODE === 'true';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || `HTTP ${response.status}`);
    err.status = response.status;
    Object.assign(err, error);
    throw err;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob();
  }
  if (contentType && contentType.includes('spreadsheet')) {
    return response.blob();
  }
  if (contentType && contentType.includes('text/csv')) {
    return response.text();
  }

  return response.json();
}

function whenDemo(demoCall, liveCall) {
  return IS_DEMO ? demoCall() : liveCall();
}

export async function withRetry(apiCall, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await apiCall();
    } catch (err) {
      lastError = err;
      if (err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const getLines = () =>
  whenDemo(() => demoApi.getLines(), () => request('/lines'));
export const getLine = (id) =>
  whenDemo(async () => (await demoApi.getLines()).find((line) => String(line.id) === String(id)), () => request(`/lines/${id}`));

export const getSkus = () =>
  whenDemo(() => demoApi.getSkus(), () => request('/skus'));
export const getSku = (id) =>
  whenDemo(async () => (await demoApi.getMasterSkus()).find((sku) => String(sku.id) === String(id)), () => request(`/skus/${id}`));
export const lookupSku = (productCode) =>
  whenDemo(async () => {
    const skus = await demoApi.getSkus();
    const exact = skus.filter((sku) => sku.product_code === productCode);
    if (exact.length === 1) {
      return { exact_match: true, results: exact };
    }
    return {
      exact_match: false,
      results: skus.filter((sku) => sku.product_code.startsWith(productCode)),
    };
  }, () => request(`/skus/lookup/${encodeURIComponent(productCode)}`));

export const getMeasurements = (params) =>
  whenDemo(() => demoApi.getMeasurements(params), () => request(`/measurements?${new URLSearchParams(params).toString()}`));
export const getChartData = (params) =>
  whenDemo(() => demoApi.getChartData(params), () => request(`/measurements/chart-data?${new URLSearchParams(params).toString()}`));
export const createMeasurement = (data, files) =>
  whenDemo(() => demoApi.createMeasurement(data, files), () => {
    if (files && files.length > 0) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) formData.append(key, value);
      });
      files.forEach((file) => formData.append('photos', file));
      return request('/measurements', { method: 'POST', body: formData });
    }
    return request('/measurements', { method: 'POST', body: JSON.stringify(data) });
  });
export const updateMeasurement = (id, data) =>
  whenDemo(() => Promise.reject(new Error('Operator edit is disabled in demo mode too.')), () => request(`/measurements/${id}`, { method: 'PUT', body: JSON.stringify(data) }));
export const deleteMeasurement = (id) =>
  whenDemo(() => Promise.reject(new Error('Operator delete is disabled in demo mode too.')), () => request(`/measurements/${id}`, { method: 'DELETE' }));

export const createReport = (data) =>
  whenDemo(() => demoApi.createReport(data), () => request('/reports', { method: 'POST', body: JSON.stringify(data) }));
export const getReports = (params) =>
  whenDemo(() => demoApi.getReports(params), () => request(`/reports?${new URLSearchParams(params).toString()}`));
export const getReport = (id) =>
  whenDemo(async () => (await demoApi.getReports({})).find((report) => String(report.id) === String(id)), () => request(`/reports/${id}`));
export const getReportPdf = (id) =>
  whenDemo(() => demoApi.getReportPdf(id), () => request(`/reports/${id}/pdf`));
export const getReportCsv = (id) =>
  whenDemo(() => demoApi.getReportCsv(id), () => request(`/reports/${id}/csv`));

export const createProductionOrder = (data) =>
  whenDemo(() => demoApi.createProductionOrder(data), () => request('/production-orders', { method: 'POST', body: JSON.stringify(data) }));
export const getActiveOrders = () =>
  whenDemo(() => demoApi.getActiveOrders(), () => request('/production-orders/active'));
export const completeProductionOrder = (id) =>
  whenDemo(() => demoApi.completeProductionOrder(id), () => request(`/production-orders/${id}/complete`, { method: 'PUT' }));
export const getFreezerConfig = (orderId) =>
  whenDemo(() => demoApi.getFreezerConfig(orderId), () => request(`/production-orders/${orderId}/freezers`));

export const acknowledgeMeasurement = (id, acknowledged_by) =>
  whenDemo(() => demoApi.acknowledgeMeasurement(id, acknowledged_by), () => request(`/measurements/${id}/ack`, {
    method: 'POST',
    body: JSON.stringify({ acknowledged_by }),
  }));

export const adminLogin = (password) =>
  whenDemo(() => demoApi.adminLogin(password), () => request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
    credentials: 'include',
  }));
export const masterLogin = (username, password) =>
  whenDemo(() => demoApi.masterLogin(username, password), () => request('/admin/master-login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  }));
export const adminLogout = () =>
  whenDemo(() => demoApi.adminLogout(), () => request('/admin/logout', {
    method: 'POST',
    credentials: 'include',
  }));
export const getAdminSession = () =>
  whenDemo(() => demoApi.getAdminSession(), () => request('/admin/session', { credentials: 'include' }));

export const getDashboard = (params) =>
  whenDemo(() => demoApi.getDashboard(params), () => request(`/admin/dashboard?${params ? new URLSearchParams(params).toString() : ''}`, { credentials: 'include' }));
export const getHistory = (params) =>
  whenDemo(() => demoApi.getHistory(params), () => request(`/admin/history?${new URLSearchParams(params).toString()}`, { credentials: 'include' }));
export const exportCsv = (params) =>
  whenDemo(() => demoApi.exportCsv(params), () => request(`/admin/export/csv?${params ? new URLSearchParams(params).toString() : ''}`, { credentials: 'include' }));
export const exportExcel = (params) =>
  whenDemo(() => demoApi.exportExcel(params), () => request(`/admin/export/excel?${params ? new URLSearchParams(params).toString() : ''}`, { credentials: 'include' }));
export const getAdminReports = (params) =>
  whenDemo(() => demoApi.getAdminReports(params), () => request(`/admin/reports?${new URLSearchParams(params).toString()}`, { credentials: 'include' }));
export const getProductionOrdersAdmin = (params) =>
  whenDemo(() => demoApi.getProductionOrdersAdmin(params), () => request(`/admin/production-orders?${new URLSearchParams(params).toString()}`, { credentials: 'include' }));
export const getProductionOrderDetail = (id) =>
  whenDemo(() => demoApi.getProductionOrderDetail(id), () => request(`/admin/production-orders/${id}/detail`, { credentials: 'include' }));
export const reviewProductionOrder = (id, reviewed_by) =>
  whenDemo(() => demoApi.reviewProductionOrder(id, reviewed_by), () => request(`/admin/production-orders/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ reviewed_by }),
    credentials: 'include',
  }));
export const correctMeasurement = (id, data) =>
  whenDemo(() => demoApi.correctMeasurement(id, data), () => request(`/admin/measurements/${id}/correct`, {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  }));
export const getBatchCsv = (id) =>
  whenDemo(() => demoApi.getBatchCsv(id), () => request(`/admin/production-orders/${id}/csv`, { credentials: 'include' }));
export const getAuditLog = (params) =>
  whenDemo(() => demoApi.getAuditLog(params), () => request(`/admin/audit-log?${new URLSearchParams(params).toString()}`, { credentials: 'include' }));

export const getMasterSkus = () =>
  whenDemo(() => demoApi.getMasterSkus(), () => request('/admin/master-config/skus', { credentials: 'include' }));
export const createMasterSku = (data) =>
  whenDemo(() => demoApi.createMasterSku(data), () => request('/admin/master-config/skus', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  }));
export const updateMasterSku = (id, data) =>
  whenDemo(() => demoApi.updateMasterSku(id, data), () => request(`/admin/master-config/skus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  }));
export const deactivateMasterSku = (id, confirm_active_orders = false) =>
  whenDemo(() => demoApi.deactivateMasterSku(id, confirm_active_orders), () => request(`/admin/master-config/skus/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ confirm_active_orders }),
    credentials: 'include',
  }));
export const reactivateMasterSku = (id) =>
  whenDemo(() => demoApi.reactivateMasterSku(id), () => request(`/admin/master-config/skus/${id}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({}),
    credentials: 'include',
  }));
export const getMasterLines = () =>
  whenDemo(() => demoApi.getMasterLines(), () => request('/admin/master-config/lines', { credentials: 'include' }));
export const createMasterLine = (data) =>
  whenDemo(() => demoApi.createMasterLine(data), () => request('/admin/master-config/lines', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  }));
export const updateMasterLine = (id, data) =>
  whenDemo(() => demoApi.updateMasterLine(id, data), () => request(`/admin/master-config/lines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  }));
export const updateMasterLineFreezers = (id, freezers) =>
  whenDemo(() => demoApi.updateMasterLineFreezers(id, freezers), () => request(`/admin/master-config/lines/${id}/freezers`, {
    method: 'PUT',
    body: JSON.stringify({ freezers }),
    credentials: 'include',
  }));
export const updateAdminPassword = (new_password) =>
  whenDemo(() => demoApi.updateAdminPassword(new_password), () => request('/admin/master-config/passwords/admin', {
    method: 'PUT',
    body: JSON.stringify({ new_password }),
    credentials: 'include',
  }));
export const updateMyPassword = (current_password, new_password) =>
  whenDemo(() => demoApi.updateMyPassword(current_password, new_password), () => request('/admin/master-config/passwords/me', {
    method: 'PUT',
    body: JSON.stringify({ current_password, new_password }),
    credentials: 'include',
  }));
export const getMasterAccounts = () =>
  whenDemo(() => demoApi.getMasterAccounts(), () => request('/admin/master-config/master-accounts', { credentials: 'include' }));
export const createMasterAccount = (username, password) =>
  whenDemo(() => demoApi.createMasterAccount(username, password), () => request('/admin/master-config/master-accounts', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  }));
export const deleteMasterAccount = (id) =>
  whenDemo(() => demoApi.deleteMasterAccount(id), () => request(`/admin/master-config/master-accounts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  }));
export const getMasterHealth = () =>
  whenDemo(() => demoApi.getMasterHealth(), () => request('/admin/master-config/health', { credentials: 'include' }));
