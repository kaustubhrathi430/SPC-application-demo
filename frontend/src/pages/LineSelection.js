import React from 'react';
import { useNavigate } from 'react-router-dom';

// Klondike bear (polar bear) SVG
const KlondikeBear = () => (
  <svg viewBox="0 0 120 140" width="100" height="116" style={{ display: 'block', margin: '0 auto 1rem' }}>
    {/* Body */}
    <ellipse cx="60" cy="95" rx="38" ry="40" fill="#F5F5F5" />
    <ellipse cx="60" cy="95" rx="35" ry="37" fill="#FAFAFA" />
    {/* Belly */}
    <ellipse cx="60" cy="100" rx="22" ry="24" fill="#EEEEEE" />
    {/* Head */}
    <circle cx="60" cy="42" r="30" fill="#F5F5F5" />
    <circle cx="60" cy="42" r="28" fill="#FAFAFA" />
    {/* Ears */}
    <circle cx="35" cy="18" r="12" fill="#F5F5F5" />
    <circle cx="85" cy="18" r="12" fill="#F5F5F5" />
    <circle cx="35" cy="18" r="8" fill="#E8D5C4" />
    <circle cx="85" cy="18" r="8" fill="#E8D5C4" />
    {/* Eyes */}
    <circle cx="48" cy="38" r="4" fill="#333" />
    <circle cx="72" cy="38" r="4" fill="#333" />
    <circle cx="49.5" cy="36.5" r="1.5" fill="white" />
    <circle cx="73.5" cy="36.5" r="1.5" fill="white" />
    {/* Nose */}
    <ellipse cx="60" cy="50" rx="6" ry="4" fill="#333" />
    <ellipse cx="60" cy="49" rx="3" ry="1.5" fill="#666" />
    {/* Mouth */}
    <path d="M 55 54 Q 60 60 65 54" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
    {/* Paws */}
    <ellipse cx="32" cy="120" rx="12" ry="8" fill="#F0F0F0" />
    <ellipse cx="88" cy="120" rx="12" ry="8" fill="#F0F0F0" />
    {/* Arms */}
    <ellipse cx="26" cy="85" rx="10" ry="18" fill="#F5F5F5" transform="rotate(-15,26,85)" />
    <ellipse cx="94" cy="85" rx="10" ry="18" fill="#F5F5F5" transform="rotate(15,94,85)" />
    {/* Scarf */}
    <path d="M 35 60 Q 60 68 85 60" fill="none" stroke="#1565C0" strokeWidth="5" strokeLinecap="round" />
    <path d="M 35 60 Q 60 70 85 60" fill="none" stroke="#1976D2" strokeWidth="3" strokeLinecap="round" />
    {/* Scarf tail */}
    <path d="M 75 63 L 80 78 L 72 76" fill="#1565C0" />
  </svg>
);

// Ice cream bar icon for line cards
const IceCreamBarIcon = () => (
  <svg viewBox="0 0 40 80" width="36" height="72">
    {/* Stick */}
    <rect x="15" y="48" width="10" height="28" rx="3" fill="#C4975A" />
    <rect x="16.5" y="48" width="3" height="25" rx="1.5" fill="#D4A76A" opacity="0.4" />
    {/* Vanilla center */}
    <rect x="4" y="8" width="32" height="44" rx="5" fill="#FFF8DC" />
    {/* Chocolate coating */}
    <rect x="2" y="4" width="36" height="14" rx="6" fill="#5D3A1A" />
    <rect x="2" y="8" width="5" height="40" rx="2.5" fill="#5D3A1A" />
    <rect x="33" y="8" width="5" height="40" rx="2.5" fill="#5D3A1A" />
    <rect x="2" y="42" width="36" height="8" rx="4" fill="#5D3A1A" />
    {/* Shine */}
    <rect x="8" y="7" width="10" height="4" rx="2" fill="#8B5E3C" opacity="0.4" />
  </svg>
);

function LineSelection({ lines }) {
  const navigate = useNavigate();

  return (
    <div className="selection-page" style={{ position: 'relative' }}>
      <button
        className="back-btn"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', left: 'auto' }}
        onClick={() => navigate('/admin')}
      >
        Admin Dashboard
      </button>

      {/* Magnum Ice Cream Company Ribbon */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '0.75rem 2rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        width: 'fit-content',
        margin: '0 auto 1.5rem',
      }}>
        <img
          src="https://corporate.magnumicecream.com/content/dam/brands/magnum-ice-cream-company/global/logo/logo-tmicc-white.svg"
          alt="The Magnum Ice Cream Company"
          style={{ height: '32px', objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <span style={{ display: 'none', color: '#C9A96E', fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '2px' }}>
          THE MAGNUM ICE CREAM COMPANY
        </span>
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: '#8e8e8e',
        fontStyle: 'italic',
        letterSpacing: '1px',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Life Tastes Better With Ice Cream
      </div>

      <div className="logo-fallback" style={{ marginBottom: '1rem' }}>
        <div className="logo-text">KLONDIKE</div>
        <div className="logo-subtext">DEPARTMENT</div>
      </div>

      {/* Klondike Bear */}
      <KlondikeBear />

      <h1 className="page-title">SPC Control Chart</h1>
      <p className="page-subtitle">Select your production line to begin</p>

      <div className="selection-grid lines">
        {lines.map((line) => (
          <div
            key={line.id}
            className="selection-card"
            onClick={() => navigate(`/line/${line.id}/sku`)}
          >
            <div className="card-icon" style={{ marginBottom: '0.5rem' }}>
              <IceCreamBarIcon />
            </div>
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
