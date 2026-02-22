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
} from 'chart.js';
import { getStatusColor, formatTime } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function SPCChart({ title, data, valueKey, limits }) {
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
          borderColor: '#0066ff',
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Target',
          data: Array(lineCount).fill(limits.target),
          borderColor: '#00c853',
          borderDash: [8, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'UCL',
          data: Array(lineCount).fill(limits.ucl),
          borderColor: '#f44336',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'LCL',
          data: Array(lineCount).fill(limits.lcl),
          borderColor: '#f44336',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'UWL',
          data: Array(lineCount).fill(limits.uwl),
          borderColor: '#ff9800',
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'LWL',
          data: Array(lineCount).fill(limits.lwl),
          borderColor: '#ff9800',
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [data, valueKey, limits, title]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 10 }, usePointStyle: true } },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const value = context[0]?.raw;
            if (value === undefined) return '';
            if (value < limits.lcl || value > limits.ucl) return 'Status: OUT OF CONTROL';
            if (value < limits.lwl || value > limits.uwl) return 'Status: WARNING';
            return 'Status: IN CONTROL';
          },
        },
      },
    },
    scales: {
      y: {
        // Auto-scale with padding
        suggestedMin: limits.lcl - (limits.ucl - limits.lcl) * 0.2,
        suggestedMax: limits.ucl + (limits.ucl - limits.lcl) * 0.2,
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
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

  return (
    <div className="premium-card chart-container">
      <div className="chart-header">
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
