import { auth, signOut } from '../services/firebase';
import Login from './Login';

export default function Settings({ user }: { user: any }) {
  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>Cloud Sync & Remote Monitoring</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          Sign in or create a free account to enable remote monitoring, cloud synchronization of your settings, and push notifications when you are away from the local network.
        </p>
        <Login />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>Settings</h2>
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-blue)' }}>Account Information</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Your account is active. Cloud sync is enabled.
        </p>
        <button 
          className="btn-secondary"
          onClick={() => signOut(auth)}
          style={{ marginTop: '15px', padding: '8px 16px', fontSize: '0.9rem', border: '1px solid #ef4444', color: '#ef4444' }}
        >
          Sign Out
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: 'var(--accent-blue)' }}>Device Configuration</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure your LinkTap API keys and Shelly device IPs here. These settings are synced to your account.
        </p>
        {/* Placeholder for future configuration fields */}
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>LinkTap API Key</label>
          <input 
            type="password" 
            placeholder="Enter API Key"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff' }}
          />
        </div>
        <button className="btn-primary" style={{ marginTop: '15px' }}>Save Configuration</button>
      </div>
    </div>
  );
}
