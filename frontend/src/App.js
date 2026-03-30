import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductionOrderSetup from './pages/ProductionOrderSetup';
import SPCWorkspace from './pages/SPCWorkspace';
import AdminDashboard from './pages/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { ProductionOrderProvider } from './context/ProductionOrderContext';
import { getLines, getSkus } from './utils/api';
import { MOCK_LINES, MOCK_SKUS } from './utils/mockData';

const IS_DEMO = process.env.REACT_APP_DEMO_MODE === 'true';

function App() {
  const [lines, setLines] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (IS_DEMO) {
        setLines(MOCK_LINES);
        setSkus(MOCK_SKUS);
      } else {
        const [linesData, skusData] = await Promise.all([getLines(), getSkus()]);
        setLines(linesData);
        setSkus(skusData);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setLoadError('Unable to connect to server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="selection-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
          Loading SPC System...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="selection-page">
        <div className="premium-card" style={{
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '500px',
          width: '90%',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x26A0;</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-light)', margin: '1rem 0', lineHeight: 1.6 }}>
            {loadError}
          </p>
          <button
            className="premium-btn"
            onClick={fetchData}
            style={{ maxWidth: '200px', margin: '1rem auto 0' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Use HashRouter for GitHub Pages (subdirectory hosting), BrowserRouter for production
  const Router = IS_DEMO ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <ProductionOrderProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ProductionOrderSetup lines={lines} skus={skus} />} />
            <Route path="/workspace" element={<SPCWorkspace lines={lines} skus={skus} />} />
            <Route path="/admin" element={<AdminDashboard lines={lines} skus={skus} onConfigChanged={fetchData} />} />
            {/* Redirect old routes to new flow */}
            <Route path="/line/*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProductionOrderProvider>
    </ErrorBoundary>
  );
}

export default App;
