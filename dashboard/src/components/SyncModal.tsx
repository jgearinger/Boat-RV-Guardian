import { useState, useEffect } from 'react';
import { useCloudConfig } from '../hooks/useCloudConfig';
import { isLocalVehicleConfigDefault, applyCloudVehicleConfig, getLocalVehicleConfig } from '../utils/configSync';
import { getActiveVehicleId } from '../utils/VehicleManager';
import { auth } from '../services/firebase';

export default function SyncModal() {
  const [activeVid, setActiveVid] = useState(getActiveVehicleId());
  const { activeVehicleConfig, updateVehicleConfig, loading } = useCloudConfig(activeVid);
  const [showModal, setShowModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Keep activeVid in sync with local storage if user switches vehicles
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const currentVid = getActiveVehicleId();
      if (currentVid !== activeVid) {
        setActiveVid(currentVid);
        setHasResolved(false); // Reset resolution state when vehicle changes
      }
    };
    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [activeVid]);

  useEffect(() => {
    if (loading || !auth.currentUser || hasResolved) return;
    if (localStorage.getItem('lt_sync_cloud') === 'false') {
      setHasResolved(true);
      return;
    }

    const isLocalDefault = isLocalVehicleConfigDefault();

    if (!activeVehicleConfig || Object.keys(activeVehicleConfig).length === 0) {
      // New cloud vehicle: push local config to cloud silently
      if (!isLocalDefault) {
        updateVehicleConfig(activeVid, getLocalVehicleConfig());
      }
      setHasResolved(true);
    } else {
      // Cloud config exists
      if (isLocalDefault) {
        // Local is default, just pull cloud config silently
        (window as any).__is_syncing_cloud = true;
        applyCloudVehicleConfig(activeVehicleConfig);
        (window as any).__is_syncing_cloud = false;
        setHasResolved(true);
      } else {
        // Check for identicalness
        let isIdentical = true;
        const local = getLocalVehicleConfig();
        for (const key of Object.keys(local)) {
          if (local[key] !== activeVehicleConfig[key]) {
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
  }, [activeVehicleConfig, loading, hasResolved, activeVid]);

  // Setup auto-save listener
  useEffect(() => {
    const handleSettingsUpdated = () => {
      if ((window as any).__is_syncing_cloud) return;
      if (localStorage.getItem('lt_sync_cloud') === 'false') return;
      if (auth.currentUser && hasResolved) {
        updateVehicleConfig(activeVid, getLocalVehicleConfig());
      }
    };
    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdated);
  }, [hasResolved, activeVid]);

  if (!showModal) return null;

  const handleUseLocal = async () => {
    setIsResolving(true);
    setSyncError(null);
    try {
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Sync request timed out. Please check your connection.')), 8000)
      );
      await Promise.race([
        updateVehicleConfig(activeVid, getLocalVehicleConfig()),
        timeoutPromise
      ]);
      setShowModal(false);
      setHasResolved(true);
    } catch (e: any) {
      setSyncError(e?.message || 'An error occurred while syncing.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleUseCloud = () => {
    setIsResolving(true);
    (window as any).__is_syncing_cloud = true;
    applyCloudVehicleConfig(activeVehicleConfig || {});
    (window as any).__is_syncing_cloud = false;
    setShowModal(false);
    setHasResolved(true);
    setIsResolving(false);
    window.location.reload();
  };

  const handleCancel = () => {
    setShowModal(false);
    setHasResolved(true);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '90%' }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>Cloud Sync Conflict</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          We found an existing configuration in the cloud for this vehicle, but you also have local settings. Which one would you like to keep?
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          <button 
            className="btn-primary" 
            onClick={handleUseCloud} 
            disabled={isResolving}
          >
            {isResolving ? 'Syncing...' : '☁️ Use Cloud Settings'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={handleUseLocal} 
            disabled={isResolving}
          >
            {isResolving ? 'Syncing...' : '📱 Use Local Settings (Overwrite Cloud)'}
          </button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }}></div>
          <button 
            className="btn-secondary" 
            onClick={handleCancel} 
          >
            Cancel
          </button>
          {syncError && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
              {syncError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
