import { useState, useEffect } from 'react';
import type { DeviceConfig } from '../utils/VehicleManager';
import { nativeFetch } from '../utils/nativeFetch';
import { shellyRpc } from '../utils/shellyRpc';

const isTauriEnv = () => typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).isTauri);

const unifiedFetch = async (url: string, options?: any) => {
  if (isTauriEnv()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(url, {
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body
    });
  }
  return nativeFetch(url, options) as any;
};

export default function ShellyWidget({ device }: { device: DeviceConfig }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'cloud' | null>(null);
  const [shellyServer, setShellyServer] = useState('');
  const [shellyAuthKey, setShellyAuthKey] = useState('');
  const localIp = device.localIp;

  useEffect(() => {
    setShellyServer(localStorage.getItem('sh_server') || '');
    setShellyAuthKey(localStorage.getItem('sh_auth_key') || '');
  }, []);

  const fetchStatus = async () => {
    // Prefer local RPC when the device IP is known — faster, no cloud dependency.
    // Shelly.GetStatus returns the same status shape the cloud reports as device_status.
    // shellyRpc authenticates with the vehicle password only if the device is secured.
    if (localIp) {
      try {
        const json = await shellyRpc(localIp, 'Shelly.GetStatus', {}, localStorage.getItem('sh_local_password') || undefined);
        if (json && !json.error) {
          setData(json);
          setSource('local');
          setError(null);
          return;
        }
      } catch { /* fall back to cloud below */ }
    }

    if (shellyServer && shellyAuthKey) {
      try {
        const res = await unifiedFetch(`https://${shellyServer}/device/status?id=${device.id}&auth_key=${shellyAuthKey}`);
        const json = await res.json();
        if (json.isok && json.data && json.data.device_status) {
          setData(json.data.device_status);
          setSource('cloud');
          setError(null);
          return;
        }
      } catch { /* ignore */ }
      setError('Offline or Invalid');
    } else if (localIp) {
      setError('Unreachable on local network');
    }
  };

  useEffect(() => {
    if (!localIp && !(shellyServer && shellyAuthKey)) return;
    fetchStatus();
    // Local polling can be brisk; cloud is rate-limited so keep it slower.
    const interval = setInterval(fetchStatus, localIp ? 8000 : 15000);
    return () => clearInterval(interval);
  }, [localIp, shellyServer, shellyAuthKey, device.id]);

  let content = <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  if (error) {
    content = <div style={{ color: '#ef4444' }}>⚠️ {error}</div>;
  } else if (data) {
    if (device.role === 'High Power Sensor') {
      const power = data['pm1:0']?.apower || data.meters?.[0]?.power || 0;
      const voltage = data['pm1:0']?.voltage || data.meters?.[0]?.voltage || 0;
      content = (
        <div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{power.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>W</span></div>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{voltage.toFixed(1)} V</div>
        </div>
      );
    } else if (device.role === 'Low Power Sensor') {
      const voltage = data['voltmeter:0']?.voltage || data.adcs?.[0]?.voltage || 0;
      content = (
        <div>
           <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{voltage.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>V</span></div>
           <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Battery Monitor</div>
        </div>
      );
    } else if (device.role === 'Flood Sensor') {
      const isFlood = data['flood:0']?.alarm || data.flood?.alarm || false;
      const battery = data.device_power?.battery?.percent || data.bat?.value || 0;
      content = (
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: isFlood ? '#ef4444' : '#10b981' }}>
            {isFlood ? 'ALARM / WET' : 'DRY (SAFE)'}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Battery: {battery}%</div>
        </div>
      );
    } else {
       content = <div>Unknown Shelly Type</div>;
    }
  }

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-orange)' }}>
          {device.name || `Shelly ${device.role}`}
        </h3>
        {source && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '10px',
            color: source === 'local' ? '#10b981' : 'var(--accent-cyan)',
            background: source === 'local' ? 'rgba(16,185,129,0.12)' : 'rgba(0,242,254,0.1)' }}>
            {source === 'local' ? '🏠 LOCAL' : '☁️ CLOUD'}
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        {content}
      </div>
    </div>
  );
}
