import { useState, useEffect } from 'react';
import { getDevices, type DeviceConfig } from '../utils/VehicleManager';
import LinkTapWidget from '../components/LinkTapWidget';
import ShellyWidget from '../components/ShellyWidget';

export default function Dashboard() {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);

  useEffect(() => {
    const load = () => {
      setDevices(getDevices());
    };
    load();
    window.addEventListener('settings_updated', load);
    return () => window.removeEventListener('settings_updated', load);
  }, []);

  return (
    <div style={{ flex: 1, paddingBottom: '40px' }}>
      
      {/* Top Main Dashboard Container */}
      <div className="p-4 flex flex-col space-y-6" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(90deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, paddingBottom: '10px' }}>
          Fresh Water Systems
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {devices.map((device, idx) => {
            if (device.type === 'linktap_valve') {
              return <LinkTapWidget key={device.id || idx} device={device} />;
            } else if (device.type === 'shelly_sensor') {
              return <ShellyWidget key={device.id || idx} device={device} />;
            }
            return null;
          })}

          {devices.filter(d => d.type === 'linktap_valve' || d.type === 'shelly_sensor').length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No Fresh Water LinkTap devices configured.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
