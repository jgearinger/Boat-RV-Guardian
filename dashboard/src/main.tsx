import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Error boundary to show crash details instead of blank screen
class ErrorBoundary extends Component<{children: any}, {error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#0a0f1d', color: '#ff4444', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff6666' }}>⚠️ App Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

let root = (window as any)._reactRoot;
if (!root) {
  root = createRoot(document.getElementById('root')!);
  (window as any)._reactRoot = root;
}
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// No service worker: in the native app it caches stale chunks across updates. Actively remove any
// previously-registered SW and clear its caches so the app always loads fresh local assets.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
if (typeof caches !== 'undefined') {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}
