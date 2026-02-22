import React from 'react';
import { useNavigate } from 'react-router-dom';

function LineSelection({ lines }) {
  const navigate = useNavigate();

  const lineIcons = {
    1: '\u{1F3ED}', // factory
    2: '\u{2699}\u{FE0F}', // gear
    3: '\u{1F527}', // wrench
  };

  return (
    <div className="selection-page" style={{ position: 'relative' }}>
      <button
        className="back-btn"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', left: 'auto' }}
        onClick={() => navigate('/admin')}
      >
        Admin Dashboard
      </button>

      <div className="logo-fallback" style={{ marginBottom: '2rem' }}>
        <div className="logo-text">KLONDIKE</div>
        <div className="logo-subtext">DEPARTMENT</div>
      </div>

      <h1 className="page-title">SPC Control Chart</h1>
      <p className="page-subtitle">Select your production line to begin</p>

      <div className="selection-grid lines">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="selection-card"
            onClick={() => navigate(`/line/${line.id}/sku`)}
          >
            <div className="card-icon">{lineIcons[index + 1] || '\u{1F3ED}'}</div>
            <h3>{line.display_name}</h3>
            <p>Production Line</p>
            <span className="freezer-count">
              {line.freezer_count} Freezer{line.freezer_count > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LineSelection;
