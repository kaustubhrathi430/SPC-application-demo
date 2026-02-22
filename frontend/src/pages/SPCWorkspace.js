import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SPCChart from '../components/SPCChart';
import {
  getChartData, getMeasurements, createMeasurement,
  updateMeasurement, deleteMeasurement, createReport,
  getReportPdf
} from '../utils/api';
import { getCurrentShift, getShiftDate, formatTime, formatDate, getStatus } from '../utils/helpers';

function SPCWorkspace({ lines, skus }) {
  const { lineId, skuId } = useParams();
  const navigate = useNavigate();

  const line = lines.find(l => String(l.id) === lineId);
  const sku = skus.find(s => String(s.id) === skuId);

  const [activeFreezer, setActiveFreezer] = useState(1);
  const [chartData, setChartData] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [successMsg, setSuccessMsg] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosPreviews, setPhotosPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    operator_initials: '',
    lead_initials: '',
    thickness_value: '',
    weight_value: '',
    coating_value: '',
    adjustments: '',
  });

  // Report form
  const [reportForm, setReportForm] = useState({
    operator_name: '',
    supervisor_name: '',
    notes: '',
  });

  const shift = getCurrentShift();
  const shiftDate = getShiftDate();
  const freezerCount = line ? line.freezer_count : 2;

  const loadData = useCallback(async () => {
    if (!sku || !line) return;
    try {
      const [chart, recent] = await Promise.all([
        getChartData({ sku_id: skuId, line_id: lineId, shift, shift_date: shiftDate }),
        getMeasurements({ sku_id: skuId, line_id: lineId, shift, shift_date: shiftDate, limit: 50 }),
      ]);
      setChartData(chart);
      setRecentEntries(recent);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, [skuId, lineId, shift, shiftDate, sku, line]);

  useEffect(() => { loadData(); }, [loadData]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.operator_initials.trim()) return;

    try {
      if (editingId) {
        await updateMeasurement(editingId, {
          operator_initials: form.operator_initials,
          lead_initials: form.lead_initials || null,
          thickness_value: form.thickness_value || null,
          weight_value: form.weight_value || null,
          coating_value: form.coating_value || null,
          adjustments: form.adjustments || null,
        });
        setEditingId(null);
      } else {
        await createMeasurement({
          sku_id: skuId,
          line_id: lineId,
          freezer_number: activeFreezer,
          operator_initials: form.operator_initials,
          lead_initials: form.lead_initials || null,
          thickness_value: form.thickness_value || null,
          weight_value: form.weight_value || null,
          coating_value: form.coating_value || null,
          adjustments: form.adjustments || null,
        }, photos);
      }

      // Reset form (keep operator initials)
      setForm(prev => ({
        ...prev,
        lead_initials: prev.lead_initials,
        thickness_value: '',
        weight_value: '',
        coating_value: '',
        adjustments: '',
      }));
      setPhotos([]);
      setPhotosPreviews([]);

      setSuccessMsg('Recorded!');
      setTimeout(() => setSuccessMsg(''), 2000);

      await loadData();
    } catch (err) {
      console.error('Failed to record:', err);
      alert('Failed to record measurement. Please try again.');
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      operator_initials: entry.operator_initials || '',
      lead_initials: entry.lead_initials || '',
      thickness_value: entry.thickness_value || '',
      weight_value: entry.weight_value || '',
      coating_value: entry.coating_value || '',
      adjustments: entry.adjustments || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this measurement?')) return;
    try {
      await deleteMeasurement(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotosPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotosPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReport = async () => {
    if (!reportForm.operator_name.trim()) {
      alert('Please enter operator name');
      return;
    }
    try {
      const report = await createReport({
        line_id: lineId,
        sku_id: skuId,
        shift,
        shift_date: shiftDate,
        operator_name: reportForm.operator_name,
        supervisor_name: reportForm.supervisor_name || null,
        notes: reportForm.notes || null,
      });
      setReportGenerated(report);
    } catch (err) {
      console.error('Failed to create report:', err);
      alert('Failed to create shift report.');
    }
  };

  const handleDownloadPdf = async (reportId) => {
    try {
      const blob = await getReportPdf(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  if (!line || !sku) {
    return (
      <div className="selection-page">
        <p>Invalid line or SKU. Please go back and select again.</p>
        <button className="back-btn" onClick={() => navigate('/')}>
          &larr; Back to Lines
        </button>
      </div>
    );
  }

  const thicknessLimits = {
    lcl: parseFloat(sku.thickness_lcl), lwl: parseFloat(sku.thickness_lwl),
    target: parseFloat(sku.thickness_target),
    uwl: parseFloat(sku.thickness_uwl), ucl: parseFloat(sku.thickness_ucl),
  };
  const weightLimits = {
    lcl: parseFloat(sku.weight_lcl), lwl: parseFloat(sku.weight_lwl),
    target: parseFloat(sku.weight_target),
    uwl: parseFloat(sku.weight_uwl), ucl: parseFloat(sku.weight_ucl),
  };
  const coatingLimits = {
    lcl: parseFloat(sku.coating_lcl), lwl: parseFloat(sku.coating_lwl),
    target: parseFloat(sku.coating_target),
    uwl: parseFloat(sku.coating_uwl), ucl: parseFloat(sku.coating_ucl),
  };

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-branding">
          <div className="logo-container">
            <div className="logo-fallback">
              <div className="logo-text" style={{ fontSize: '1.2rem' }}>KLONDIKE</div>
              <div className="logo-subtext">SPC CONTROL CHART</div>
            </div>
          </div>
          <div className="header-info">
            <h1>{sku.product_name}</h1>
            <div className="header-details">
              <div className="header-field">
                <label>Product Code:</label>
                <span>{sku.product_code}</span>
              </div>
              <div className="header-field">
                <label>Line:</label>
                <span>{line.display_name}</span>
              </div>
              <div className={`shift-badge ${shift.toLowerCase()}`}>
                {shift === 'Day' ? '\u2600' : '\u{1F319}'} {shift} Shift
              </div>
              <div className="timestamp-display">{timeStr}</div>
            </div>
          </div>
          <div className="header-nav">
            <button className="nav-btn" onClick={() => navigate(`/line/${lineId}/sku`)}>
              Change SKU
            </button>
            <button className="nav-btn" onClick={() => navigate('/')}>
              Change Line
            </button>
          </div>
        </div>
      </header>

      {/* Freezer Ribbon */}
      <div className="freezer-ribbon">
        {Array.from({ length: freezerCount }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            className={`freezer-tab ${activeFreezer === num ? 'active' : ''}`}
            onClick={() => setActiveFreezer(num)}
          >
            Freezer #{num}
          </button>
        ))}
      </div>

      {/* Success Message */}
      {successMsg && <div className="success-feedback">{successMsg}</div>}

      {/* Main Content */}
      <div className="main-content">
        {/* Left: Form */}
        <div className="form-section">
          {/* Measurement Form */}
          <div className="premium-card form-card">
            <div className="card-header">
              <h3>{editingId ? 'Edit Measurement' : 'New Measurement'}</h3>
              <span className="timestamp-display">Freezer #{activeFreezer}</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Operator Initials *</label>
                <input
                  className="premium-input"
                  type="text"
                  maxLength={10}
                  value={form.operator_initials}
                  onChange={e => handleFormChange('operator_initials', e.target.value)}
                  placeholder="Enter initials"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Lead Initials</label>
                <input
                  className="premium-input"
                  type="text"
                  maxLength={10}
                  value={form.lead_initials}
                  onChange={e => handleFormChange('lead_initials', e.target.value)}
                  placeholder="Lead initials (optional)"
                />
              </div>

              {/* Slice Thickness */}
              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.thickness_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.thickness_target)}</span>
                </div>
                <input
                  className="premium-input"
                  type="number"
                  step="0.01"
                  value={form.thickness_value}
                  onChange={e => handleFormChange('thickness_value', e.target.value)}
                  placeholder={`Enter ${sku.thickness_label.toLowerCase()}`}
                />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.thickness_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.thickness_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.thickness_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.thickness_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.thickness_ucl)}</span>
                </div>
              </div>

              {/* Slice Weight */}
              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.weight_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.weight_target)}</span>
                </div>
                <input
                  className="premium-input"
                  type="number"
                  step="0.01"
                  value={form.weight_value}
                  onChange={e => handleFormChange('weight_value', e.target.value)}
                  placeholder={`Enter ${sku.weight_label.toLowerCase()}`}
                />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.weight_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.weight_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.weight_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.weight_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.weight_ucl)}</span>
                </div>
              </div>

              {/* Coating Weight */}
              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.coating_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.coating_target)}</span>
                </div>
                <input
                  className="premium-input"
                  type="number"
                  step="0.01"
                  value={form.coating_value}
                  onChange={e => handleFormChange('coating_value', e.target.value)}
                  placeholder={`Enter ${sku.coating_label.toLowerCase()}`}
                />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.coating_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.coating_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.coating_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.coating_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.coating_ucl)}</span>
                </div>
              </div>

              {/* Adjustments */}
              <div className="form-group">
                <label>Adjustments</label>
                <input
                  className="premium-input"
                  type="text"
                  value={form.adjustments}
                  onChange={e => handleFormChange('adjustments', e.target.value)}
                  placeholder="Document any adjustments made"
                />
              </div>

              {/* Photo Upload */}
              <div className="form-group">
                <label>Product Photo (Optional)</label>
                <div className="image-upload-container">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="image-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Attach Photo{photos.length > 0 ? ` (${photos.length})` : ''}
                  </button>
                  {photosPreviews.length > 0 && (
                    <div className="image-preview">
                      {photosPreviews.map((src, i) => (
                        <div key={i} className="image-preview-item">
                          <img src={src} alt={`Preview ${i + 1}`} />
                          <button
                            type="button"
                            className="remove-image"
                            onClick={() => removePhoto(i)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="premium-btn">
                {editingId ? 'Update Measurement' : 'Record Measurement'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="premium-btn danger"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      operator_initials: form.operator_initials,
                      lead_initials: form.lead_initials,
                      thickness_value: '', weight_value: '', coating_value: '', adjustments: '',
                    });
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* Recent Entries */}
          <div className="premium-card">
            <div className="card-header">
              <h3>Recent Entries</h3>
              <span className="timestamp-display">{recentEntries.length} entries</span>
            </div>
            <div className="entries-list">
              {recentEntries.length === 0 ? (
                <div className="empty-state">
                  <p>No entries yet for this shift.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Record your first measurement above.
                  </p>
                </div>
              ) : (
                recentEntries.map(entry => (
                  <div key={entry.id} className="entry-item">
                    <div className="entry-header">
                      <div>
                        <div className="entry-time">{formatTime(entry.recorded_at)}</div>
                        <div className="entry-date">
                          {formatDate(entry.recorded_at)} | Freezer #{entry.freezer_number}
                        </div>
                      </div>
                      <div className="entry-actions">
                        <button
                          className="icon-btn"
                          title="Edit"
                          onClick={() => handleEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="icon-btn delete"
                          title="Delete"
                          onClick={() => handleDelete(entry.id)}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                    <div className="entry-data">
                      {entry.thickness_value && (
                        <div className="data-item">
                          <span className="data-label">Thickness</span>
                          <span className={`data-value status-${getStatus(entry.thickness_value, thicknessLimits)}`}>
                            {parseFloat(entry.thickness_value)}
                          </span>
                        </div>
                      )}
                      {entry.weight_value && (
                        <div className="data-item">
                          <span className="data-label">Weight</span>
                          <span className={`data-value status-${getStatus(entry.weight_value, weightLimits)}`}>
                            {parseFloat(entry.weight_value)}
                          </span>
                        </div>
                      )}
                      {entry.coating_value && (
                        <div className="data-item">
                          <span className="data-label">Coating</span>
                          <span className={`data-value status-${getStatus(entry.coating_value, coatingLimits)}`}>
                            {parseFloat(entry.coating_value)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="entry-operator">
                      Op: {entry.operator_initials}
                      {entry.lead_initials ? ` | Lead: ${entry.lead_initials}` : ''}
                      {entry.adjustments ? ` | Adj: ${entry.adjustments}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit Shift Report */}
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <button
              className="premium-btn success"
              onClick={() => setShowReportModal(true)}
            >
              Submit Shift Report
            </button>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="charts-section">
          <SPCChart
            title={sku.thickness_label}
            data={chartData}
            valueKey="thickness_value"
            limits={thicknessLimits}
          />
          <SPCChart
            title={sku.weight_label}
            data={chartData}
            valueKey="weight_value"
            limits={weightLimits}
          />
          <SPCChart
            title={sku.coating_label}
            data={chartData}
            valueKey="coating_value"
            limits={coatingLimits}
          />
        </div>
      </div>

      {/* Shift Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => { setShowReportModal(false); setReportGenerated(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Submit Shift Report</h2>
            {!reportGenerated ? (
              <>
                <p style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <strong>{sku.product_name}</strong> | {line.display_name} | {shift} Shift | {shiftDate}
                </p>
                <div style={{ textAlign: 'left' }}>
                  <div className="form-group">
                    <label>Operator Name *</label>
                    <input
                      className="premium-input"
                      type="text"
                      value={reportForm.operator_name}
                      onChange={e => setReportForm(prev => ({ ...prev, operator_name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Supervisor Name (Sign-off)</label>
                    <input
                      className="premium-input"
                      type="text"
                      value={reportForm.supervisor_name}
                      onChange={e => setReportForm(prev => ({ ...prev, supervisor_name: e.target.value }))}
                      placeholder="Supervisor name for sign-off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="premium-input"
                      rows={3}
                      value={reportForm.notes}
                      onChange={e => setReportForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes for this shift"
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  <button className="confirm-btn success" onClick={handleSubmitReport}>
                    Sign & Submit
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="shift-report" style={{ display: 'block', textAlign: 'left' }}>
                  <h4>Shift Report Generated</h4>
                  <div className="shift-report-content">
                    <p><strong>Product:</strong> {reportGenerated.product_name || sku.product_name}</p>
                    <p><strong>Shift:</strong> {reportGenerated.shift} | <strong>Date:</strong> {reportGenerated.shift_date}</p>
                    <p><strong>Total Measurements:</strong> {reportGenerated.total_measurements}</p>
                    <p><strong>Operator:</strong> {reportGenerated.operator_name}</p>
                    <p><strong>Supervisor:</strong> {reportGenerated.supervisor_name || 'N/A'}</p>
                    <hr style={{ margin: '1rem 0', borderColor: 'var(--border)' }} />
                    <p><strong>Thickness:</strong> Avg {reportGenerated.thickness_avg}, OOC: {reportGenerated.thickness_out_of_control}, Warnings: {reportGenerated.thickness_warnings}</p>
                    <p><strong>Weight:</strong> Avg {reportGenerated.weight_avg}, OOC: {reportGenerated.weight_out_of_control}, Warnings: {reportGenerated.weight_warnings}</p>
                    <p><strong>Coating:</strong> Avg {reportGenerated.coating_avg}, OOC: {reportGenerated.coating_out_of_control}, Warnings: {reportGenerated.coating_warnings}</p>
                  </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '1rem' }}>
                  <button
                    className="cancel-btn"
                    onClick={() => { setShowReportModal(false); setReportGenerated(null); }}
                  >
                    Close
                  </button>
                  <button
                    className="confirm-btn"
                    onClick={() => handleDownloadPdf(reportGenerated.id)}
                  >
                    Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SPCWorkspace;
