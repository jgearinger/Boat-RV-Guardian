import React from 'react';

interface HomeProps {
  onNavigate: (view: 'fresh_water' | 'high_water' | 'batteries' | 'shore_power') => void;
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff', paddingBottom: '100px' }}>
      <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '32px', textAlign: 'center' }}>
        System Overview
      </h1>
      
      <div className="dashboard-grid">
        <div 
          className="glass-card" 
          onClick={() => onNavigate('fresh_water')}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center', minHeight: '200px', justifyContent: 'center' }}
        >
          <div style={{ fontSize: '3rem' }}>💧</div>
          <h2 style={{ color: 'var(--accent-cyan)', margin: 0 }}>Fresh Water</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitor tank flow, set manual timers, and manage auto-shutoff policies.</p>
        </div>

        <div 
          className="glass-card" 
          onClick={() => onNavigate('high_water')}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center', minHeight: '200px', justifyContent: 'center' }}
        >
          <div style={{ fontSize: '3rem' }}>🚨</div>
          <h2 style={{ color: 'var(--accent-blue)', margin: 0 }}>High Water / Flood</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>View status of bilge/flood sensors to prevent water damage.</p>
        </div>

        <div 
          className="glass-card" 
          onClick={() => onNavigate('batteries')}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center', minHeight: '200px', justifyContent: 'center' }}
        >
          <div style={{ fontSize: '3rem' }}>🔋</div>
          <h2 style={{ color: 'var(--accent-emerald)', margin: 0 }}>Batteries</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Check voltage and health of your 12V/24V house and starter batteries.</p>
        </div>

        <div 
          className="glass-card" 
          onClick={() => onNavigate('shore_power')}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center', minHeight: '200px', justifyContent: 'center' }}
        >
          <div style={{ fontSize: '3rem' }}>⚡</div>
          <h2 style={{ color: 'var(--accent-orange)', margin: 0 }}>Shore Power</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitor AC line voltage and draw when connected to shore power.</p>
        </div>
      </div>
    </div>
  );
}
