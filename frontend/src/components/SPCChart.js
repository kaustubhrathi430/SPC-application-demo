import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getStatusColor, formatTime } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Different color themes for each parameter type
const CHART_THEMES = {
  thickness: {
    lineColor: '#2196F3',       // Blue
    fillColor: 'rgba(33, 150, 243, 0.08)',
    targetColor: '#4CAF50',
    uclColor: '#f44336',
    lclColor: '#f44336',
    uwlColor: '#FF9800',
    lwlColor: '#FF9800',
    pointStyle: 'circle',
  },
  weight: {
    lineColor: '#9C27B0',       // Purple
    fillColor: 'rgba(156, 39, 176, 0.08)',
    targetColor: '#4CAF50',
    uclColor: '#f44336',
    lclColor: '#f44336',
    uwlColor: '#FF9800',
    lwlColor: '#FF9800',
    pointStyle: 'rectRot',      // Diamond
  },
  coating: {
    lineColor: '#FF5722',       // Deep Orange
    fillColor: 'rgba(255, 87, 34, 0.08)',
    targetColor: '#4CAF50',
    uclColor: '#f44336',
    lclColor: '#f44336',
    uwlColor: '#FF9800',
    lwlColor: '#FF9800',
    pointStyle: 'triangle',
  },
};

function SPCChart({ title, data, valueKey, limits }) {
  // Determine theme based on valueKey
  const themeKey = valueKey.includes('thickness') ? 'thickness'
    : valueKey.includes('weight') ? 'weight'
    : 'coating';
  const theme = CHART_THEMES[themeKey];

  const chartData = useMemo(() => {
    const validData = data.filter(d => d[valueKey] !== null && d[valueKey] !== undefined);
    const labels = validData.map(d => formatTime(d.recorded_at));
    const values = validData.map(d => parseFloat(d[valueKey]));
    const pointColors = values.map(v => getStatusColor(v, limits));

    const lineCount = labels.length;

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: theme.lineColor,
          backgroundColor: theme.fillColor,
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointBorderWidth: 2,
          pointStyle: theme.pointStyle,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Target',
          data: Array(lineCount).fill(limits.target),
          borderColor: theme.targetColor,
          borderDash: [8, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'UCL',
          data: Array(lineCount).fill(limits.ucl),
          borderColor: theme.uclColor,
          borderDash: [6, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'LCL',
          data: Array(lineCount).fill(limits.lcl),
          borderColor: theme.lclColor,
          borderDash: [6, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'UWL',
          data: Array(lineCount).fill(limits.uwl),
          borderColor: theme.uwlColor,
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'LWL',
          data: Array(lineCount).fill(limits.lwl),
          borderColor: theme.lwlColor,
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [data, valueKey, limits, title, theme]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 10 },
          usePointStyle: true,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          afterBody: (context) => {
            const value = context[0]?.raw;
            if (value === undefined) return '';
            if (value < limits.lcl || value > limits.ucl) return '⛔ Status: OUT OF CONTROL';
            if (value < limits.lwl || value > limits.uwl) return '⚠️ Status: WARNING';
            return '✅ Status: IN CONTROL';
          },
        },
      },
    },
    scales: {
      y: {
        suggestedMin: limits.lcl - (limits.ucl - limits.lcl) * 0.2,
        suggestedMax: limits.ucl + (limits.ucl - limits.lcl) * 0.2,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 45 },
      },
    },
  };

  // Calculate latest value stats
  const validEntries = data.filter(d => d[valueKey] !== null && d[valueKey] !== undefined);
  const latestValue = validEntries.length > 0
    ? parseFloat(validEntries[validEntries.length - 1][valueKey])
    : null;
  let statusText = '';
  let statusColor = '#8e8e8e';
  if (latestValue !== null) {
    if (latestValue < limits.lcl || latestValue > limits.ucl) {
      statusText = `Latest: ${latestValue} - OUT OF CONTROL`;
      statusColor = '#f44336';
    } else if (latestValue < limits.lwl || latestValue > limits.uwl) {
      statusText = `Latest: ${latestValue} - WARNING`;
      statusColor = '#ff9800';
    } else {
      statusText = `Latest: ${latestValue} - IN CONTROL`;
      statusColor = '#00c853';
    }
  }

  // Chart header border color matches the theme
  const headerBorderStyle = {
    borderLeft: `4px solid ${theme.lineColor}`,
    paddingLeft: '0.75rem',
  };

  return (
    <div className="premium-card chart-container">
      <div className="chart-header" style={headerBorderStyle}>
        <h2>{title}</h2>
        <span className="chart-stats" style={{ color: statusColor, fontWeight: 600 }}>
          {statusText || 'No data'}
        </span>
      </div>
      <div className="chart-wrapper">
        {validEntries.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="empty-state" style={{ paddingTop: '4rem' }}>
            <p>No data points yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SPCChart;
