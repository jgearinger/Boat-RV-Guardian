import { useState, useEffect } from 'react';
import { auth, signOut } from '../services/firebase';
import Login from './Login';
import { useCloudConfig, type LinkTapConfig } from '../hooks/useCloudConfig';

const APP_VERSION = '1.0.27';

export default function Settings({ user }: { user: any }) {
  const [showLogin, setShowLogin] = useState(false);

  // Settings State
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => localStorage.getItem('lt_unit') as 'metric' | 'imperial' || 'imperial');
  const [timeZone, setTimeZone] = useState(() => localStorage.getItem('lt_tz') || ((Intl as any).supportedValuesOf ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'));
  const [vesselNickname, setVesselNickname] = useState(() => localStorage.getItem('lt_vessel_name') || '');
  
  const [normalRunHours, setNormalRunHours] = useState(() => Number(localStorage.getItem('lt_nr_hrs') || '0'));
  const [normalRunMinutes, setNormalRunMinutes] = useState(() => Number(localStorage.getItem('lt_nr_mins') || '0'));
  const [normalRunDaily, setNormalRunDaily] = useState(() => localStorage.getItem('lt_nr_daily') === 'true');
  const [normalRunVolume, setNormalRunVolume] = useState(() => Number(localStorage.getItem('lt_nr_vol') || '10'));
  const [autoRestartNormal, setAutoRestartNormal] = useState(() => localStorage.getItem('lt_nr_auto') === 'true');

  // Cloud Sync State
  const { config, updateConfig } = useCloudConfig();
  const [linkTapState, setLinkTapState] = useState<LinkTapConfig>({ username: '', apiKey: '', gatewayId: '', taplinkerId: '' });
  const [cloudSaving, setCloudSaving] = useState(false);

  useEffect(() => {
    if (config?.linktap) {
      setLinkTapState(config.linktap);
    }
  }, [config?.linktap]);

  const handleSaveLinkTap = async () => {
    setCloudSaving(true);
    try {
      await updateConfig({ linktap: linkTapState });
    } catch (e: any) {
      console.error(e);
    }
    setCloudSaving(false);
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('lt_vessel_name', vesselNickname);
    localStorage.setItem('lt_unit', unitSystem);
    localStorage.setItem('lt_tz', timeZone);
    localStorage.setItem('lt_nr_hrs', normalRunHours.toString());
    localStorage.setItem('lt_nr_mins', normalRunMinutes.toString());
    localStorage.setItem('lt_nr_daily', normalRunDaily.toString());
    localStorage.setItem('lt_nr_vol', normalRunVolume.toString());
    localStorage.setItem('lt_nr_auto', autoRestartNormal.toString());

    window.dispatchEvent(new Event('settings_updated'));
  }, [vesselNickname, unitSystem, timeZone, normalRunHours, normalRunMinutes, normalRunDaily, normalRunVolume, autoRestartNormal]);

  const volUnit = unitSystem === 'imperial' ? 'Gallons' : 'Liters';

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: '#fff', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--accent-cyan)', margin: 0 }}>Global Settings</h2>
      
      <div className="glass-card">
        <h3 style={{ marginTop: 0, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>Account Information</h3>
        {!user ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Sign in to Boat-RV-Guardian to enable remote monitoring, cloud synchronization of your settings, and push notifications when you are away from the local network.
            </p>
            {!showLogin ? (
              <button 
                className="btn-primary"
                onClick={() => setShowLogin(true)}
                style={{ marginTop: '16px' }}
              >
                Log into Boat-RV-Guardian.com
              </button>
            ) : (
              <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                <Login />
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowLogin(false)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p><strong>Email:</strong> {user.email}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
              Your account is active. Cloud sync is enabled.
            </p>
            <button 
              className="btn-secondary"
              onClick={() => signOut(auth)}
              style={{ marginTop: '16px', border: '1px solid #ef4444', color: '#ef4444' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Normal Run Profile Config */}
      <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>Normal Run Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label">Duration</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="number" min="0" max="23" disabled={normalRunDaily} className="form-input" value={normalRunHours} onChange={(e) => setNormalRunHours(Math.min(23, Math.max(0, Number(e.target.value))))} style={{ width: '35%', padding: '8px', opacity: normalRunDaily ? 0.5 : 1 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, opacity: normalRunDaily ? 0.5 : 1 }}>hrs</span>
              <input type="number" min="0" max="59" disabled={normalRunDaily} className="form-input" value={normalRunMinutes} onChange={(e) => setNormalRunMinutes(Math.min(59, Math.max(0, Number(e.target.value))))} style={{ width: '35%', padding: '8px', opacity: normalRunDaily ? 0.5 : 1 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, opacity: normalRunDaily ? 0.5 : 1 }}>mins</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={normalRunDaily} onChange={(e) => setNormalRunDaily(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Daily</span>
              </label>
            </div>
          </div>
          <div>
            <label className="form-label">Volume Limit ({volUnit})</label>
            <input type="number" min="1" className="form-input" value={normalRunVolume} onChange={(e) => setNormalRunVolume(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <input type="checkbox" checked={autoRestartNormal} onChange={(e) => setAutoRestartNormal(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-restart profile automatically when time expires</span>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginTop: 0, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>Link-Tap Hardware Config</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div>
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={linkTapState.username} onChange={(e) => setLinkTapState({...linkTapState, username: e.target.value})} placeholder="e.g. jgearinger" />
          </div>
          <div>
            <label className="form-label">API Key</label>
            <input type="password" className="form-input" value={linkTapState.apiKey} onChange={(e) => setLinkTapState({...linkTapState, apiKey: e.target.value})} placeholder="Found in your Link-Tap Account Settings" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Gateway ID</label>
              <input type="text" className="form-input" value={linkTapState.gatewayId} onChange={(e) => setLinkTapState({...linkTapState, gatewayId: e.target.value})} placeholder="16 character hex" />
            </div>
            <div>
              <label className="form-label">Taplinker ID</label>
              <input type="text" className="form-input" value={linkTapState.taplinkerId} onChange={(e) => setLinkTapState({...linkTapState, taplinkerId: e.target.value})} placeholder="16 character hex" />
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSaveLinkTap} 
            disabled={!user || cloudSaving}
            style={{ marginTop: '8px' }}
          >
            {cloudSaving ? 'Saving to Firebase...' : (!user ? 'Login Required to Save' : 'Save Config to Cloud')}
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginTop: 0, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>App Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div>
            <label className="form-label">Vessel / Vehicle Nickname</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. My Boat or RV"
              value={vesselNickname} 
              onChange={(e) => setVesselNickname(e.target.value)} 
            />
          </div>
          <div>
            <label className="form-label">Units</label>
            <select className="form-input" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}>
              <option value="metric">Metric (Liters)</option>
              <option value="imperial">Imperial (Gallons)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Time Zone</label>
            <select className="form-input" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {(Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone').map((tz: string) => (
                <option key={tz} value={tz}>{tz}</option>
              )) : <option value={timeZone}>{timeZone}</option>}
            </select>
          </div>
        </div>
      </div>



      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Boat &amp; RV Guardian v{APP_VERSION}</div>
        <a
          href="https://github.com/jgearinger/Boat-RV-Guardian/releases"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <button className="btn-secondary" style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}>
            🔄 Check for Updates on GitHub
          </button>
        </a>
      </div>
      
    </div>
  );
}
