const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Don't set content-type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  // Handle PDF/binary responses
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

// Retry wrapper with exponential backoff
export async function withRetry(apiCall, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (err) {
      lastError = err;
      // Don't retry 4xx errors (client validation errors)
      if (err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Lines
export const getLines = () => request('/lines');
export const getLine = (id) => request(`/lines/${id}`);

// SKUs
export const getSkus = () => request('/skus');
export const getSku = (id) => request(`/skus/${id}`);
export const lookupSku = (productCode) =>
  request(`/skus/lookup/${encodeURIComponent(productCode)}`);

// Measurements
export const getMeasurements = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/measurements?${query}`);
};
export const getChartData = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/measurements/chart-data?${query}`);
};
export const createMeasurement = (data, files) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && val !== undefined) formData.append(key, val);
    });
    files.forEach(f => formData.append('photos', f));
    return request('/measurements', { method: 'POST', body: formData });
  }
  return request('/measurements', { method: 'POST', body: JSON.stringify(data) });
};
export const updateMeasurement = (id, data) =>
  request(`/measurements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMeasurement = (id) =>
  request(`/measurements/${id}`, { method: 'DELETE' });

// Reports
export const createReport = (data) =>
  request('/reports', { method: 'POST', body: JSON.stringify(data) });
export const getReports = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/reports?${query}`);
};
export const getReport = (id) => request(`/reports/${id}`);
export const getReportPdf = (id) => request(`/reports/${id}/pdf`);
export const getReportCsv = (id) => request(`/reports/${id}/csv`);

// Production Orders
export const createProductionOrder = (data) =>
  request('/production-orders', { method: 'POST', body: JSON.stringify(data) });
export const getActiveOrders = () =>
  request('/production-orders/active');
export const completeProductionOrder = (id) =>
  request(`/production-orders/${id}/complete`, { method: 'PUT' });
export const getFreezerConfig = (orderId) =>
  request(`/production-orders/${orderId}/freezers`);

// Measurements - OOC acknowledgment
export const acknowledgeMeasurement = (id, acknowledged_by) =>
  request(`/measurements/${id}/ack`, { method: 'POST', body: JSON.stringify({ acknowledged_by }) });

// Admin Auth
export const adminLogin = (password) =>
  request('/admin/login', { method: 'POST', body: JSON.stringify({ password }), credentials: 'include' });
export const masterLogin = (username, password) =>
  request('/admin/master-login', { method: 'POST', body: JSON.stringify({ username, password }), credentials: 'include' });
export const adminLogout = () =>
  request('/admin/logout', { method: 'POST', credentials: 'include' });
export const getAdminSession = () =>
  request('/admin/session', { credentials: 'include' });

// Admin
export const getDashboard = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/dashboard?${query}`, { credentials: 'include' });
};
export const getHistory = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/history?${query}`, { credentials: 'include' });
};
export const exportCsv = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/export/csv?${query}`, { credentials: 'include' });
};
export const exportExcel = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/export/excel?${query}`, { credentials: 'include' });
};
export const getAdminReports = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/reports?${query}`, { credentials: 'include' });
};
export const getProductionOrdersAdmin = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/production-orders?${query}`, { credentials: 'include' });
};
export const getProductionOrderDetail = (id) =>
  request(`/admin/production-orders/${id}/detail`, { credentials: 'include' });
export const reviewProductionOrder = (id, reviewed_by) =>
  request(`/admin/production-orders/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ reviewed_by }),
    credentials: 'include',
  });
export const correctMeasurement = (id, data) =>
  request(`/admin/measurements/${id}/correct`, {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  });
export const getBatchCsv = (id) =>
  request(`/admin/production-orders/${id}/csv`, { credentials: 'include' });
export const getAuditLog = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/audit-log?${query}`, { credentials: 'include' });
};

// Master config
export const getMasterSkus = () =>
  request('/admin/master-config/skus', { credentials: 'include' });
export const createMasterSku = (data) =>
  request('/admin/master-config/skus', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  });
export const updateMasterSku = (id, data) =>
  request(`/admin/master-config/skus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  });
export const deactivateMasterSku = (id, confirm_active_orders = false) =>
  request(`/admin/master-config/skus/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ confirm_active_orders }),
    credentials: 'include',
  });
export const reactivateMasterSku = (id) =>
  request(`/admin/master-config/skus/${id}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({}),
    credentials: 'include',
  });
export const getMasterLines = () =>
  request('/admin/master-config/lines', { credentials: 'include' });
export const createMasterLine = (data) =>
  request('/admin/master-config/lines', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  });
export const updateMasterLine = (id, data) =>
  request(`/admin/master-config/lines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  });
export const updateMasterLineFreezers = (id, freezers) =>
  request(`/admin/master-config/lines/${id}/freezers`, {
    method: 'PUT',
    body: JSON.stringify({ freezers }),
    credentials: 'include',
  });
export const updateAdminPassword = (new_password) =>
  request('/admin/master-config/passwords/admin', {
    method: 'PUT',
    body: JSON.stringify({ new_password }),
    credentials: 'include',
  });
export const updateMyPassword = (current_password, new_password) =>
  request('/admin/master-config/passwords/me', {
    method: 'PUT',
    body: JSON.stringify({ current_password, new_password }),
    credentials: 'include',
  });
export const getMasterAccounts = () =>
  request('/admin/master-config/master-accounts', { credentials: 'include' });
export const createMasterAccount = (username, password) =>
  request('/admin/master-config/master-accounts', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
export const deleteMasterAccount = (id) =>
  request(`/admin/master-config/master-accounts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
export const getMasterHealth = () =>
  request('/admin/master-config/health', { credentials: 'include' });
