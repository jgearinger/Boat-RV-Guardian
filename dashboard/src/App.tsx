import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import Settings from './pages/Settings';
import { usePushNotifications } from './hooks/usePushNotifications';
import { auth, onAuthStateChanged } from './services/firebase';

type AppView = 'fresh_water' | 'high_water' | 'batteries' | 'shore_power' | 'settings';

export default function App() {
  usePushNotifications();
  const [currentView, setCurrentView] = useState<AppView>('fresh_water');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--accent)' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <nav style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', padding: '15px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, zIndex: 10 }}>
        <button 
          className={currentView === 'fresh_water' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('fresh_water')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }}
        >
          Fresh Water
        </button>
        <button 
          className={currentView === 'high_water' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('high_water')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }}
        >
          High Water/Flood
        </button>
        <button 
          className={currentView === 'batteries' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('batteries')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }}
        >
          Batteries
        </button>
        <button 
          className={currentView === 'shore_power' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('shore_power')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }}
        >
          Shore Power
        </button>
        <button 
          className={currentView === 'settings' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('settings')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none', marginLeft: 'auto' }}
        >
          ⚙️ Settings
        </button>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: currentView === 'fresh_water' ? 'block' : 'none', height: '100%' }}>
          <Dashboard />
        </div>
        {currentView === 'high_water' && <Sensors category="flood" />}
        {currentView === 'batteries' && <Sensors category="batteries" />}
        {currentView === 'shore_power' && <Sensors category="shore_power" />}
        {currentView === 'settings' && <Settings user={user} />}
      </div>
    </div>
  );
}
