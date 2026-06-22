import { useState, useEffect } from 'react';
import type { DeviceConfig } from '../utils/VehicleManager';

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
  return fetch(url, options);
};

export default function ShellyWidget({ device }: { device: DeviceConfig }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [shellyServer, setShellyServer] = useState('');
  const [shellyAuthKey, setShellyAuthKey] = useState('');

  useEffect(() => {
    setShellyServer(localStorage.getItem('sh_server') || '');
    setShellyAuthKey(localStorage.getItem('sh_auth_key') || '');
  }, []);

  const fetchStatus = async () => {
    if (!shellyServer || !shellyAuthKey) return;
    try {
      const res = await unifiedFetch(`https://${shellyServer}/device/status?id=${device.id}&auth_key=${shellyAuthKey}`);
      const json = await res.json();
      if (json.isok && json.data && json.data.device_status) {
        setData(json.data.device_status);
        setError(null);
      } else {
        setError('Offline or Invalid');
      }
    } catch (e) {
      setError('Fetch Error');
    }
  };

  useEffect(() => {
    if (shellyServer && shellyAuthKey) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [shellyServer, shellyAuthKey, device.id]);

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
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        {content}
      </div>
    </div>
  );
}
