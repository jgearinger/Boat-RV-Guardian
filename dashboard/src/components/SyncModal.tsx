import { useState, useEffect } from 'react';
import { useCloudConfig } from '../hooks/useCloudConfig';
import { isLocalConfigDefault, applyCloudConfig, getLocalConfig } from '../utils/configSync';
import { auth, signOut } from '../services/firebase';

export default function SyncModal() {
  const { config, updateConfig, loading } = useCloudConfig();
  const [showModal, setShowModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    if (loading || !auth.currentUser || hasResolved) return;

    const isLocalDefault = isLocalConfigDefault();

    if (!config || Object.keys(config).length === 0) {
      // New cloud user: push local config to cloud silently
      if (!isLocalDefault) {
        updateConfig(getLocalConfig());
      }
      setHasResolved(true);
    } else {
      // Cloud config exists
      if (isLocalDefault) {
        // Local is default, just pull cloud config silently
        (window as any).__is_syncing_cloud = true;
        applyCloudConfig(config);
        (window as any).__is_syncing_cloud = false;
        setHasResolved(true);
      } else {
        // Conflict! Both exist and local is not default.
        // In a perfect world we would diff them, but for now we just show the modal.
        // Wait, if they are exactly identical, we don't need to show the modal.
        // But doing a deep equal is hard. Let's just assume if local isn't default, we ask.
        // Actually, we can check if local exactly equals cloud config.
        let isIdentical = true;
        const local = getLocalConfig();
        for (const key of Object.keys(local)) {
          if (key === 'linktap') continue; // skip nested
          if (local[key] !== config[key]) {
            isIdentical = false;
            break;
          }
        }
        
        if (isIdentical) {
          setHasResolved(true);
        } else {
          setShowModal(true);
        }
      }
    }
  }, [config, loading, hasResolved]);

  // Setup auto-save listener
  useEffect(() => {
    const handleSettingsUpdated = () => {
      if ((window as any).__is_syncing_cloud) return;
      if (auth.currentUser && hasResolved) {
        updateConfig(getLocalConfig());
      }
    };
    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [hasResolved]);

  if (!showModal) return null;

  const handleUseLocal = async () => {
    setIsResolving(true);
    await updateConfig(getLocalConfig());
    setShowModal(false);
    setHasResolved(true);
    setIsResolving(false);
  };

  const handleUseCloud = async () => {
    setIsResolving(true);
    (window as any).__is_syncing_cloud = true;
    applyCloudConfig(config || {});
    (window as any).__is_syncing_cloud = false;
    setShowModal(false);
    setHasResolved(true);
    setIsResolving(false);
  };

  const handleLogout = async () => {
    setIsResolving(true);
    await signOut(auth);
    setShowModal(false);
    setHasResolved(true);
    setIsResolving(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex',
      justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '90%', padding: '30px' }}>
        <h2 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>Configuration Conflict</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You have successfully logged in, but this device has local configuration settings that differ from your Cloud Settings.
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>
          How would you like to proceed?
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
          <button 
            className="btn-primary" 
            onClick={handleUseCloud}
            disabled={isResolving}
          >
            ☁️ Use Cloud Settings Everywhere
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>Overwrites this device with your cloud profile.</div>
          </button>
          
          <button 
            className="btn-secondary" 
            style={{ border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)' }}
            onClick={handleUseLocal}
            disabled={isResolving}
          >
            📱 Use Local Settings Everywhere
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>Overwrites your cloud profile with this device's settings.</div>
          </button>

          <button 
            className="btn-secondary" 
            style={{ border: '1px solid #ef4444', color: '#ef4444', marginTop: '10px' }}
            onClick={handleLogout}
            disabled={isResolving}
          >
            Cancel and Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
