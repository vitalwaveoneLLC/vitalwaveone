import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Increment error counter
    this.setState(prev => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log error safely (no sensitive data)
    console.error('ErrorBoundary caught:', {
      message: error.toString(),
      component: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f5f0',
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>⚠️</div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#0a1628',
            }}>
              Something went wrong
            </h1>

            <p style={{
              color: '#6b7280',
              marginBottom: '24px',
              fontSize: '14px',
            }}>
              {this.state.error ? this.state.error.toString() : 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{
                textAlign: 'left',
                background: '#f9f8f5',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '11px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Debug Info</summary>
                <pre style={{ margin: '12px 0 0 0', overflow: 'auto' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              style={{
                background: '#0a1628',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#162540'}
              onMouseLeave={(e) => e.target.style.background = '#0a1628'}
            >
              Try Again
            </button>

            {this.state.errorCount > 3 && (
              <p style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#dc2626',
              }}>
                Multiple errors detected. Please refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
