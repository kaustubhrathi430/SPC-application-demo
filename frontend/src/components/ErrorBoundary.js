import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="selection-page">
          <div className="premium-card" style={{
            padding: '3rem',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x26A0;</div>
            <h2 style={{ marginBottom: '0.75rem' }}>Something Went Wrong</h2>
            <p style={{ color: 'var(--text-light)', margin: '1rem 0', lineHeight: 1.6 }}>
              An unexpected error occurred. Your data has been saved. Please refresh the page to continue.
            </p>
            <button
              className="premium-btn"
              onClick={() => window.location.reload()}
              style={{ maxWidth: '240px', margin: '1rem auto 0' }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
