import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            We're sorry for the inconvenience. Please refresh the page to try again.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              Back to Map
            </button>
          </div>
          {this.state.error && (
            <details style={{
              marginTop: '32px',
              textAlign: 'left',
              backgroundColor: '#fef2f2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              maxWidth: '680px',
              margin: '32px auto 0 auto'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 600, color: '#b91c1c' }}>
                Technical Error Details (Click to Expand)
              </summary>
              <pre style={{
                fontSize: '12px',
                overflow: 'auto',
                color: '#991b1b',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
