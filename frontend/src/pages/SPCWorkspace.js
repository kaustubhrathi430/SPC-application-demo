import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductionOrder } from '../context/ProductionOrderContext';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import SPCChart from '../components/SPCChart';
import {
  getChartData as apiGetChartData, getMeasurements as apiGetMeasurements,
  createMeasurement as apiCreateMeasurement,
  createReport as apiCreateReport, getReportPdf as apiGetReportPdf,
  completeProductionOrder as apiCompleteProductionOrder,
  getFreezerConfig as apiGetFreezerConfig,
  acknowledgeMeasurement as apiAcknowledgeMeasurement,
  withRetry,
} from '../utils/api';
import { demoApi } from '../utils/mockData';
import { formatTime, formatDate, getStatus, getShiftTimeOfDay } from '../utils/helpers';

const IS_DEMO = process.env.REACT_APP_DEMO_MODE === 'true';
const getChartData = IS_DEMO ? demoApi.getChartData : apiGetChartData;
const getMeasurements = IS_DEMO ? demoApi.getMeasurements : apiGetMeasurements;
const createMeasurement = IS_DEMO ? demoApi.createMeasurement : apiCreateMeasurement;
const createReport = IS_DEMO ? demoApi.createReport : apiCreateReport;
const getReportPdf = IS_DEMO ? demoApi.getReportPdf : apiGetReportPdf;
const completeProductionOrder = IS_DEMO ? demoApi.completeProductionOrder : apiCompleteProductionOrder;

// Generate UUID for idempotency
function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function SPCWorkspace({ lines, skus }) {
  const navigate = useNavigate();
  const { productionOrder, clearOrder } = useProductionOrder();

  // Redirect if no active production order
  useEffect(() => {
    if (!productionOrder) {
      navigate('/', { replace: true });
    }
  }, [productionOrder, navigate]);

  // Derive line and sku from production order
  const line = productionOrder ? lines.find(l => String(l.id) === String(productionOrder.lineId)) : null;
  const sku = productionOrder ? skus.find(s => String(s.id) === String(productionOrder.skuId)) : null;

  const [activeFreezer, setActiveFreezer] = useState(1);
  const [activePump, setActivePump] = useState(1);
  const [freezerConfig, setFreezerConfig] = useState([]); // [{freezer_number, pump_count}]
  const [chartData, setChartData] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [successMsg, setSuccessMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosPreviews, setPhotosPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // OOC Acknowledgment modal
  const [oocAlert, setOocAlert] = useState(null); // {measurement, status_overall}

  // Confirmation modals
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Congratulations state
  const [showCongrats, setShowCongrats] = useState(false);

  // Form state
  const [form, setForm] = useState({
    operator_initials: '',
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

  const freezerCount = line ? line.freezer_count : 2;

  // Load freezer config (pump counts)
  useEffect(() => {
    if (!productionOrder || IS_DEMO) return;
    (async () => {
      try {
        const config = await apiGetFreezerConfig(productionOrder.productionOrderId);
        setFreezerConfig(config);
      } catch (err) {
        console.warn('Could not load freezer config:', err);
      }
    })();
  }, [productionOrder]);

  // Get pump count for active freezer
  const activeFreezerPumpCount = useMemo(() => {
    const fc = freezerConfig.find(f => f.freezer_number === activeFreezer);
    return fc ? fc.pump_count : 1;
  }, [freezerConfig, activeFreezer]);

  // Reset pump when switching freezer
  useEffect(() => {
    setActivePump(1);
  }, [activeFreezer]);

  // Navigation guard - warn if there are unsubmitted measurements
  const hasEntries = recentEntries.length > 0;
  useNavigationGuard(hasEntries && !reportGenerated, 'You have unreported measurements. Are you sure you want to leave?');

  // Load chart data filtered by active freezer + pump
  const loadData = useCallback(async () => {
    if (!sku || !line || !productionOrder) return;
    setLoadError('');
    try {
      const queryParams = {
        sku_id: productionOrder.skuId,
        line_id: productionOrder.lineId,
        shift: productionOrder.shift,
        shift_date: productionOrder.shiftDate,
        freezer_number: activeFreezer,
      };
      // Only filter by pump if this freezer has multiple pumps
      if (activeFreezerPumpCount > 1) {
        queryParams.pump_number = activePump;
      }

      const [chart, recent] = await Promise.all([
        getChartData(queryParams),
        getMeasurements({ ...queryParams, limit: 50 }),
      ]);
      setChartData(chart);
      setRecentEntries(recent);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoadError('Unable to load data. Check your connection.');
    }
  }, [productionOrder, sku, line, activeFreezer, activePump, activeFreezerPumpCount]);

  useEffect(() => { loadData(); }, [loadData]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for 8+ in-control readings for congratulations
  const inControlCount = useMemo(() => {
    if (!sku || !recentEntries.length) return 0;
    const tLimits = { lcl: parseFloat(sku.thickness_lcl), ucl: parseFloat(sku.thickness_ucl) };
    const wLimits = { lcl: parseFloat(sku.weight_lcl), ucl: parseFloat(sku.weight_ucl) };
    const cLimits = { lcl: parseFloat(sku.coating_lcl), ucl: parseFloat(sku.coating_ucl) };

    let count = 0;
    for (const entry of recentEntries) {
      const tv = entry.thickness_value ? parseFloat(entry.thickness_value) : null;
      const wv = entry.weight_value ? parseFloat(entry.weight_value) : null;
      const cv = entry.coating_value ? parseFloat(entry.coating_value) : null;
      let allInControl = true;
      if (tv !== null && (tv < tLimits.lcl || tv > tLimits.ucl)) allInControl = false;
      if (wv !== null && (wv < wLimits.lcl || wv > wLimits.ucl)) allInControl = false;
      if (cv !== null && (cv < cLimits.lcl || cv > cLimits.ucl)) allInControl = false;
      if (allInControl) count++;
    }
    return count;
  }, [recentEntries, sku]);

  useEffect(() => {
    if (inControlCount >= 8 && !showCongrats) {
      setShowCongrats(true);
    }
  }, [inControlCount, showCongrats]);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.operator_initials.trim() || !productionOrder) return;

    try {
      const result = await withRetry(() => createMeasurement({
        sku_id: productionOrder.skuId,
        line_id: productionOrder.lineId,
        freezer_number: activeFreezer,
        pump_number: activeFreezerPumpCount > 1 ? activePump : 1,
        operator_initials: form.operator_initials,
        thickness_value: form.thickness_value || null,
        weight_value: form.weight_value || null,
        coating_value: form.coating_value || null,
        adjustments: form.adjustments || null,
        shift: productionOrder.shift,
        shift_date: productionOrder.shiftDate,
        best_buy_code: productionOrder.bestBuyCode,
        production_order_id: productionOrder.productionOrderId,
        client_id: generateClientId(),
      }, photos));

      setForm(prev => ({
        ...prev,
        thickness_value: '',
        weight_value: '',
        coating_value: '',
        adjustments: '',
      }));
      setPhotos([]);
      setPhotosPreviews([]);

      // Check if OOC/warning — show acknowledgment popup
      if (result.requires_ack) {
        setOocAlert({ measurement: result, status_overall: result.status_overall });
      } else {
        setSuccessMsg('Recorded!');
        setTimeout(() => setSuccessMsg(''), 2000);
      }

      await loadData();
    } catch (err) {
      console.error('Failed to record:', err);
      if (err.status === 409) {
        alert(err.message || 'This order is reviewed and locked.');
      } else {
        alert('Failed to record measurement. Please check your connection and try again.');
      }
    }
  };

  const handleAcknowledgeOoc = async () => {
    if (!oocAlert) return;
    try {
      await apiAcknowledgeMeasurement(oocAlert.measurement.id, form.operator_initials || 'operator');
    } catch (err) {
      console.warn('Failed to save acknowledgment:', err);
    }
    setOocAlert(null);
    setSuccessMsg('Recorded & Acknowledged!');
    setTimeout(() => setSuccessMsg(''), 2000);
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
    if (!productionOrder) return;

    setIsSubmittingReport(true);
    try {
      const report = await withRetry(() => createReport({
        line_id: productionOrder.lineId,
        sku_id: productionOrder.skuId,
        shift: productionOrder.shift,
        shift_date: productionOrder.shiftDate,
        operator_name: reportForm.operator_name,
        supervisor_name: reportForm.supervisor_name || null,
        notes: reportForm.notes || null,
        best_buy_code: productionOrder.bestBuyCode,
        po_number: productionOrder.poNumber || null,
        production_order_id: productionOrder.productionOrderId || null,
      }));

      if (productionOrder.productionOrderId) {
        try {
          await completeProductionOrder(productionOrder.productionOrderId);
        } catch (e) {
          console.warn('Could not complete production order:', e);
        }
      }

      setReportGenerated(report);
    } catch (err) {
      console.error('Failed to create report:', err);
      alert('Failed to create shift report. Please check your connection and try again.');
    } finally {
      setIsSubmittingReport(false);
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
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleNewProductionOrder = () => {
    clearOrder();
    navigate('/');
  };

  if (!productionOrder || !line || !sku) {
    return (
      <div className="selection-page">
        <div className="loading-spinner"><div className="spinner" /></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading workspace...</p>
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

  const shiftTod = getShiftTimeOfDay(productionOrder.shift);
  const pumpLabel = activeFreezerPumpCount > 1 ? ` / Pump ${activePump}` : '';

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
                <label>Code:</label>
                <span>{sku.product_code}</span>
              </div>
              <div className="header-field">
                <label>Line:</label>
                <span>{line.display_name}</span>
              </div>
              {productionOrder.poNumber && (
                <div className="header-field">
                  <label>PO#:</label>
                  <span style={{ fontWeight: 700 }}>{productionOrder.poNumber}</span>
                </div>
              )}
              <div className="header-field">
                <label>Lot:</label>
                <span>{productionOrder.bestBuyCode}</span>
              </div>
              <div className={`shift-badge ${shiftTod}`}>
                {shiftTod === 'day' ? '\u2600' : '\u{1F319}'} Shift {productionOrder.shift}
              </div>
              <div className="header-field">
                <label>Date:</label>
                <span>{productionOrder.shiftDate}</span>
              </div>
              <div className="timestamp-display">{timeStr}</div>
            </div>
          </div>
          <div className="header-nav">
            <button className="nav-btn" onClick={() => setShowNewOrderModal(true)}>
              New Order
            </button>
          </div>
        </div>
      </header>

      {/* Freezer Ribbon with nested Pump toggle */}
      <div className="freezer-ribbon">
        {Array.from({ length: freezerCount }, (_, i) => i + 1).map(num => {
          const fc = freezerConfig.find(f => f.freezer_number === num);
          const pumpCount = fc ? fc.pump_count : 1;

          if (pumpCount > 1 && activeFreezer === num) {
            // Show freezer with nested pump tabs
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  className="freezer-tab active"
                  style={{ borderRadius: '8px 0 0 8px' }}
                >
                  Frzr #{num}
                </button>
                {Array.from({ length: pumpCount }, (_, p) => p + 1).map(pNum => (
                  <button
                    key={pNum}
                    className={`freezer-tab ${activePump === pNum ? 'active' : ''}`}
                    onClick={() => setActivePump(pNum)}
                    style={{
                      borderRadius: pNum === pumpCount ? '0 8px 8px 0' : '0',
                      fontSize: '0.8rem',
                      padding: '0.5rem 0.75rem',
                      background: activePump === pNum ? 'var(--accent)' : undefined,
                      color: activePump === pNum ? 'white' : undefined,
                    }}
                  >
                    P{pNum}
                  </button>
                ))}
              </div>
            );
          }

          return (
            <button
              key={num}
              className={`freezer-tab ${activeFreezer === num ? 'active' : ''}`}
              onClick={() => setActiveFreezer(num)}
            >
              {pumpCount > 1 ? `Frzr #${num}` : `Freezer #${num}`}
            </button>
          );
        })}
      </div>

      {/* Success Message */}
      {successMsg && <div className="success-feedback">{successMsg}</div>}

      {/* Load Error */}
      {loadError && (
        <div style={{
          background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
          borderRadius: '8px', margin: '0.75rem 1.5rem', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{loadError}</span>
          <button onClick={loadData} style={{
            background: 'var(--danger)', color: 'white', border: 'none',
            borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}>Retry</button>
        </div>
      )}

      {/* Congratulations Banner */}
      {showCongrats && inControlCount >= 8 && (
        <div style={{
          background: 'linear-gradient(135deg, #00c853 0%, #69f0ae 100%)',
          color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px',
          margin: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 15px rgba(0,200,83,0.3)',
        }}>
          <span style={{ fontSize: '2.5rem' }}>&#x1F3C6;</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Outstanding Work! &#127881;
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
              {inControlCount} readings in control this shift on Freezer #{activeFreezer}{pumpLabel} — Great job!
            </div>
          </div>
          <button onClick={() => setShowCongrats(false)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
            marginLeft: 'auto', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>x</button>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Left: Form */}
        <div className="form-section">
          <div className="premium-card form-card">
            <div className="card-header">
              <h3>New Measurement</h3>
              <span className="timestamp-display">Freezer #{activeFreezer}{pumpLabel}</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Operator Initials *</label>
                <input className="premium-input" type="text" maxLength={10}
                  value={form.operator_initials}
                  onChange={e => handleFormChange('operator_initials', e.target.value)}
                  placeholder="Enter initials" required autoFocus />
              </div>

              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.thickness_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.thickness_target)}</span>
                </div>
                <input className="premium-input" type="number" step="0.01" inputMode="decimal" value={form.thickness_value}
                  onChange={e => handleFormChange('thickness_value', e.target.value)}
                  placeholder={`Enter ${sku.thickness_label.toLowerCase()}`} />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.thickness_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.thickness_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.thickness_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.thickness_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.thickness_ucl)}</span>
                </div>
              </div>

              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.weight_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.weight_target)}</span>
                </div>
                <input className="premium-input" type="number" step="0.01" inputMode="decimal" value={form.weight_value}
                  onChange={e => handleFormChange('weight_value', e.target.value)}
                  placeholder={`Enter ${sku.weight_label.toLowerCase()}`} />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.weight_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.weight_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.weight_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.weight_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.weight_ucl)}</span>
                </div>
              </div>

              <div className="premium-param">
                <div className="param-header">
                  <h3>{sku.coating_label}</h3>
                  <span className="target-badge">Target: {parseFloat(sku.coating_target)}</span>
                </div>
                <input className="premium-input" type="number" step="0.01" inputMode="decimal" value={form.coating_value}
                  onChange={e => handleFormChange('coating_value', e.target.value)}
                  placeholder={`Enter ${sku.coating_label.toLowerCase()}`} />
                <div className="control-limits-compact">
                  <span className="limit-lcl">LCL {parseFloat(sku.coating_lcl)}</span>
                  <span className="limit-lwl">LWL {parseFloat(sku.coating_lwl)}</span>
                  <span className="limit-target">TGT {parseFloat(sku.coating_target)}</span>
                  <span className="limit-uwl">UWL {parseFloat(sku.coating_uwl)}</span>
                  <span className="limit-ucl">UCL {parseFloat(sku.coating_ucl)}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Adjustments</label>
                <input className="premium-input" type="text" value={form.adjustments}
                  onChange={e => handleFormChange('adjustments', e.target.value)}
                  placeholder="Document any adjustments made" />
              </div>

              <div className="form-group">
                <label>Product Photo (Optional)</label>
                <div className="image-upload-container">
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple
                    onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  <button type="button" className="image-upload-btn" onClick={() => fileInputRef.current?.click()}>
                    Attach Photo{photos.length > 0 ? ` (${photos.length})` : ''}
                  </button>
                  {photosPreviews.length > 0 && (
                    <div className="image-preview">
                      {photosPreviews.map((src, i) => (
                        <div key={i} className="image-preview-item">
                          <img src={src} alt={`Preview ${i + 1}`} />
                          <button type="button" className="remove-image" onClick={() => removePhoto(i)}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="premium-btn">
                Record Measurement
              </button>
            </form>
          </div>

          {/* Recent Entries — read-only, no edit button */}
          <div className="premium-card">
            <div className="card-header">
              <h3>Recent Entries — Freezer #{activeFreezer}{pumpLabel}</h3>
              <span className="timestamp-display">{recentEntries.length} entries</span>
            </div>
            <div className="entries-list">
              {recentEntries.length === 0 ? (
                <div className="empty-state">
                  <p>No entries yet for Freezer #{activeFreezer}{pumpLabel} this shift.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Record your first measurement above.</p>
                </div>
              ) : (
                recentEntries.map(entry => (
                  <div key={entry.id} className="entry-item">
                    <div className="entry-header">
                      <div>
                        <div className="entry-time">{formatTime(entry.recorded_at)}</div>
                        <div className="entry-date">
                          {formatDate(entry.recorded_at)} | Freezer #{entry.freezer_number}
                          {entry.pump_number > 1 ? ` / Pump ${entry.pump_number}` : ''}
                        </div>
                      </div>
                      {/* Status indicator */}
                      {entry.status_overall && entry.status_overall !== 'in_control' && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: entry.status_overall === 'ooc' ? 'rgba(244,67,54,0.12)' : 'rgba(255,152,0,0.12)',
                          color: entry.status_overall === 'ooc' ? '#d32f2f' : '#f57c00',
                        }}>
                          {entry.status_overall === 'ooc' ? 'OOC' : 'WARNING'}
                          {entry.alert_acknowledged_at ? ' (ack)' : ''}
                        </span>
                      )}
                    </div>
                    <div className="entry-data">
                      {entry.thickness_value && (
                        <div className="data-item">
                          <span className="data-label">Thickness</span>
                          <span className={`data-value status-${getStatus(entry.thickness_value, thicknessLimits)}`}>{parseFloat(entry.thickness_value)}</span>
                        </div>
                      )}
                      {entry.weight_value && (
                        <div className="data-item">
                          <span className="data-label">Weight</span>
                          <span className={`data-value status-${getStatus(entry.weight_value, weightLimits)}`}>{parseFloat(entry.weight_value)}</span>
                        </div>
                      )}
                      {entry.coating_value && (
                        <div className="data-item">
                          <span className="data-label">Coating</span>
                          <span className={`data-value status-${getStatus(entry.coating_value, coatingLimits)}`}>{parseFloat(entry.coating_value)}</span>
                        </div>
                      )}
                    </div>
                    <div className="entry-operator">
                      Op: {entry.operator_initials}
                      {entry.adjustments ? ` | Adj: ${entry.adjustments}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <button className="premium-btn success" onClick={() => setShowReportModal(true)}>
              Submit Shift Report (All Freezers)
            </button>
          </div>
        </div>

        {/* Right: Charts - Per Freezer + Pump */}
        <div className="charts-section">
          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)',
            padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem',
            textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#333',
          }}>
            Charts for Freezer #{activeFreezer}{pumpLabel}
          </div>
          <SPCChart title={`${sku.thickness_label} — Freezer #${activeFreezer}${pumpLabel}`} data={chartData} valueKey="thickness_value" limits={thicknessLimits} />
          <SPCChart title={`${sku.weight_label} — Freezer #${activeFreezer}${pumpLabel}`} data={chartData} valueKey="weight_value" limits={weightLimits} />
          <SPCChart title={`${sku.coating_label} — Freezer #${activeFreezer}${pumpLabel}`} data={chartData} valueKey="coating_value" limits={coatingLimits} />
        </div>
      </div>

      {/* OOC/Warning Acknowledgment Modal */}
      {oocAlert && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem 0.5rem',
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '0.5rem',
              }}>
                {oocAlert.status_overall === 'ooc' ? '\u26A0\uFE0F' : '\u26A0'}
              </div>
              <h2 style={{
                color: oocAlert.status_overall === 'ooc' ? '#d32f2f' : '#f57c00',
                marginBottom: '0.5rem',
              }}>
                {oocAlert.status_overall === 'ooc' ? 'Out of Control' : 'Warning'}
              </h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
                This measurement is {oocAlert.status_overall === 'ooc' ? 'outside control limits' : 'in the warning zone'}.
                Please acknowledge to continue recording.
              </p>
            </div>
            <button
              className="premium-btn"
              onClick={handleAcknowledgeOoc}
              style={{
                width: '100%',
                background: oocAlert.status_overall === 'ooc' ? '#d32f2f' : '#f57c00',
                color: 'white',
              }}
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}

      {/* New Production Order Confirmation Modal */}
      {showNewOrderModal && (
        <div className="modal-overlay" onClick={() => setShowNewOrderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Start New Production Order?</h2>
            <div className="modal-warning" style={{ margin: '1rem 0', textAlign: 'left' }}>
              This will end the current production order for <strong>{sku.product_name}</strong> on <strong>{line.display_name}</strong>.
              <br /><br />
              All recorded measurements are saved. If you haven't submitted the shift report yet, please do so first.
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowNewOrderModal(false)}>Stay Here</button>
              <button className="confirm-btn" onClick={handleNewProductionOrder} style={{ background: '#f44336' }}>
                Confirm — New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => { if (!isSubmittingReport) { setShowReportModal(false); setReportGenerated(null); } }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Submit Shift Report</h2>
            {!reportGenerated ? (
              <>
                <p style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
                  <strong>{sku.product_name}</strong> | {line.display_name} | Shift {productionOrder.shift} | {productionOrder.shiftDate}
                  {productionOrder.poNumber ? ` | PO# ${productionOrder.poNumber}` : ''}
                </p>
                <div style={{
                  background: '#e3f2fd', borderRadius: '6px', padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem', color: '#1565c0', fontWeight: 500, marginBottom: '1rem', textAlign: 'left',
                }}>
                  This report includes measurements from ALL freezers for this shift.
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="form-group">
                    <label>Operator Name *</label>
                    <input className="premium-input" type="text" value={reportForm.operator_name}
                      onChange={e => setReportForm(prev => ({ ...prev, operator_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label>Supervisor Name (Sign-off)</label>
                    <input className="premium-input" type="text" value={reportForm.supervisor_name}
                      onChange={e => setReportForm(prev => ({ ...prev, supervisor_name: e.target.value }))} placeholder="Supervisor name for sign-off" />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea className="premium-input" rows={3} value={reportForm.notes}
                      onChange={e => setReportForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes for this shift" style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowReportModal(false)} disabled={isSubmittingReport}>Cancel</button>
                  <button className="confirm-btn success" onClick={handleSubmitReport} disabled={isSubmittingReport}>
                    {isSubmittingReport ? 'Submitting...' : 'Sign & Submit'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: 'rgba(0,200,83,0.08)', border: '1px solid var(--success)',
                  borderRadius: '8px', padding: '1rem', marginBottom: '1rem', textAlign: 'center',
                }}>
                  <span style={{ fontSize: '2rem' }}>&#x2713;</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)', marginTop: '0.5rem' }}>
                    Shift Report Submitted Successfully
                  </div>
                </div>
                <div className="shift-report" style={{ display: 'block', textAlign: 'left' }}>
                  <div className="shift-report-content">
                    <p><strong>Product:</strong> {reportGenerated.product_name || sku.product_name}</p>
                    <p><strong>Shift:</strong> {reportGenerated.shift} | <strong>Date:</strong> {reportGenerated.shift_date}</p>
                    {productionOrder.poNumber && <p><strong>PO#:</strong> {productionOrder.poNumber}</p>}
                    <p><strong>Best Buy Code:</strong> {productionOrder.bestBuyCode}</p>
                    <p><strong>Total Measurements:</strong> {reportGenerated.total_measurements} (all freezers)</p>
                    <p><strong>Operator:</strong> {reportGenerated.operator_name}</p>
                    <p><strong>Supervisor:</strong> {reportGenerated.supervisor_name || 'N/A'}</p>
                    <hr style={{ margin: '1rem 0', borderColor: 'var(--border)' }} />
                    <p><strong>Thickness:</strong> Avg {reportGenerated.thickness_avg}, OOC: {reportGenerated.thickness_out_of_control}, Warnings: {reportGenerated.thickness_warnings}</p>
                    <p><strong>Weight:</strong> Avg {reportGenerated.weight_avg}, OOC: {reportGenerated.weight_out_of_control}, Warnings: {reportGenerated.weight_warnings}</p>
                    <p><strong>Coating:</strong> Avg {reportGenerated.coating_avg}, OOC: {reportGenerated.coating_out_of_control}, Warnings: {reportGenerated.coating_warnings}</p>
                  </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button className="cancel-btn" onClick={() => { setShowReportModal(false); setReportGenerated(null); }}>Close</button>
                  <button className="confirm-btn" onClick={() => handleDownloadPdf(reportGenerated.id)}>Download PDF</button>
                  <button className="confirm-btn success" onClick={handleNewProductionOrder}
                    style={{ flex: '1 1 100%', marginTop: '0.5rem' }}>
                    Start New Production Order
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
