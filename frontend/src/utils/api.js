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
    throw new Error(error.error || `HTTP ${response.status}`);
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

// Lines
export const getLines = () => request('/lines');
export const getLine = (id) => request(`/lines/${id}`);

// SKUs
export const getSkus = () => request('/skus');
export const getSku = (id) => request(`/skus/${id}`);

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

// Admin
export const getDashboard = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/dashboard?${query}`);
};
export const getHistory = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/history?${query}`);
};
export const exportCsv = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/export/csv?${query}`);
};
export const exportExcel = (params) => {
  const query = params ? new URLSearchParams(params).toString() : '';
  return request(`/admin/export/excel?${query}`);
};
