import { useState, useEffect } from 'react';

export default function Setup() {
  // LinkTap State
  const [cloudUsername, setCloudUsername] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [gatewayIp, setGatewayIp] = useState('');
  const [gatewayId, setGatewayId] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Shelly Cloud State
  const [shellyServer, setShellyServer] = useState('');
  const [shellyAuthKey, setShellyAuthKey] = useState('');

  // Shelly Devices State
  const [highPowerIds, setHighPowerIds] = useState<string[]>(['', '', '', '']);
  const [lowPowerIds, setLowPowerIds] = useState<string[]>(['', '', '', '']);
  const [floodSensorIds, setFloodSensorIds] = useState<string[]>(['', '', '', '']);

  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    // Load from localStorage on mount
    setCloudUsername(localStorage.getItem('lt_cloud_user') || '');
    setCloudApiKey(localStorage.getItem('lt_cloud_key') || '');
    setGatewayIp(localStorage.getItem('lt_gateway_ip') || '');
    setGatewayId(localStorage.getItem('lt_gateway_id') || '');
    setDeviceId(localStorage.getItem('lt_device_id') || '');

    setShellyServer(localStorage.getItem('sh_server') || 'shelly-1-eu.shelly.cloud');
    setShellyAuthKey(localStorage.getItem('sh_auth_key') || '');

    try {
      setHighPowerIds(JSON.parse(localStorage.getItem('sh_high_power') || '["", "", "", ""]'));
      setLowPowerIds(JSON.parse(localStorage.getItem('sh_low_power') || '["", "", "", ""]'));
      setFloodSensorIds(JSON.parse(localStorage.getItem('sh_flood') || '["", "", "", ""]'));
    } catch (e) {
      console.error('Failed to parse shelly device IDs', e);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('lt_cloud_user', cloudUsername);
    localStorage.setItem('lt_cloud_key', cloudApiKey);
    localStorage.setItem('lt_gateway_ip', gatewayIp);
    localStorage.setItem('lt_gateway_id', gatewayId);
    localStorage.setItem('lt_device_id', deviceId);

    localStorage.setItem('sh_server', shellyServer);
    localStorage.setItem('sh_auth_key', shellyAuthKey);

    localStorage.setItem('sh_high_power', JSON.stringify(highPowerIds));
    localStorage.setItem('sh_low_power', JSON.stringify(lowPowerIds));
    localStorage.setItem('sh_flood', JSON.stringify(floodSensorIds));

    setSavedMessage('Settings Saved Successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const updateDeviceList = (list: string[], index: number, val: string, setter: any) => {
    const newList = [...list];
    newList[index] = val;
    setter(newList);
  };

  return (
    <div style={{ color: '#fff', width: '100%' }}>
      
      {/* LinkTap Section */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--accent-cyan)' }}>LinkTap Valve Configuration</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label className="form-label">Gateway IP Address (Local API)</label>
            <input className="form-input" type="text" value={gatewayIp} onChange={e => setGatewayIp(e.target.value)} placeholder="e.g. 192.168.1.100" />
          </div>
          <div>
            <label className="form-label">Gateway ID</label>
            <input className="form-input" type="text" value={gatewayId} onChange={e => setGatewayId(e.target.value)} placeholder="16-character Gateway ID" />
          </div>
          <div>
            <label className="form-label">Taplinker Device ID</label>
            <input className="form-input" type="text" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="16-character Device ID" />
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
          <div>
            <label className="form-label">Cloud Username</label>
            <input className="form-input" type="text" value={cloudUsername} onChange={e => setCloudUsername(e.target.value)} placeholder="LinkTap Account Username" />
          </div>
          <div>
            <label className="form-label">Cloud API Key</label>
            <input className="form-input" type="password" value={cloudApiKey} onChange={e => setCloudApiKey(e.target.value)} placeholder="LinkTap API Key" />
          </div>
        </div>
      </div>

      {/* Shelly Section */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#f59e0b' }}>Shelly Cloud Authentication</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Used to retrieve telemetry for your Shelly sensors without needing static local IPs.</p>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label className="form-label">Shelly Cloud Server URL</label>
            <input className="form-input" type="text" value={shellyServer} onChange={e => setShellyServer(e.target.value)} placeholder="e.g. shelly-1-eu.shelly.cloud" />
          </div>
          <div>
            <label className="form-label">Shelly Authorization Key</label>
            <input className="form-input" type="password" value={shellyAuthKey} onChange={e => setShellyAuthKey(e.target.value)} placeholder="Found in Shelly App -> User Settings -> Authorization Cloud Key" />
          </div>
        </div>
      </div>

      {/* Shelly Devices */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#f59e0b' }}>Shelly Devices Configuration</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Enter the unique 6 or 12 character Device ID for each sensor you want to monitor.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', marginBottom: '8px' }}>High Power Sensors (120v/240v - PM Mini Gen3)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[0, 1, 2, 3].map(i => (
              <input key={`hp-${i}`} className="form-input" type="text" placeholder={`Device ID ${i+1}`} value={highPowerIds[i]} onChange={e => updateDeviceList(highPowerIds, i, e.target.value, setHighPowerIds)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', marginBottom: '8px' }}>Low Power Sensors (10-26v - Plus Uni)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[0, 1, 2, 3].map(i => (
              <input key={`lp-${i}`} className="form-input" type="text" placeholder={`Device ID ${i+1}`} value={lowPowerIds[i]} onChange={e => updateDeviceList(lowPowerIds, i, e.target.value, setLowPowerIds)} />
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ color: '#fff', marginBottom: '8px' }}>Flood Sensors (Flood Gen4)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[0, 1, 2, 3].map(i => (
              <input key={`fl-${i}`} className="form-input" type="text" placeholder={`Device ID ${i+1}`} value={floodSensorIds[i]} onChange={e => updateDeviceList(floodSensorIds, i, e.target.value, setFloodSensorIds)} />
            ))}
          </div>
        </div>
      </div>

      {savedMessage && (
        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
          {savedMessage}
        </div>
      )}

      <button onClick={handleSave} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
        Save Settings
      </button>
    </div>
  );
}
