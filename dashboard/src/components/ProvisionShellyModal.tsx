import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

// Helper to use Tauri's fetch if available, otherwise browser fetch
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

export default function ProvisionShellyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'selection' | 'ble_scanning' | 'credentials' | 'ip_entry' | 'provisioning' | 'completion'>('selection');
  const [method, setMethod] = useState<'wifi' | 'manual_ip' | 'bluetooth' | null>(null);
  
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [shellyPassword, setShellyPassword] = useState('');
  const [deviceRole, setDeviceRole] = useState('High Power Sensor');
  
  // Bluetooth specific state
  const [bleDevices, setBleDevices] = useState<{id: string, name: string}[]>([]);
  const [selectedBleDevice, setSelectedBleDevice] = useState<string>('');
  
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic ordering: Bluetooth first on mobile, Wi-Fi first on desktop
  const isMobile = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth <= 768);
  
  const handleSelectMethod = (selected: 'wifi' | 'manual_ip' | 'bluetooth') => {
    setMethod(selected);
    if (selected === 'wifi') setStep('credentials');
    if (selected === 'manual_ip') setStep('ip_entry');
    if (selected === 'bluetooth') {
      setStep('ble_scanning');
      startBleScan();
    }
  };

  const startBleScan = () => {
    setIsProcessing(true);
    setBleDevices([]);
    setStatusMessage('Scanning for nearby Shelly devices...');
    
    // Mock a BLE scan process
    setTimeout(() => {
      setBleDevices([
        { id: 'ble_1', name: 'ShellyPlusUni-A1B2C3' },
        { id: 'ble_2', name: 'ShellyFlood-987654' }
      ]);
      setSelectedBleDevice('ble_1');
      setStatusMessage('');
      setIsProcessing(false);
    }, 2500);
  };

  const executeWifiProvisioning = async () => {
    setIsProcessing(true);
    try {
      setStatusMessage('Getting Device ID (1/3)...');
      let shellyDeviceId = 'UNKNOWN_SHELLY';
      try {
        const infoRes = await unifiedFetch(`http://192.168.33.1/rpc/Shelly.GetDeviceInfo`);
        const info = await infoRes.json();
        shellyDeviceId = info.id || info.mac;
      } catch (e) {
        console.warn('Could not fetch device info', e);
      }

      setStatusMessage('Configuring Device (2/3)...');
      // 1. Configure Webhook
      const cloudflareUrl = 'https://boat-rv-guardian-worker.yourdomain.workers.dev/api/shelly'; // Replace with actual worker URL later
      // Shelly Gen 2/3 Webhook.Create format
      await unifiedFetch(`http://192.168.33.1/rpc/Webhook.Create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid: 0,
          enable: true,
          event: "sys.online", // or other events depending on sensor type
          urls: [cloudflareUrl]
        })
      });

      setStatusMessage('Sending Wi-Fi Credentials (3/3)...');
      // 2. Setup Wi-Fi and reboot
      await unifiedFetch(`http://192.168.33.1/rpc/Wifi.SetConfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            sta: { ssid: ssid, pass: password, is_open: password.length === 0, enable: true }
          }
        })
      });
      
      const { addDevice } = await import('../utils/VehicleManager');
      addDevice({
        id: 'brv_sh_' + Math.random().toString(36).substr(2, 9),
        type: 'shelly_sensor',
        role: deviceRole,
        name: deviceRole,
        shellyDeviceId: shellyDeviceId
      });

      setStep('completion');
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}. Are you connected to the Shelly AP?`);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeManualIpProvisioning = async () => {
    setIsProcessing(true);
    
    // Setup Basic Auth header if password provided
    const headers: any = { 'Content-Type': 'application/json' };
    if (shellyPassword) {
      headers['Authorization'] = 'Basic ' + btoa('admin:' + shellyPassword);
    }
    
    setStatusMessage('Getting Device ID (1/2)...');
    let shellyDeviceId = 'UNKNOWN_SHELLY';
    try {
      const cloudflareUrl = 'https://boat-rv-guardian-worker.yourdomain.workers.dev/api/shelly';
      
      const infoRes = await unifiedFetch(`http://${localIp}/rpc/Shelly.GetDeviceInfo`, { headers });
      const info = await infoRes.json();
      shellyDeviceId = info.id || info.mac;
      
      setStatusMessage('Configuring Device (2/2)...');
      await unifiedFetch(`http://${localIp}/rpc/Webhook.Create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cid: 0,
          enable: true,
          event: "sys.online", 
          urls: [cloudflareUrl]
        })
      });
      
      const { addDevice } = await import('../utils/VehicleManager');
      addDevice({
        id: 'brv_sh_' + Math.random().toString(36).substr(2, 9),
        type: 'shelly_sensor',
        role: deviceRole,
        name: deviceRole,
        shellyDeviceId: shellyDeviceId
      });
      
      setStep('completion');
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}. Ensure the IP is correct and on your network.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeBluetoothProvisioning = async () => {
    setIsProcessing(true);
    setStatusMessage('Connecting via BLE...');
    
    // Mock the BLE provisioning process
    setTimeout(() => {
      setStatusMessage('Sending Wi-Fi credentials via BLE...');
      
      setTimeout(async () => {
        setStatusMessage('Configuring cloud Webhook via BLE...');
        
        const { addDevice } = await import('../utils/VehicleManager');
        const selectedDev = bleDevices.find(d => d.id === selectedBleDevice);
        
        addDevice({
          id: 'brv_sh_' + Math.random().toString(36).substr(2, 9),
          type: 'shelly_sensor',
          role: deviceRole,
          name: deviceRole,
          shellyDeviceId: selectedDev ? selectedDev.name.split('-')[1] || 'BLE_DEVICE' : 'BLE_DEVICE'
        });
        
        setStep('completion');
        setIsProcessing(false);
      }, 1500);
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
          color: '#fff', fontSize: '1.5rem', cursor: 'pointer'
        }}>×</button>

        <h2 style={{ marginTop: 0, color: 'var(--accent-cyan)', marginBottom: '20px' }}>Add Shelly Device</h2>

        {step === 'selection' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>How would you like to set up your device?</p>
            
            {/* Show Bluetooth first on Mobile, but always show both options for flexibility */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column-reverse', gap: '15px' }}>
              <button className="btn-secondary" onClick={() => handleSelectMethod('wifi')} style={{ padding: '15px', textAlign: 'left', background: !isMobile ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', border: !isMobile ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>📡 Set up via Wi-Fi AP {(!isMobile) && '(Recommended)'}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Best for desktops or if Bluetooth fails.</span>
              </button>

              <button className="btn-secondary" onClick={() => handleSelectMethod('bluetooth')} style={{ padding: '15px', textAlign: 'left', background: isMobile ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', border: isMobile ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>📱 Set up via Bluetooth {(isMobile) && '(Recommended)'}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Best for new Gen 2/3 devices out of the box.</span>
              </button>
            </div>

            <button className="btn-secondary" onClick={() => handleSelectMethod('manual_ip')} style={{ padding: '15px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <strong style={{ display: 'block', fontSize: '1.1rem' }}>⚙️ Existing Device (Manual IP)</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>For devices already connected to your Wi-Fi.</span>
            </button>
            
            <div style={{ marginTop: '10px' }}>
              <label className="form-label">What kind of sensor is this?</label>
              <select className="form-input" value={deviceRole} onChange={(e) => setDeviceRole(e.target.value)}>
                <option value="High Power Sensor">High Power Sensor (120v/240v)</option>
                <option value="Low Power Sensor">Low Power Sensor (10-26v)</option>
                <option value="Flood Sensor">Flood Sensor</option>
              </select>
            </div>
          </div>
        )}

        {step === 'ble_scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Bluetooth Discovery</h3>
            
            {isProcessing ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <p style={{ color: 'var(--accent-cyan)' }}>{statusMessage}</p>
                <div style={{ marginTop: '15px' }}>
                  {/* Mock spinner */}
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '2rem' }}>⚙️</span>
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)' }}>Select your Shelly device from the list below:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bleDevices.map(d => (
                    <button 
                      key={d.id} 
                      className={selectedBleDevice === d.id ? "btn-primary" : "btn-secondary"}
                      onClick={() => setSelectedBleDevice(d.id)}
                      style={{ padding: '12px', textAlign: 'left' }}
                    >
                      {d.name}
                    </button>
                  ))}
                  {bleDevices.length === 0 && <p style={{ color: '#ef4444' }}>No devices found. Ensure the device is powered and in pairing mode.</p>}
                </div>
                
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-secondary" onClick={() => setStep('selection')}>Back</button>
                  <button className="btn-primary" onClick={() => setStep('credentials')} disabled={!selectedBleDevice}>Next Step</button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'credentials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Enter the Wi-Fi details for your Boat/RV network.</p>
            <div>
              <label className="form-label">Wi-Fi Network Name (SSID)</label>
              <input className="form-input" type="text" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="e.g. BoatNetwork" />
            </div>
            <div>
              <label className="form-label">Wi-Fi Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => {
                if (method === 'bluetooth') setStep('ble_scanning');
                else setStep('selection');
              }}>Back</button>
              <button className="btn-primary" onClick={() => setStep('provisioning')} disabled={!ssid}>Next Step</button>
            </div>
          </div>
        )}

        {step === 'ip_entry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Enter the local IP address of your Shelly device on the network.</p>
            <div>
              <label className="form-label">Local IP Address</label>
              <input className="form-input" type="text" value={localIp} onChange={e => setLocalIp(e.target.value)} placeholder="e.g. 192.168.1.50" />
            </div>
            <div>
              <label className="form-label">Shelly Device Password (Optional)</label>
              <input className="form-input" type="password" value={shellyPassword} onChange={e => setShellyPassword(e.target.value)} placeholder="Leave blank if no auth enabled" />
            </div>
            
            {statusMessage && <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '10px' }}>{statusMessage}</div>}
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep('selection')} disabled={isProcessing}>Back</button>
              <button className="btn-primary" onClick={executeManualIpProvisioning} disabled={!localIp || isProcessing}>
                {isProcessing ? 'Configuring...' : 'Configure Device'}
              </button>
            </div>
          </div>
        )}

        {step === 'provisioning' && method === 'wifi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Action Required</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', color: '#fff', fontSize: '0.95rem' }}>
                <li>Open your computer/phone Wi-Fi settings.</li>
                <li>Connect to the Shelly's network (usually <code>shellyplusuni-xxxx</code>).</li>
                <li>Once connected, click "Connect & Arm" below.</li>
              </ol>
            </div>
            
            {statusMessage && <div style={{ color: statusMessage.includes('Error') ? '#ef4444' : 'var(--accent-cyan)', fontSize: '0.9rem', marginTop: '10px', textAlign: 'center' }}>{statusMessage}</div>}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep('credentials')} disabled={isProcessing}>Back</button>
              <button className="btn-primary" onClick={executeWifiProvisioning} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Connect & Arm'}
              </button>
            </div>
          </div>
        )}

        {step === 'provisioning' && method === 'bluetooth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Provisioning device over Bluetooth LE...</p>
            
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--accent-cyan)' }}>{statusMessage}</p>
              <div style={{ marginTop: '15px' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '2rem' }}>⚙️</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep('credentials')} disabled={isProcessing}>Back</button>
              <button className="btn-primary" onClick={executeBluetoothProvisioning} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Start Provisioning'}
              </button>
            </div>
          </div>
        )}

        {step === 'completion' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✅</div>
            <h3 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Device Armed!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Your device has been successfully configured to send critical alerts. 
              {method === 'wifi' && " Don't forget to reconnect your computer/phone back to your normal Boat/RV Wi-Fi."}
            </p>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%', padding: '12px' }}>Done</button>
          </div>
        )}

      </div>
    </div>
  );
}
