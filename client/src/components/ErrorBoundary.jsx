import { Component } from 'react';

// Catches any render-time throw in the React tree and shows the actual error
// instead of a silent black screen. Critical for diagnosing post-deploy issues.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary caught]', error, info);
  }

  handleReload = () => {
    this.setState({ error: null, info: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error, info } = this.state;
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.title}>⚠ Something broke</div>
          <div style={styles.subtitle}>
            The world hit an error while loading. The details below help pinpoint it.
          </div>
          <pre style={styles.stack}>
            {String(error?.message || error)}
            {'\n\n'}
            {error?.stack || ''}
            {info?.componentStack || ''}
          </pre>
          <button style={styles.btn} onClick={this.handleReload}>Reload</button>
        </div>
      </div>
    );
  }
}

const styles = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'radial-gradient(ellipse at center, #1a0a2a 0%, #000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, fontFamily: 'system-ui, sans-serif',
  },
  card: {
    maxWidth: 560, width: '100%', maxHeight: '80vh', overflow: 'auto',
    background: 'rgba(20,10,40,0.95)', border: '1px solid rgba(204,136,255,0.4)',
    borderRadius: 14, padding: 24, boxShadow: '0 0 60px rgba(100,20,200,0.4)',
  },
  title: { color: '#ff8888', fontSize: 20, fontWeight: 800, marginBottom: 8 },
  subtitle: { color: 'rgba(220,200,255,0.8)', fontSize: 14, marginBottom: 16 },
  stack: {
    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(204,136,255,0.2)',
    borderRadius: 8, padding: 14, color: '#ffb0b0', fontSize: 11,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5,
    fontFamily: 'monospace', marginBottom: 16,
  },
  btn: {
    background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)', border: 'none',
    color: '#0a0218', borderRadius: 8, padding: '10px 22px', fontSize: 14,
    fontWeight: 800, cursor: 'pointer',
  },
};
