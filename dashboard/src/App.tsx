import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import Settings from './pages/Settings';
import { usePushNotifications } from './hooks/usePushNotifications';
import { auth, onAuthStateChanged } from './services/firebase';
import SyncModal from './components/SyncModal';
import Login from './pages/Login';
import { isLocalProfileFresh } from './utils/configSync';

type AppView = 'home' | 'fresh_water' | 'high_water' | 'batteries' | 'shore_power' | 'settings';

export default function App() {
  usePushNotifications();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // First-run login prompt: shown when the app opens unauthenticated on an untouched profile.
  // Dismissable; once dismissed (or once the user signs in) it stays gone for the session.
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptDismissed, setLoginPromptDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setShowLoginPrompt(false);
      } else if (!loginPromptDismissed && isLocalProfileFresh()) {
        setShowLoginPrompt(true);
      }
    });
    return () => unsubscribe();
  }, [loginPromptDismissed]);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--accent)' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <SyncModal />
      {showLoginPrompt && !user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
            <button
              onClick={() => { setShowLoginPrompt(false); setLoginPromptDismissed(true); }}
              aria-label="Close"
              style={{
                position: 'absolute', top: '8px', right: '8px', zIndex: 1,
                background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                fontSize: '1.4rem', lineHeight: 1, width: '32px', height: '32px',
                borderRadius: '50%', cursor: 'pointer'
              }}
            >×</button>
            <Login />
          </div>
        </div>
      )}
      <header style={{ padding: '20px', background: 'var(--bg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexShrink: 0, zIndex: 11 }}>
        <div style={{
          width: '45px',
          height: '45px',
          backgroundImage: 'url(/app_icon.jpg)',
          backgroundSize: 'cover',
          borderRadius: '10px',
          boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)'
        }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BOAT AND RV GUARDIAN
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Monitor and control critical systems on your Boat or RV
          </p>
        </div>
      </header>
      <nav style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', padding: '15px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, zIndex: 10 }}>
        <button 
          className={currentView === 'home' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setCurrentView('home')}
          style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }}
        >
          🏠 Home
        </button>
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
        {currentView === 'home' && <Home onNavigate={setCurrentView} />}
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
