import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LineSelection from './pages/LineSelection';
import SkuSelection from './pages/SkuSelection';
import SPCWorkspace from './pages/SPCWorkspace';
import AdminDashboard from './pages/AdminDashboard';
import { getLines, getSkus } from './utils/api';

function App() {
  const [lines, setLines] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [linesData, skusData] = await Promise.all([getLines(), getSkus()]);
        setLines(linesData);
        setSkus(skusData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="selection-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LineSelection lines={lines} />} />
        <Route path="/line/:lineId/sku" element={<SkuSelection lines={lines} skus={skus} />} />
        <Route path="/line/:lineId/sku/:skuId" element={<SPCWorkspace lines={lines} skus={skus} />} />
        <Route path="/admin" element={<AdminDashboard lines={lines} skus={skus} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
