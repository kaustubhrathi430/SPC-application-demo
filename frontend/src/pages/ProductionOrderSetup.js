import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductionOrder } from '../context/ProductionOrderContext';
import { createProductionOrder, withRetry } from '../utils/api';
import { getTodayShiftDate, formatDate } from '../utils/helpers';

const STEPS = [
  { key: 'line', label: 'Line' },
  { key: 'product', label: 'Product' },
  { key: 'bestBuy', label: 'Lot Code' },
  { key: 'shift', label: 'Shift' },
  { key: 'date', label: 'Date' },
  { key: 'review', label: 'Confirm' },
];

const SHIFTS = [
  { letter: 'A', period: 'Day', className: 'day-shift' },
  { letter: 'B', period: 'Night', className: 'night-shift' },
  { letter: 'C', period: 'Day', className: 'day-shift' },
  { letter: 'D', period: 'Night', className: 'night-shift' },
];

function ProductionOrderSetup({ lines, skus }) {
  const navigate = useNavigate();
  const { setOrder, isOrderActive } = useProductionOrder();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);
  const [bestBuyCode, setBestBuyCode] = useState('');
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftDate, setShiftDate] = useState(getTodayShiftDate);

  // If there's already an active order, redirect to workspace
  useEffect(() => {
    if (isOrderActive) {
      navigate('/workspace', { replace: true });
    }
  }, [isOrderActive, navigate]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return selectedLine !== null;
      case 1: return selectedSku !== null;
      case 2: return bestBuyCode.trim().length > 0;
      case 3: return selectedShift !== null;
      case 4: return shiftDate !== '';
      case 5: return true;
      default: return false;
    }
  }, [step, selectedLine, selectedSku, bestBuyCode, selectedShift, shiftDate]);

  const goNext = () => {
    if (canProceed() && step < STEPS.length - 1) {
      setStep(step + 1);
      setError('');
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const order = await withRetry(() => createProductionOrder({
        line_id: selectedLine.id,
        sku_id: selectedSku.id,
        best_buy_code: bestBuyCode,
        shift: selectedShift,
        shift_date: shiftDate,
      }));

      setOrder({
        lineId: selectedLine.id,
        lineName: selectedLine.display_name,
        skuId: selectedSku.id,
        skuName: selectedSku.product_name,
        productCode: selectedSku.product_code,
        bestBuyCode: bestBuyCode,
        shift: selectedShift,
        shiftDate: shiftDate,
        productionOrderId: order.id,
        createdAt: new Date().toISOString(),
      });

      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'Failed to start production order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== STEPPER ==========
  const renderStepper = () => (
    <div className="wizard-stepper">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className={`wizard-step ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}
        >
          <div className="wizard-step-number">
            {i < step ? '\u2713' : i + 1}
          </div>
          <div className="wizard-step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );

  // ========== STEP 1: LINE SELECTION ==========
  const renderLineSelection = () => (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '700px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Select Production Line
      </h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
        Choose the line you are working on
      </p>
      <div className="selection-grid lines">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`selection-card ${selectedLine?.id === line.id ? 'selected' : ''}`}
            onClick={() => setSelectedLine(line)}
            style={selectedLine?.id === line.id ? { borderColor: 'var(--accent)', background: 'rgba(0,102,255,0.03)' } : {}}
          >
            <div className="card-icon" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              <svg viewBox="0 0 60 90" width="48" height="72" style={{ display: 'block', margin: '0 auto' }}>
                <polygon points="18,40 42,40 32,85 28,85" fill="#D4A76A" />
                <line x1="22" y1="50" x2="38" y2="50" stroke="#B8894E" strokeWidth="0.8" opacity="0.4" />
                <line x1="24" y1="62" x2="36" y2="62" stroke="#B8894E" strokeWidth="0.8" opacity="0.4" />
                <circle cx="30" cy="28" r="16" fill="#FFF8E1" />
                <circle cx="22" cy="33" r="10" fill="#FFFDE7" />
                <circle cx="38" cy="33" r="10" fill="#FFF8DC" />
                <circle cx="30" cy="20" r="10" fill="#FFF9C4" />
                <circle cx="26" cy="22" r="2.5" fill="white" opacity="0.4" />
              </svg>
            </div>
            <h3>{line.display_name}</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Production Line</p>
            <span className="freezer-count">
              {line.freezer_count} Freezer{line.freezer_count > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <button className="premium-btn" onClick={goNext} disabled={!canProceed()}
          style={{ minWidth: '220px', fontSize: '1rem', padding: '0.85rem 2rem' }}>
          Next &rarr;
        </button>
      </div>
    </div>
  );

  // ========== STEP 2: PRODUCT SELECTION (DROPDOWN) ==========
  const renderProductCode = () => (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Select Product
      </h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
        Choose the product from your Mix Instruction Sheet
      </p>
      <div style={{ textAlign: 'left' }}>
        <select
          className="premium-input"
          value={selectedSku ? selectedSku.id : ''}
          onChange={(e) => {
            const sku = skus.find(s => String(s.id) === e.target.value);
            setSelectedSku(sku || null);
          }}
          style={{ fontSize: '1.05rem', padding: '0.85rem 1rem', cursor: 'pointer' }}
        >
          <option value="">-- Select a product --</option>
          {skus.map(sku => (
            <option key={sku.id} value={sku.id}>
              {sku.product_name} ({sku.product_code})
            </option>
          ))}
        </select>

        {/* Show selected product details */}
        {selectedSku && (
          <div style={{
            background: 'rgba(0, 200, 83, 0.08)',
            border: '1.5px solid var(--success)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ color: 'var(--success)', fontSize: '1.5rem' }}>&#x2713;</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedSku.product_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Code: {selectedSku.product_code}{selectedSku.cr_code ? ` | CR: ${selectedSku.cr_code}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
        <button className="premium-btn" onClick={goBack}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', flex: 1 }}>
          &larr; Back
        </button>
        <button className="premium-btn" onClick={goNext} disabled={!canProceed()} style={{ flex: 2 }}>
          Next &rarr;
        </button>
      </div>
    </div>
  );

  // ========== STEP 3: BEST BUY CODE ==========
  const renderBestBuyCode = () => (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Best Buy Code
      </h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
        Enter the lot/batch number for this production run
      </p>
      <input
        className="premium-input"
        type="text"
        value={bestBuyCode}
        onChange={(e) => setBestBuyCode(e.target.value)}
        placeholder="Enter lot/batch number"
        maxLength={50}
        autoFocus
        style={{ fontSize: '1.1rem', textAlign: 'center', letterSpacing: '1px' }}
      />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
        <button className="premium-btn" onClick={goBack}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', flex: 1 }}>
          &larr; Back
        </button>
        <button className="premium-btn" onClick={goNext} disabled={!canProceed()} style={{ flex: 2 }}>
          Next &rarr;
        </button>
      </div>
    </div>
  );

  // ========== STEP 4: SHIFT SELECTION ==========
  const renderShiftSelection = () => (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '600px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Select Your Shift
      </h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
        Choose the shift you are working on
      </p>
      <div className="shift-grid">
        {SHIFTS.map(s => (
          <div
            key={s.letter}
            className={`shift-card ${s.className} ${selectedShift === s.letter ? 'selected' : ''}`}
            onClick={() => setSelectedShift(s.letter)}
          >
            <div className="shift-letter">{s.letter}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
        <button className="premium-btn" onClick={goBack}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', flex: 1 }}>
          &larr; Back
        </button>
        <button className="premium-btn" onClick={goNext} disabled={!canProceed()} style={{ flex: 2 }}>
          Next &rarr;
        </button>
      </div>
    </div>
  );

  // ========== STEP 5: DATE CONFIRMATION ==========
  const renderDateConfirmation = () => (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Confirm Production Date
      </h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
        Verify or change the date for this production run
      </p>
      <input
        className="premium-input"
        type="date"
        value={shiftDate}
        onChange={(e) => setShiftDate(e.target.value)}
        style={{ fontSize: '1.25rem', textAlign: 'center' }}
      />
      <div style={{
        marginTop: '1rem',
        fontSize: '1rem',
        color: 'var(--text)',
        fontWeight: 600,
      }}>
        {shiftDate ? formatDate(shiftDate + 'T12:00:00') : ''}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
        <button className="premium-btn" onClick={goBack}
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', flex: 1 }}>
          &larr; Back
        </button>
        <button className="premium-btn" onClick={goNext} disabled={!canProceed()} style={{ flex: 2 }}>
          Review &rarr;
        </button>
      </div>
    </div>
  );

  // ========== STEP 6: REVIEW & CONFIRM ==========
  const renderReview = () => {
    return (
      <div style={{ textAlign: 'center', width: '100%', maxWidth: '550px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Review Production Order
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
          Verify all details before starting
        </p>

        <div className="premium-card" style={{ textAlign: 'left', overflow: 'hidden' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '1rem 1.5rem',
            color: 'white',
          }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>
              Production Order
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {selectedSku?.product_name}
            </div>
          </div>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            {[
              { label: 'Production Line', value: selectedLine?.display_name },
              { label: 'Product Code', value: selectedSku?.product_code },
              { label: 'CR Code', value: selectedSku?.cr_code || 'N/A' },
              { label: 'Best Buy Code', value: bestBuyCode },
              { label: 'Shift', value: selectedShift ? `Shift ${selectedShift}` : '' },
              { label: 'Date', value: shiftDate ? formatDate(shiftDate + 'T12:00:00') : '' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 500 }}>
                  {item.label}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div style={{
          background: '#fff8e1',
          border: '1px solid #ffcc02',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          margin: '1.5rem 0',
          fontSize: '0.85rem',
          color: '#f57f17',
          fontWeight: 500,
          textAlign: 'left',
        }}>
          Please verify all details match your Mix Instruction Sheet before proceeding.
        </div>

        {error && (
          <div style={{
            background: 'rgba(244,67,54,0.08)',
            border: '1px solid rgba(244,67,54,0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: 'var(--danger)',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="premium-btn" onClick={goBack}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', flex: 1 }}>
            &larr; Edit
          </button>
          <button
            className="premium-btn success"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{ flex: 2 }}
          >
            {isSubmitting ? 'Starting...' : 'Start Production'}
          </button>
        </div>
      </div>
    );
  };

  const stepRenderers = [
    renderLineSelection,
    renderProductCode,
    renderBestBuyCode,
    renderShiftSelection,
    renderDateConfirmation,
    renderReview,
  ];

  return (
    <div className="selection-page" style={{ position: 'relative' }}>
      {/* Admin button */}
      <button
        className="back-btn"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', left: 'auto' }}
        onClick={() => navigate('/admin')}
      >
        Admin
      </button>

      {/* Title */}
      <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--text)' }}>
          KLONDIKE
        </div>
        <div style={{ fontSize: '0.7rem', letterSpacing: '2px', color: 'var(--text-light)', textTransform: 'uppercase' }}>
          SPC Control Chart System
        </div>
      </div>

      {/* Stepper */}
      {renderStepper()}

      {/* Step Content */}
      {stepRenderers[step]()}
    </div>
  );
}

export default ProductionOrderSetup;
