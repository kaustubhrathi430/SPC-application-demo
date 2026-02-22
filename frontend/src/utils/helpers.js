// Determine current shift based on time
export function getCurrentShift() {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'Day' : 'Night';
}

// Get today's shift date (accounts for night shift crossing midnight)
export function getShiftDate() {
  const now = new Date();
  const hour = now.getHours();
  const d = new Date(now);
  if (hour < 6) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
}

// Format time from Date or ISO string
export function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Format date
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Determine measurement status relative to control limits
export function getStatus(value, limits) {
  const v = parseFloat(value);
  if (v < limits.lcl || v > limits.ucl) return 'danger';
  if (v < limits.lwl || v > limits.uwl) return 'warning';
  return 'normal';
}

// Get status color for chart points
export function getStatusColor(value, limits) {
  const status = getStatus(value, limits);
  if (status === 'danger') return '#f44336';
  if (status === 'warning') return '#ff9800';
  return '#00c853';
}

// Download a blob as file
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Download text as file
export function downloadText(text, filename, type = 'text/csv') {
  const blob = new Blob([text], { type });
  downloadBlob(blob, filename);
}
