import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function SkuSelection({ lines, skus }) {
  const navigate = useNavigate();
  const { lineId } = useParams();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState(null);

  const line = lines.find(l => String(l.id) === lineId);

  const handleSkuClick = (skuId) => {
    setSelectedSkuId(skuId);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    navigate(`/line/${lineId}/sku/${selectedSkuId}`);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedSkuId(null);
  };

  return (
    <div className="selection-page" style={{ position: 'relative' }}>
      <button className="back-btn" onClick={() => navigate('/')}>
        &larr; Back to Lines
      </button>

      <div className="logo-fallback" style={{ marginBottom: '1rem' }}>
        <div className="logo-text">KLONDIKE</div>
        <div className="logo-subtext">DEPARTMENT</div>
      </div>

      <h1 className="page-title">{line ? line.display_name : 'Line'} - Select SKU</h1>
      <p className="page-subtitle">Choose the product being run on this line</p>

      <div className="selection-grid skus">
        {skus.map(sku => (
          <div
            key={sku.id}
            className="selection-card sku-card"
            onClick={() => handleSkuClick(sku.id)}
          >
            <h3>{sku.product_name}</h3>
            <div className="product-code">Code: {sku.product_code}</div>
            <div className="sku-params">
              <div>{sku.thickness_label}: Target {parseFloat(sku.thickness_target)}</div>
              <div>{sku.weight_label}: Target {parseFloat(sku.weight_target)}</div>
              <div>{sku.coating_label}: Target {parseFloat(sku.coating_target)}</div>
            </div>
            {sku.startup_cup_weight_target && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#8e8e8e' }}>
                Cup Weight Target: {parseFloat(sku.startup_cup_weight_target)}g
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm SKU Selection</h2>
            <p>
              You selected: <strong>
                {skus.find(s => s.id === selectedSkuId)?.product_name}
              </strong>
            </p>
            <div className="modal-warning">
              Check with your Mix Instruction Sheet before proceeding.
              Ensure the correct product is loaded for this line.
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                Go Back
              </button>
              <button className="confirm-btn" onClick={handleConfirm}>
                OK - Confirmed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkuSelection;
