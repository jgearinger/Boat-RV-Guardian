import { useState, useEffect, useRef } from 'react';

interface AlertLog {
  time: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  message: string;
}

interface FlowData {
  time: string;
  speed: number;
}

export default function App() {
  // --- Environment Detection for CORS/Network Safety ---
  const isNativeApp = typeof (window as any).__TAURI__ !== 'undefined' || typeof (window as any).Capacitor !== 'undefined';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canUseRealConnection = isNativeApp || isLocalhost;

  // --- Persistent Gateway & Device Configuration ---
  const [gatewayIp, setGatewayIp] = useState(() => localStorage.getItem('lt_gateway_ip') || '192.168.1.100');
  const [gatewayId, setGatewayId] = useState(() => localStorage.getItem('lt_gateway_id') || 'GW_02_MOCK');
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('lt_device_id') || 'TAP_MOCK_1');
  const [refreshInterval, setRefreshInterval] = useState(() => Number(localStorage.getItem('lt_refresh') || '5'));
  const [mockMode, setMockMode] = useState(() => {
    if (!canUseRealConnection) return true; // Force mock mode in public web build
    return localStorage.getItem('lt_mock') !== 'false';
  });

  // --- Local Safety Sentry Config ---
  const [autoGuardEnabled, setAutoGuardEnabled] = useState(() => localStorage.getItem('lt_autoguard') !== 'false');
  const [maxFlowRate, setMaxFlowRate] = useState(() => Number(localStorage.getItem('lt_maxflow') || '15'));
  const [maxDuration, setMaxDuration] = useState(() => Number(localStorage.getItem('lt_maxdur') || '30'));

  // --- Real-time API States (matched to G2S Gateway Schema) ---
  const [isRfLinked, setIsRfLinked] = useState(true);
  const [isFlmPlugin, setIsFlmPlugin] = useState(true);
  const [isFall, setIsFall] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [isCutoff, setIsCutoff] = useState(false);
  const [isLeak, setIsLeak] = useState(false);
  const [isClog, setIsClog] = useState(false);
  const [signal, setSignal] = useState(85);
  const [battery, setBattery] = useState(95);
  const [isWatering, setIsWatering] = useState(false);
  const [speed, setSpeed] = useState(0.0);
  const [volume, setVolume] = useState(0.0);
  const [remainDuration, setRemainDuration] = useState(0);

  // --- App Diagnostics & Console Logs ---
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'mock'>('mock');
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<AlertLog[]>([
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'LinkTap Boat Guard dashboard initialized.' },
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'Mock Mode enabled by default. Simulate API events below.' }
  ]);
  const [showConfig, setShowConfig] = useState(false);
  const [showProxyDoc, setShowProxyDoc] = useState(false);

  // --- Manual Irrigation Inputs ---
  const [inputDuration, setInputDuration] = useState(15);
  const [inputVolume, setInputVolume] = useState(50);

  // --- Historic Stats for Chart ---
  const [flowHistory, setFlowHistory] = useState<FlowData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- PWA Installation Support ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Cache settings on change
  useEffect(() => {
    localStorage.setItem('lt_gateway_ip', gatewayIp);
    localStorage.setItem('lt_gateway_id', gatewayId);
    localStorage.setItem('lt_device_id', deviceId);
    localStorage.setItem('lt_refresh', refreshInterval.toString());
    localStorage.setItem('lt_mock', mockMode.toString());
    localStorage.setItem('lt_autoguard', autoGuardEnabled.toString());
    localStorage.setItem('lt_maxflow', maxFlowRate.toString());
    localStorage.setItem('lt_maxdur', maxDuration.toString());
  }, [gatewayIp, gatewayId, deviceId, refreshInterval, mockMode, autoGuardEnabled, maxFlowRate, maxDuration]);

  // Log message helper
  const addLog = (type: 'info' | 'warning' | 'danger' | 'success', message: string) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), type, message }, ...prev.slice(0, 49)]);
  };

  // Listen for PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    addLog('info', `PWA Install request: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // --- Local Safety Guard Auto-Monitoring ---
  useEffect(() => {
    let triggered = false;
    let cause = '';

    if (autoGuardEnabled) {
      if (isBroken) {
        triggered = true;
        cause = 'Gateway reported a broken pipe alarm!';
      } else if (isLeak) {
        triggered = true;
        cause = 'Gateway reported a leak alarm!';
      } else if (speed > maxFlowRate) {
        triggered = true;
        cause = `Flow rate (${speed.toFixed(1)} L/min) exceeded safety limit of ${maxFlowRate} L/min!`;
      }

      if (triggered && isWatering) {
        addLog('danger', `⚠️ SAFETY SENTRY TRIGGERED: ${cause} Shutting down valve...`);
        executeStopCommand();
      }
    }
  }, [speed, isBroken, isLeak, isWatering, autoGuardEnabled, maxFlowRate]);

  // --- Real-time Polling Logic ---
  useEffect(() => {
    setConnectionStatus(mockMode ? 'mock' : 'disconnected');
    
    const poll = async () => {
      if (mockMode) {
        // Mock state updates over time
        setLastUpdated(new Date().toLocaleTimeString());
        setFlowHistory((prev) => {
          const next = [...prev, { time: new Date().toLocaleTimeString().slice(-8), speed }];
          return next.slice(-20); // Keep last 20 ticks
        });
        
        // Count down remaining watering time
        if (isWatering && remainDuration > 0) {
          setRemainDuration((d) => {
            const nextD = d - refreshInterval;
            if (nextD <= 0) {
              setIsWatering(false);
              setSpeed(0);
              addLog('success', 'Watering cycle finished naturally.');
              return 0;
            }
            return nextD;
          });
          // Add small fluctuation in water speed
          setSpeed((s) => Math.max(1, s + (Math.random() - 0.5) * 0.4));
          setVolume((v) => v + (speed * (refreshInterval / 60)));
        }
        return;
      }

      // Real network requests
      try {
        setErrorMsg(null);
        // LinkTap local HTTP API POST endpoint
        const response = await fetch(`http://${gatewayIp}/api.shtml`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cmd: 3, // Check status
            gw_id: gatewayId,
            dev_id: deviceId
          }),
        });

        if (!response.ok) throw new Error(`HTTP Error status: ${response.status}`);
        
        // LinkTap occasionally wraps JSON response in HTML, strip it if needed
        let rawText = await response.text();
        let cleanedJson = rawText;
        if (rawText.includes('<html') || rawText.includes('<body')) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) cleanedJson = match[0];
        }

        const data = JSON.parse(cleanedJson);
        
        // Update states
        setIsRfLinked(data.is_rf_linked ?? true);
        setIsFlmPlugin(data.is_flm_plugin ?? true);
        setIsFall(data.is_fall ?? false);
        setIsBroken(data.is_broken ?? false);
        setIsCutoff(data.is_cutoff ?? false);
        setIsLeak(data.is_leak ?? false);
        setIsClog(data.is_clog ?? false);
        setSignal(data.signal ?? 0);
        setBattery(data.battery ?? 0);
        setIsWatering(data.is_watering ?? false);
        setSpeed(Number(data.speed ?? 0));
        setVolume(Number(data.volume ?? 0));
        setRemainDuration(Number(data.remain_duration ?? 0));
        
        setConnectionStatus('connected');
        setLastUpdated(new Date().toLocaleTimeString());

        setFlowHistory((prev) => {
          const next = [...prev, { time: new Date().toLocaleTimeString().slice(-8), speed: Number(data.speed) }];
          return next.slice(-20);
        });

      } catch (err: any) {
        setConnectionStatus('disconnected');
        setErrorMsg(`Failed to connect to gateway: ${err.message}. (Check CORS configurations or try Mock Mode)`);
      }
    };

    poll();
    const timer = setInterval(poll, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [mockMode, gatewayIp, gatewayId, deviceId, refreshInterval, isWatering, remainDuration, speed]);

  // --- API Action Commanders ---
  
  // cmd 6: Start watering
  const executeStartCommand = async (durationMins: number, volumeLimitLiters: number) => {
    addLog('info', `Sending API command: START watering. Duration: ${durationMins}m, Limit: ${volumeLimitLiters}L`);
    
    if (mockMode) {
      setIsWatering(true);
      setRemainDuration(durationMins * 60);
      setSpeed(8.5); // Normal flow speed
      setVolume(0);
      addLog('success', `Valve opened. Watering started (Mock).`);
      return;
    }

    try {
      setErrorMsg(null);
      const response = await fetch(`http://${gatewayIp}/api.shtml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cmd: 6,
          gw_id: gatewayId,
          dev_id: deviceId,
          duration: durationMins,
          // volume parameter can be included based on API docs if device flow meter supports auto-stop
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      addLog('success', 'API Start command received by Gateway.');
    } catch (err: any) {
      addLog('danger', `API Start command failed: ${err.message}`);
      setErrorMsg(err.message);
    }
  };

  // cmd 7: Stop watering (Emergency Button)
  const executeStopCommand = async () => {
    addLog('warning', `⚠️ Initiating EMERGENCY VALVE SHUTDOWN (cmd: 7)...`);
    
    if (mockMode) {
      setIsWatering(false);
      setSpeed(0);
      setRemainDuration(0);
      addLog('success', `Valve closed (Mock). Safe mode restored.`);
      return;
    }

    try {
      setErrorMsg(null);
      const response = await fetch(`http://${gatewayIp}/api.shtml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cmd: 7,
          gw_id: gatewayId,
          dev_id: deviceId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      setIsWatering(false);
      setSpeed(0);
      addLog('success', 'Valve closed successfully by Gateway.');
    } catch (err: any) {
      addLog('danger', `EMERGENCY SHUTOFF FAILED: ${err.message}`);
      setErrorMsg(err.message);
    }
  };

  // --- HTML5 Canvas History Graph Rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas dimensions
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (flowHistory.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting flow rate data logs...', width / 2, height / 2);
      return;
    }

    // Find min and max
    const maxVal = Math.max(10, ...flowHistory.map((d) => d.speed * 1.2));
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
      
      // y-axis values
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(((maxVal / 4) * (4 - i)).toFixed(1), 10, y + 3);
    }

    // Render path
    const paddingLeft = 40;
    const paddingRight = 20;
    const graphWidth = width - paddingLeft - paddingRight;
    
    ctx.beginPath();
    flowHistory.forEach((pt, idx) => {
      const x = paddingLeft + (idx / (flowHistory.length - 1)) * graphWidth;
      const y = height - (pt.speed / maxVal) * (height - 20) - 10;
      
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Stroke style
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00f2fe');
    gradient.addColorStop(1, '#0052d4');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill underneath the graph line
    ctx.lineTo(paddingLeft + graphWidth, height - 10);
    ctx.lineTo(paddingLeft, height - 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.06)';
    ctx.fill();

    // Label last data point
    const lastPoint = flowHistory[flowHistory.length - 1];
    const lastX = paddingLeft + graphWidth;
    const lastY = height - (lastPoint.speed / maxVal) * (height - 20) - 10;
    
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [flowHistory]);

  // --- Mock Mode Simulations Commands ---
  const triggerMockBurst = () => {
    setIsWatering(true);
    setIsBroken(true);
    setSpeed(28.5); // Dangerous burst flow rate
    addLog('danger', '🔥 MOCK EVENT: Main pipe burst simulated! Flow spiked to 28.5 L/min.');
  };

  const triggerMockLeak = () => {
    setIsWatering(true);
    setIsLeak(true);
    setSpeed(1.2); // Low leak flow
    addLog('warning', '⚠️ MOCK EVENT: Slow weeping leak simulated (1.2 L/min).');
  };

  const triggerMockLowBattery = () => {
    setBattery(8);
    addLog('warning', '🔋 MOCK EVENT: Battery low alert (8% remaining).');
  };

  const clearAlarms = () => {
    setIsBroken(false);
    setIsLeak(false);
    setIsFall(false);
    setIsClog(false);
    setBattery(95);
    addLog('success', '✅ All mock alarms cleared and safety status reset.');
  };

  return (
    <div style={{ flex: 1, paddingBottom: '40px' }}>
      {/* Top Header */}
      <header style={{
        background: 'linear-gradient(180deg, var(--bg-secondary) 0%, rgba(4,8,20,0) 100%)',
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        marginBottom: '30px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              backgroundImage: 'url(/app_icon.jpg)',
              backgroundSize: 'cover',
              borderRadius: '10px',
              boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)'
            }} />
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                BOAT &amp; RV GUARDIAN
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LinkTap Local Flow Monitor &amp; Bilge Safety Sentry
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Battery Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={battery < 15 ? 'var(--accent-red)' : 'var(--accent-emerald)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
                <line x1="22" y1="11" x2="22" y2="13"></line>
              </svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: battery < 15 ? 'var(--accent-red)' : '#fff' }}>{battery}%</span>
            </div>

            {/* Signal Strength */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                <path d="M8.58 16.14a7 7 0 0 1 6.83 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{isRfLinked ? `${signal}%` : 'LINK LOST'}</span>
            </div>

            {/* Connection badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className={`status-dot ${connectionStatus}`}></span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {connectionStatus === 'mock' ? 'MOCK MODE' : connectionStatus === 'connected' ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-layout">
        
        {/* Left Column: Flow Metrics & Controls */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PWA Install Banner */}
          {showInstallBanner && (
            <div className="install-banner">
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '4px' }}>Install PWA App</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add LinkTap Guardian to your home screen for quick offline boat monitoring.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Install</button>
                <button onClick={() => setShowInstallBanner(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Dismiss</button>
              </div>
            </div>
          )}

          {/* Alarm Banner if leak/burst is active */}
          {(isBroken || isLeak || isFall || speed > maxFlowRate) && (
            <div className="glass-card danger" style={{ animation: 'pulse-red 1.5s infinite', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>!</span>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff8b8b' }}>CRITICAL WATER ANOMALY</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {isBroken && '🚨 PIPE BREAK ALARM: Critical rupture flagged by flow sensor.'}
                    {!isBroken && speed > maxFlowRate && `🚨 EXPENDITURE LIMIT: Flow rate (${speed.toFixed(1)} L/min) exceeds local safety threshold (${maxFlowRate} L/min).`}
                    {isLeak && !isBroken && '⚠️ LEAK ALERT: Small trickle flow detected without schedule.'}
                    {isFall && '⚠️ HARDWARE ALARM: TapLinker physical fall or impact detected.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Flow Speed & Statistics Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Real-Time Flow Analysis</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data refreshed every {refreshInterval}s • Last update: {lastUpdated}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VALVE STATUS</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className={`status-dot ${isWatering ? 'online' : 'offline'}`}></span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isWatering ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                    {isWatering ? 'OPEN (WATERING)' : 'CLOSED (SECURE)'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'center' }}>
              {/* Giant Digital Meter */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)', textAlign: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Speed</span>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: speed > maxFlowRate ? 'var(--accent-red)' : 'var(--accent-cyan)', margin: '8px 0', textShadow: speed > maxFlowRate ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 15px rgba(0,242,254,0.3)' }}>
                  {speed.toFixed(1)}
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '6px' }}>L/min</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {isWatering ? `${(remainDuration / 60).toFixed(1)} mins remaining` : 'Waiting for flow...'}
                </span>
                
                {/* Flow Wave Animation */}
                <div className="wave-container">
                  <div className="wave wave-bg" style={{ animationDuration: speed > 15 ? '3s' : speed > 5 ? '6s' : '12s' }}></div>
                  <div className="wave wave-fg" style={{ animationDuration: speed > 15 ? '1.5s' : speed > 5 ? '3s' : '6s' }}></div>
                </div>
              </div>

              {/* Auxiliary Quick Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Volume Consumed</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{volume.toFixed(2)} Liters</div>
                </div>
                <div style={{ borderLeft: '3px solid var(--accent-orange)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Signal Stability</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{isRfLinked ? 'LINK OK' : 'LINK STUCK'}</div>
                </div>
                <div style={{ borderLeft: '3px solid var(--accent-emerald)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hardware Integrity</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{!isFall && !isClog && !isBroken ? 'NOMINAL' : 'ALERT'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Flow History Line Chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Flow Timeline Logs</h3>
            <canvas ref={canvasRef} style={{ width: '100%', height: '180px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}></canvas>
          </div>

          {/* Manual Irrigation Control Console */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Flow Regulation Controls</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-input"
                  value={inputDuration}
                  onChange={(e) => setInputDuration(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="form-label">Safety Limit (Liters)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  className="form-input"
                  value={inputVolume}
                  onChange={(e) => setInputVolume(Math.max(10, Number(e.target.value)))}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button disabled={isWatering} onClick={() => { setInputDuration(5); executeStartCommand(5, 50); }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>5 Mins (Quick Flush)</button>
              <button disabled={isWatering} onClick={() => { setInputDuration(15); executeStartCommand(15, 100); }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>15 Mins (Top-Off)</button>
              <button disabled={isWatering} onClick={() => { setInputDuration(30); executeStartCommand(30, 200); }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>30 Mins (Fill Tanks)</button>
            </div>

            {/* Action Buttons: Open & Emergency Stop */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginTop: '10px' }}>
              <button
                disabled={isWatering}
                onClick={() => executeStartCommand(inputDuration, inputVolume)}
                className="btn-primary"
                style={{ fontSize: '1rem', padding: '16px 20px' }}
              >
                💧 OPEN WATER VALVE
              </button>
              <button
                onClick={executeStopCommand}
                className="btn-danger-glow"
                style={{ padding: '16px 20px', fontSize: '1rem' }}
              >
                🛑 EMERGENCY OFF
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Alerts Panel & Configs */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Safety Sentry (Flooding Protection) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Flooding Sentry</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: autoGuardEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {autoGuardEnabled ? 'AUTO-GUARD ON' : 'DISABLED'}
                </span>
                <input
                  type="checkbox"
                  checked={autoGuardEnabled}
                  onChange={(e) => setAutoGuardEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Automatically shuts down the local water connection (cmd: 7) if values exceed thresholds or physical anomalies occur.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Flow Speed Limit</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{maxFlowRate} L/min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  className="form-input"
                  style={{ padding: 0 }}
                  value={maxFlowRate}
                  onChange={(e) => setMaxFlowRate(Number(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Continuous Open</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{maxDuration} Mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  className="form-input"
                  style={{ padding: 0 }}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Hardware Failure Alert (Fall)</span>
                <span style={{ color: isFall ? 'var(--accent-red)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>
                  {isFall ? 'TRIGGERED' : 'CLEAR'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Pipe Burst Alert</span>
                <span style={{ color: isBroken ? 'var(--accent-red)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>
                  {isBroken ? 'RUPTURE DETECTED' : 'CLEAR'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Flow Meter Connection</span>
                <span style={{ color: isFlmPlugin ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 'bold' }}>
                  {isFlmPlugin ? 'PLUGGED IN' : 'DISCONNECTED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '6px' }}>
                <span>Water Cutoff Alert</span>
                <span style={{ color: isCutoff ? 'var(--accent-red)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>
                  {isCutoff ? 'CUTOFF DETECTED' : 'CLEAR'}
                </span>
              </div>
            </div>
          </div>

          {/* Mock Console Panel */}
          <div className="glass-card" style={{ border: '1px solid rgba(0, 242, 254, 0.25)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px' }}>Mock Simulator Console</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Test your flood alarm system immediately: Simulate high-rate leakages, pipe damage, or low batteries.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <button onClick={triggerMockBurst} className="btn-secondary" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: '#ff8b8b' }}>
                💥 Simulate 28 L/min Pipe Burst
              </button>
              <button onClick={triggerMockLeak} className="btn-secondary" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.05)', color: '#fde68a' }}>
                ⚠️ Simulate Weeping Pipe Leak
              </button>
              <button onClick={triggerMockLowBattery} className="btn-secondary">
                🔋 Simulate Battery Drop (8%)
              </button>
              <button onClick={clearAlarms} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: 'none' }}>
                ✅ Clear All Alarm Simulations
              </button>
            </div>
          </div>

          {/* Connection Configurations */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowConfig(!showConfig)}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Hardware Connections</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{showConfig ? 'COLLAPSE' : 'EXPAND'}</span>
            </div>

            {showConfig && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0 }}>Simulate Locally (Mock Mode)</label>
                    <input
                      type="checkbox"
                      disabled={!canUseRealConnection}
                      checked={mockMode}
                      onChange={(e) => setMockMode(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: !canUseRealConnection ? 'not-allowed' : 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Disable mock mode to query a real physical G2S gateway.
                  </span>
                  {!canUseRealConnection && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-orange)', marginTop: '8px', fontWeight: 'bold' }}>
                      🌐 Web Preview: Real connection is locked to Mock Mode in browser. Download desktop/mobile binaries for local hardware connectivity.
                    </span>
                  )}
                </div>

                <div>
                  <label className="form-label">Gateway IP Address</label>
                  <input
                    type="text"
                    disabled={mockMode}
                    className="form-input"
                    value={gatewayIp}
                    onChange={(e) => setGatewayIp(e.target.value)}
                    placeholder="e.g. 192.168.1.150"
                  />
                </div>

                <div>
                  <label className="form-label">Gateway ID (GW_ID)</label>
                  <input
                    type="text"
                    disabled={mockMode}
                    className="form-input"
                    value={gatewayId}
                    onChange={(e) => setGatewayId(e.target.value)}
                    placeholder="e.g. GW_A1B2C3"
                  />
                </div>

                <div>
                  <label className="form-label">Device ID (DEV_ID / TapLinker)</label>
                  <input
                    type="text"
                    disabled={mockMode}
                    className="form-input"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="e.g. 815A72..."
                  />
                </div>

                <div>
                  <label className="form-label">Polling Refresh Rate: {refreshInterval}s</label>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    className="form-input"
                    style={{ padding: 0 }}
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* CORS Bypassing Docs */}
          <div className="glass-card" style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowProxyDoc(!showProxyDoc)}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🛠️ Developer API Integration</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{showProxyDoc ? 'CLOSE' : 'OPEN'}</span>
            </div>

            {showProxyDoc && (
              <div style={{ marginTop: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <p>
                  <strong>Note on CORS:</strong> Since the LinkTap gateway is a local HTTP endpoint, browsers will block direct JavaScript requests from hosted websites (like GitHub Pages) due to Cross-Origin Resource Sharing (CORS) rules.
                </p>
                <p>
                  <strong>How to integrate locally:</strong>
                </p>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Install a browser extension like <em>Allow CORS: Access-Control-Allow-Origin</em> during development.</li>
                  <li>Or run a lightweight local proxy server (Node/Express) that forwards requests from this app to the local gateway IP.</li>
                </ol>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }}>Simple Node Proxy Example:</div>
                  <pre style={{ fontFamily: 'monospace' }}>{`const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api', async (req, res) => {
  const response = await fetch('http://<GATEWAY_IP>/api.shtml', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  const text = await response.text();
  res.send(text);
});

app.listen(3001);`}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Activity Event Logs */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Event Sentry Log</h3>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '220px'
            }}>
              {logs.map((log, index) => (
                <div key={index} style={{
                  fontSize: '0.75rem',
                  lineHeight: '1.3',
                  paddingBottom: '6px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  color: log.type === 'danger' ? '#ff8b8b' : log.type === 'warning' ? '#fde68a' : log.type === 'success' ? '#a7f3d0' : 'var(--text-secondary)'
                }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontFamily: 'monospace' }}>[{log.time}]</span>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
          
        </section>
      </main>

      {/* Connection Failure banner */}
      {errorMsg && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          left: '20px',
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="btn-secondary" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
