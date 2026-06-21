import { useState, useEffect } from 'react';
import { auth, signOut } from '../services/firebase';
import Login from './Login';

const APP_VERSION = '1.0.26';

export default function Settings({ user }: { user: any }) {
  const [showLogin, setShowLogin] = useState(false);

  // Settings State
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => localStorage.getItem('lt_unit') as 'metric' | 'imperial' || 'imperial');
  const [timeZone, setTimeZone] = useState(() => localStorage.getItem('lt_tz') || ((Intl as any).supportedValuesOf ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'));
  const [resetTime, setResetTime] = useState(() => localStorage.getItem('lt_reset_time') || '12:00');
  
  const [normalRunHours, setNormalRunHours] = useState(() => Number(localStorage.getItem('lt_nr_hrs') || '0'));
  const [normalRunMinutes, setNormalRunMinutes] = useState(() => Number(localStorage.getItem('lt_nr_mins') || '0'));
  const [normalRunDaily, setNormalRunDaily] = useState(() => localStorage.getItem('lt_nr_daily') === 'true');
  const [normalRunVolume, setNormalRunVolume] = useState(() => Number(localStorage.getItem('lt_nr_vol') || '10'));
  const [autoRestartNormal, setAutoRestartNormal] = useState(() => localStorage.getItem('lt_nr_auto') === 'true');

  const [autoGuardEnabled, setAutoGuardEnabled] = useState(() => localStorage.getItem('lt_auto_guard') !== 'false');
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('lt_notifications') === 'true');
  const [notifyAutoGuard, setNotifyAutoGuard] = useState(() => localStorage.getItem('lt_notify_ag') !== 'false');
  const [alertOffline, setAlertOffline] = useState(() => localStorage.getItem('lt_notify_offline') !== 'false');
  const [notifyLowBattery, setNotifyLowBattery] = useState(() => localStorage.getItem('lt_notify_batt') !== 'false');
  const [notifyWatering, setNotifyWatering] = useState(() => localStorage.getItem('lt_notify_water') === 'true');

  const [alarmSound, setAlarmSound] = useState<'siren' | 'beep' | 'off'>(() => (localStorage.getItem('lt_alarm_sound') as any) || 'beep');
  const [alarmRepeatInterval, setAlarmRepeatInterval] = useState<'once'|'5'|'15'|'30'|'60'>(() => (localStorage.getItem('lt_alarm_interval') as any) || '15');
  const [alarmVolume, setAlarmVolume] = useState(() => Number(localStorage.getItem('lt_alarm_vol') || '1.0'));
  const [maxFlowRate, setMaxFlowRate] = useState(() => Number(localStorage.getItem('lt_max_flow') || '15'));
  const [maxDuration, setMaxDuration] = useState(() => Number(localStorage.getItem('lt_max_dur') || '30'));

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('lt_unit', unitSystem);
    localStorage.setItem('lt_tz', timeZone);
    localStorage.setItem('lt_reset_time', resetTime);
    localStorage.setItem('lt_nr_hrs', normalRunHours.toString());
    localStorage.setItem('lt_nr_mins', normalRunMinutes.toString());
    localStorage.setItem('lt_nr_daily', normalRunDaily.toString());
    localStorage.setItem('lt_nr_vol', normalRunVolume.toString());
    localStorage.setItem('lt_nr_auto', autoRestartNormal.toString());
    localStorage.setItem('lt_auto_guard', autoGuardEnabled.toString());
    localStorage.setItem('lt_notifications', notificationsEnabled.toString());
    localStorage.setItem('lt_notify_ag', notifyAutoGuard.toString());
    localStorage.setItem('lt_notify_offline', alertOffline.toString());
    localStorage.setItem('lt_notify_batt', notifyLowBattery.toString());
    localStorage.setItem('lt_notify_water', notifyWatering.toString());
    localStorage.setItem('lt_alarm_sound', alarmSound);
    localStorage.setItem('lt_alarm_interval', alarmRepeatInterval);
    localStorage.setItem('lt_alarm_vol', alarmVolume.toString());
    localStorage.setItem('lt_max_flow', maxFlowRate.toString());
    localStorage.setItem('lt_max_dur', maxDuration.toString());

    window.dispatchEvent(new Event('settings_updated'));
  }, [unitSystem, timeZone, resetTime, normalRunHours, normalRunMinutes, normalRunDaily, normalRunVolume, autoRestartNormal, autoGuardEnabled, notificationsEnabled, notifyAutoGuard, alertOffline, notifyLowBattery, notifyWatering, alarmSound, alarmRepeatInterval, alarmVolume, maxFlowRate, maxDuration]);

  const volUnit = unitSystem === 'imperial' ? 'Gallons' : 'Liters';
  const speedUnit = unitSystem === 'imperial' ? 'GPM' : 'L/min';

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
        <h3 style={{ marginTop: 0, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>App Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
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
          <div>
            <label className="form-label">Daily Counter Reset Time</label>
            <input type="time" className="form-input" value={resetTime} onChange={(e) => setResetTime(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Flooding Sentry</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: autoGuardEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{autoGuardEnabled ? 'AUTO-GUARD ON' : 'DISABLED'}</span>
            <input type="checkbox" checked={autoGuardEnabled} onChange={(e) => setAutoGuardEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automatically shuts down the local water connection (cmd: 7) if values exceed thresholds or physical anomalies occur.</p>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Notifications & Alarms</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: notificationsEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{notificationsEnabled ? 'ENABLED' : 'DISABLED'}</span>
            <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={notifyAutoGuard} onChange={(e) => setNotifyAutoGuard(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-Guard Triggers</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={alertOffline} onChange={(e) => setAlertOffline(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-orange)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Device Offline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={notifyLowBattery} onChange={(e) => setNotifyLowBattery(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-orange)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Low Battery (&lt;20%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={notifyWatering} onChange={(e) => setNotifyWatering(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Water Start/Stop</span>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label className="form-label">Warning Alarm Sound</label>
                <select className="form-input" value={alarmSound} onChange={(e) => setAlarmSound(e.target.value as any)}>
                  <option value="siren">🚨 Siren (Loud)</option>
                  <option value="beep">⚠️ Beep (Standard)</option>
                  <option value="off">🔇 Silent</option>
                </select>
              </div>
              <div>
                <label className="form-label">Alarm Repeat</label>
                <select className="form-input" value={alarmRepeatInterval} onChange={(e) => setAlarmRepeatInterval(e.target.value as any)}>
                  <option value="once">Once</option>
                  <option value="5">Every 5 Seconds</option>
                  <option value="15">Every 15 Seconds</option>
                  <option value="30">Every 30 Seconds</option>
                  <option value="60">Every 60 Seconds</option>
                </select>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alarm Volume</span><span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{Math.round(alarmVolume * 100)}%</span></div>
              <input type="range" min="0.1" max="1.0" step="0.1" className="form-input" style={{ padding: 0 }} value={alarmVolume} onChange={(e) => setAlarmVolume(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={() => window.dispatchEvent(new Event('test_alert'))} className="btn-secondary" style={{ width: '100%', height: '100%', minHeight: '60px', padding: '12px' }}>Test Alert System</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Flow Speed Limit</span><span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{maxFlowRate} {speedUnit}</span></div>
            <input type="range" min="5" max="35" className="form-input" style={{ padding: 0 }} value={maxFlowRate} onChange={(e) => setMaxFlowRate(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Continuous Open</span><span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{maxDuration} Mins</span></div>
            <input type="range" min="5" max="120" className="form-input" style={{ padding: 0 }} value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} />
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
