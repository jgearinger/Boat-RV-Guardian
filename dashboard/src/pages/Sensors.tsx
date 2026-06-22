import { useState, useEffect } from 'react';
import { nativeFetch } from '../utils/nativeFetch';

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

export default function Sensors({ category }: { category: 'flood' | 'batteries' | 'shore_power' }) {
  const [shellyServer, setShellyServer] = useState('');
  const [shellyAuthKey, setShellyAuthKey] = useState('');

  const [highPowerIds, setHighPowerIds] = useState<string[]>([]);
  const [lowPowerIds, setLowPowerIds] = useState<string[]>([]);
  const [floodSensorIds, setFloodSensorIds] = useState<string[]>([]);

  const [sensorData, setSensorData] = useState<Record<string, any>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setShellyServer(localStorage.getItem('sh_server') || '');
    setShellyAuthKey(localStorage.getItem('sh_auth_key') || '');
    try {
      setHighPowerIds(JSON.parse(localStorage.getItem('sh_high_power') || '[]').filter((id: string) => id));
      setLowPowerIds(JSON.parse(localStorage.getItem('sh_low_power') || '[]').filter((id: string) => id));
      setFloodSensorIds(JSON.parse(localStorage.getItem('sh_flood') || '[]').filter((id: string) => id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSensorStatus = async () => {
    if (!shellyServer || !shellyAuthKey) return;
    setIsRefreshing(true);
    
    const allIds = [...highPowerIds, ...lowPowerIds, ...floodSensorIds];
    const newData: Record<string, any> = {};

    for (const id of allIds) {
      if (!id) continue;
      try {
        const res = await unifiedFetch(`https://${shellyServer}/device/status?id=${id}&auth_key=${shellyAuthKey}`);
        const data = await res.json();
        if (data.isok && data.data && data.data.device_status) {
          newData[id] = data.data.device_status;
        } else {
          newData[id] = { error: 'Offline or Invalid' };
        }
      } catch (e) {
        newData[id] = { error: 'Fetch Error' };
      }
    }

    setSensorData(newData);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (shellyServer && shellyAuthKey) {
      fetchSensorStatus();
      const interval = setInterval(fetchSensorStatus, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [shellyServer, shellyAuthKey, highPowerIds, lowPowerIds, floodSensorIds]);

  const renderCard = (id: string, type: 'hp' | 'lp' | 'flood', index: number) => {
    const data = sensorData[id];
    
    let content = <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

    if (data?.error) {
      content = <div style={{ color: '#ef4444' }}>⚠️ {data.error}</div>;
    } else if (data) {
      if (type === 'hp') {
        const power = data['pm1:0']?.apower || data.meters?.[0]?.power || 0;
        const voltage = data['pm1:0']?.voltage || data.meters?.[0]?.voltage || 0;
        content = (
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{power.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>W</span></div>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{voltage.toFixed(1)} V</div>
          </div>
        );
      } else if (type === 'lp') {
        const voltage = data['voltmeter:0']?.voltage || data.adcs?.[0]?.voltage || 0;
        content = (
          <div>
             <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{voltage.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>V</span></div>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Battery Monitor</div>
          </div>
        );
      } else if (type === 'flood') {
        const isFlood = data['flood:0']?.alarm || data.flood?.alarm || false;
        const temp = data['temperature:0']?.tC || data.tmp?.tC || 0;
        const batt = data['battery:0']?.percent || data.bat?.value || 0;
        content = (
          <div>
            {isFlood ? (
               <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', animation: 'pulse 1s infinite' }}>🚨 FLOOD DETECTED!</div>
            ) : (
               <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>✅ Dry</div>
            )}
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
               <span>🌡️ {temp.toFixed(1)}°C</span>
               <span>🔋 {batt}%</span>
            </div>
          </div>
        );
      }
    }

    return (
      <div key={id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#fff' }}>Sensor {index + 1}</h4>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>{id}</span>
        </div>
        <div style={{ marginTop: '10px' }}>
          {content}
        </div>
      </div>
    );
  };

  if (!shellyServer || !shellyAuthKey) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>Sensors Not Configured</h2>
        <p>Please navigate to the Setup tab and enter your Shelly Cloud credentials.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--accent-cyan)', margin: 0 }}>Shelly Sensors</h2>
        <button onClick={fetchSensorStatus} disabled={isRefreshing} className="btn-secondary" style={{ padding: '8px 16px', background: 'rgba(0,242,254,0.1)', border: '1px solid var(--accent-cyan)' }}>
          {isRefreshing ? 'Refreshing...' : '🔄 Refresh Now'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {category === 'shore_power' && highPowerIds.length > 0 && (
          <div>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#f59e0b' }}>Shore Power (120v/240v)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {highPowerIds.map((id, index) => renderCard(id, 'hp', index))}
            </div>
          </div>
        )}

        {category === 'batteries' && lowPowerIds.length > 0 && (
          <div>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#10b981' }}>Batteries (10-26v)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {lowPowerIds.map((id, index) => renderCard(id, 'lp', index))}
            </div>
          </div>
        )}

        {category === 'flood' && floodSensorIds.length > 0 && (
          <div>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#3b82f6' }}>High Water / Flood Sensors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {floodSensorIds.map((id, index) => renderCard(id, 'flood', index))}
            </div>
          </div>
        )}

        {((category === 'shore_power' && highPowerIds.length === 0) || 
          (category === 'batteries' && lowPowerIds.length === 0) || 
          (category === 'flood' && floodSensorIds.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No sensors configured for this category yet. Go to Settings -&gt; Initial Setup to add Device IDs.</p>
          </div>
        )}

      </div>
    </div>
  );
}
