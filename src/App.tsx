import { useState, useEffect, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const unifiedFetch = async (url: string, options?: any) => {
  if (isTauri() && options?.method === 'POST') {
    // Extract IP from URL (e.g. http://192.168.1.100/api.shtml)
    const ip = url.replace('http://', '').split('/')[0];
    const rawText: string = await invoke('raw_linktap_post', { 
      ip, 
      payload: options.body || '' 
    });
    // Create a fake Response object that matches what the app expects
    return {
      text: async () => rawText,
      json: async () => JSON.parse(rawText),
      ok: true,
      status: 200
    };
  }

  // Use native Capacitor HTTP plugin on Android/iOS to bypass CORS entirely
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      method: options?.method || 'GET',
      url: url,
      headers: options?.headers || {},
      data: options?.body ? JSON.parse(options.body) : undefined,
    });
    return {
      text: async () => typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      json: async () => typeof res.data === 'string' ? JSON.parse(res.data) : res.data,
      ok: res.status >= 200 && res.status < 300,
      status: res.status
    };
  }

  // Browser fetch fallback
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res;
};

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
  const isNativeApp = isTauri() || typeof (window as any).Capacitor !== 'undefined';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canUseRealConnection = isNativeApp || isLocalhost;

  // --- Persistent Gateway & Device Configuration ---
  const [apiMode, setApiMode] = useState<'local' | 'cloud'>(() => (localStorage.getItem('lt_api_mode') as 'local' | 'cloud') || 'local');
  const [cloudUsername, setCloudUsername] = useState(() => localStorage.getItem('lt_cloud_user') || '');
  const [cloudApiKey, setCloudApiKey] = useState(() => localStorage.getItem('lt_cloud_key') || '');
  const [alertOffline, setAlertOffline] = useState(() => localStorage.getItem('lt_alert_offline') !== 'false');
  const [gatewayIp, setGatewayIp] = useState(() => localStorage.getItem('lt_gateway_ip') || '192.168.1.100');
  const [gatewayId, setGatewayId] = useState(() => localStorage.getItem('lt_gateway_id') || 'GW_02_MOCK');
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('lt_device_id') || 'TAP_MOCK_1');
  const [refreshInterval, setRefreshInterval] = useState(() => Number(localStorage.getItem('lt_refresh') || '15'));
  const [isPollingActive, setIsPollingActive] = useState(() => localStorage.getItem('lt_is_polling') === 'true');
  const [mockMode, setMockMode] = useState(() => {
    if (!canUseRealConnection) return true;
    return localStorage.getItem('lt_mock') === 'true';
  });

  // --- Local Safety Sentry Config ---
  const [autoGuardEnabled, setAutoGuardEnabled] = useState(() => localStorage.getItem('lt_autoguard') !== 'false');
  const [maxFlowRate, setMaxFlowRate] = useState(() => Number(localStorage.getItem('lt_maxflow') || '15'));
  const [maxDuration, setMaxDuration] = useState(() => Number(localStorage.getItem('lt_maxdur') || '30'));

  // --- User Preferences ---
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => localStorage.getItem('lt_unit') as 'metric' | 'imperial' || 'imperial');
  const [timeZone, setTimeZone] = useState(() => localStorage.getItem('lt_tz') || 'America/New_York');
  const [resetTime, setResetTime] = useState(() => localStorage.getItem('lt_reset_time') || '00:00');

  // --- Real-time API States (matched to G2S Gateway Schema) ---
  const [isRfLinked, setIsRfLinked] = useState(true);
    const [isFall, setIsFall] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
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
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'Boat Guard dashboard initialized.' },
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'Mock Mode enabled by default. Simulate API events below.' }
  ]);
      const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  // --- Cloud Discovery ---
  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const res = await unifiedFetch('https://www.link-tap.com/api/getAllDevices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cloudUsername, apiKey: cloudApiKey })
      });
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Invalid response: ${res.status}`);
      }
      
      if (data.result === 'error' && data.message) {
        throw new Error(data.message);
      }
      if (!res.ok) {
        throw new Error(data.message || `HTTP Error: ${res.status}`);
      }

      if (data.devices && data.devices.length > 0) {
        setDiscoveredDevices(data.devices);
        if (!gatewayId || gatewayId === 'GW_02_MOCK') setGatewayId(data.devices[0].gatewayId);
        if ((!deviceId || deviceId === 'TAP_MOCK_1') && data.devices[0].taplinker && data.devices[0].taplinker.length > 0) {
           setDeviceId(data.devices[0].taplinker[0].taplinkerId);
        }
        addLog('success', `Successfully discovered ${data.devices.length} gateway(s).`);
      } else {
        addLog('warning', 'Discovery failed: No devices found or invalid credentials.');
      }
    } catch(e) {
      addLog('danger', 'Discovery failed due to a network error.');
    }
    setIsDiscovering(false);
  };

  // --- Manual Irrigation Inputs ---
  const [inputDuration, setInputDuration] = useState(15);
  const [inputVolume, setInputVolume] = useState(50);
  const [delayedStartMins, setDelayedStartMins] = useState(0);
  const [delayedStartSecs, setDelayedStartSecs] = useState(15);
  const [washDownDuration, setWashDownDuration] = useState(30);
  const [normalRunHours, setNormalRunHours] = useState(24);
  const [normalRunMinutes, setNormalRunMinutes] = useState(0);
  const [normalRunVolume, setNormalRunVolume] = useState(300);
  const [autoRestartNormal, setAutoRestartNormal] = useState(false);
  const [targetDuration, setTargetDuration] = useState(0);
  const [targetVolume, setTargetVolume] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [isFetchingKey, setIsFetchingKey] = useState(false);
  const [fetchKeyError, setFetchKeyError] = useState<string | null>(null);

  const handleFetchApiKey = async () => {
    setIsFetchingKey(true);
    setFetchKeyError(null);
    try {
      const res = await unifiedFetch('https://www.link-tap.com/api/getApiKey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cloudUsername, password: loginPassword })
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
      if (data.apiKey) {
        setCloudApiKey(data.apiKey);
        setLoginPassword('');
        addLog('success', '✅ API key successfully retrieved from LinkTap!');
      } else if (data.message) {
        throw new Error(data.message);
      } else {
        throw new Error('API key not found in response');
      }
    } catch (e: any) {
      setFetchKeyError(e.message || 'Failed to retrieve API key');
      addLog('danger', `❌ Key fetch failed: ${e.message}`);
    }
    setIsFetchingKey(false);
  };

  // --- Display Computed Values ---
  const displaySpeed = unitSystem === 'imperial' ? speed * 0.264172 : speed;
  const displayVolume = unitSystem === 'imperial' ? volume * 0.264172 : volume;
  const speedUnit = unitSystem === 'imperial' ? 'Gal/min' : 'L/min';
  const volUnit = unitSystem === 'imperial' ? 'Gallons' : 'Liters';

  // --- Historic Stats for Chart ---
  const [flowHistory, setFlowHistory] = useState<FlowData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- PWA Installation Support ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  // Cache settings on change
  useEffect(() => {
    localStorage.setItem('lt_gateway_ip', gatewayIp);
    localStorage.setItem('lt_gateway_id', gatewayId);
    localStorage.setItem('lt_device_id', deviceId);
    localStorage.setItem('lt_refresh', refreshInterval.toString());
    localStorage.setItem('lt_mock', mockMode.toString());
    localStorage.setItem('lt_is_polling', isPollingActive.toString());
    localStorage.setItem('lt_autoguard', autoGuardEnabled.toString());
    localStorage.setItem('lt_maxflow', maxFlowRate.toString());
    localStorage.setItem('lt_maxdur', maxDuration.toString());
    localStorage.setItem('lt_unit', unitSystem);
    localStorage.setItem('lt_tz', timeZone);
    localStorage.setItem('lt_reset_time', resetTime);
    localStorage.setItem('lt_api_mode', apiMode);
    localStorage.setItem('lt_cloud_user', cloudUsername);
    localStorage.setItem('lt_cloud_key', cloudApiKey);
    localStorage.setItem('lt_alert_offline', alertOffline.toString());
  }, [gatewayIp, gatewayId, deviceId, refreshInterval, mockMode, autoGuardEnabled, maxFlowRate, maxDuration, unitSystem, timeZone, resetTime]);

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
      } else if (displaySpeed > maxFlowRate) {
        // AutoGuard triggers a stop command
        cause = `Flow rate (${displaySpeed.toFixed(1)} ${speedUnit}) exceeded safety limit of ${maxFlowRate} ${speedUnit}!`;
      }
      
      if (triggered && isWatering) {
        addLog('danger', `⚠️ SAFETY SENTRY TRIGGERED: ${cause} Shutting down valve...`);
        executeStopCommand();
      }
    }
  }, [speed, isBroken, isLeak, isWatering, autoGuardEnabled, maxFlowRate, displaySpeed, speedUnit]);

  // Isolate Fall and Offline alerts to prevent infinite log loops when speed fluctuates
  useEffect(() => {
    if (isFall && autoGuardEnabled) {
      addLog('danger', '🚨 SENTRY ALERT: Fall / Theft detected!');
    }
  }, [isFall, autoGuardEnabled]);

  useEffect(() => {
    if (alertOffline && !isRfLinked && autoGuardEnabled) {
      addLog('warning', '⚠️ SENTRY ALERT: TapLinker went OFFLINE. Please check connection!');
    }
  }, [alertOffline, isRfLinked, autoGuardEnabled]);

  const commandersRef = useRef({ start: null as any });
  const stateRef = useRef({ isWatering, remainDuration, speed, autoRestartNormal, normalRunHours, normalRunMinutes, normalRunVolume, unitSystem });
  useEffect(() => {
    stateRef.current = { isWatering, remainDuration, speed, autoRestartNormal, normalRunHours, normalRunMinutes, normalRunVolume, unitSystem };
  }, [isWatering, remainDuration, speed, autoRestartNormal, normalRunHours, normalRunMinutes, normalRunVolume, unitSystem]);

  // --- Real-time Polling Logic ---
  useEffect(() => {
    setConnectionStatus(mockMode ? 'mock' : 'disconnected');
    
    const poll = async () => {
      if (!isPollingActive && !mockMode) {
        setConnectionStatus('disconnected');
        return;
      }
      if (mockMode) {
        // Mock state updates over time
        setLastUpdated(new Date().toLocaleTimeString());
        setFlowHistory((prev) => {
          const next = [...prev, { time: new Date().toLocaleTimeString().slice(-8), speed: stateRef.current.speed }];
          return next.slice(-20); // Keep last 20 ticks
        });
        
        // Count down remaining watering time
        if (stateRef.current.isWatering && stateRef.current.remainDuration > 0) {
          setRemainDuration((d) => {
            const nextD = d - refreshInterval;
            if (nextD <= 0) {
              setIsWatering(false);
              setSpeed(0);
              addLog('success', 'Watering cycle finished naturally.');
              if (stateRef.current.autoRestartNormal) {
                 addLog('info', 'Auto-restart is ON. Restarting Normal Run profile in 5 seconds...');
                 setTimeout(() => {
                    let vol = stateRef.current.normalRunVolume;
                    if (stateRef.current.unitSystem === 'imperial') vol = vol / 0.264172;
                    if (commandersRef.current.start) commandersRef.current.start((stateRef.current.normalRunHours * 60) + stateRef.current.normalRunMinutes, vol);
                 }, 5000);
              }
              return 0;
            }
            return nextD;
          });
          // Add small fluctuation in water speed
          setSpeed((s) => Math.max(1, s + (Math.random() - 0.5) * 0.4));
          setVolume((v) => v + (stateRef.current.speed * (refreshInterval / 60)));
        }
        return;
      }

      // Real network requests
      try {
        setErrorMsg(null);
        // LinkTap local HTTP API POST endpoint
        let response;
        if (apiMode === 'cloud') {
           response = await unifiedFetch('https://www.link-tap.com/api/getAllDevices', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ username: cloudUsername, apiKey: cloudApiKey })
           });
        } else {
           response = await unifiedFetch(`http://${gatewayIp}/api.shtml`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ cmd: 3, gw_id: gatewayId, dev_id: deviceId })
           });
        }

        let rawText = await response.text();
        
        let cleanedJson = rawText;
        if (rawText.includes('<html') || rawText.includes('<body')) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) cleanedJson = match[0];
        }

        let data;
        try {
          data = JSON.parse(cleanedJson);
        } catch (e) {
           throw new Error(`Invalid response from API. Status: ${response.status}`);
        }

        if (data.result === 'error' && data.message) {
           throw new Error(data.message);
        }
        
        if (apiMode === 'local' && data.ret !== undefined && data.ret !== 0) {
           let errStr = "Unknown Error";
           if (data.ret === 1) errStr = "Device ID not found";
           if (data.ret === 2) errStr = "Device Offline";
           if (data.ret === 3) errStr = "Invalid Gateway ID or Device ID";
           throw new Error(`Gateway returned Error Code ${data.ret} (${errStr}). Please verify your Gateway and Device IDs are exactly 16-character hex strings.`);
        }
        if (!response.ok) {
           throw new Error(`HTTP Error status: ${response.status}`);
        }
        if (apiMode === 'cloud' && data.devices) {
           try {
             const tl = data.devices[0].taplinker.find((t: any) => t.taplinkerId === deviceId) || data.devices[0].taplinker[0];
             data = {
               is_rf_linked: tl.status !== 'Offline',
               battery: tl.batteryStatus ? parseInt(tl.batteryStatus.replace('%','')) : 100,
               signal: tl.signal ? parseInt(tl.signal.replace('%','')) : 100,
               is_watering: tl.watering != null,
               speed: tl.vel || 0,
               volume: tl.vol || 0,
               is_fall: tl.fall === true,
               is_broken: tl.broken === true,
             };
           } catch (e) {
             console.warn('Cloud API parsing issue', e);
           }
        }
        
        // Update states
        setIsRfLinked(data.is_rf_linked ?? true);
                setIsFall(data.is_fall ?? false);
        setIsBroken(data.is_broken ?? false);
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
        const env = isTauri() ? '(Native Proxy)' : '(Browser)';
        const errMsg = err instanceof Error ? err.message : (err && err.message ? err.message : String(err));
        setErrorMsg(`Failed to connect to gateway ${env}: ${errMsg}`);
      }
    };

    poll();
    const timer = setInterval(poll, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [apiMode, gatewayIp, gatewayId, deviceId, isPollingActive, refreshInterval, mockMode, manualRefresh, cloudUsername, cloudApiKey]);

  // --- API Action Commanders ---
  
  // cmd 6: Start watering
  const executeStartCommand = async (durationMins: number, volumeLimitLiters: number) => {
    setTargetDuration(durationMins * 60);
    setTargetVolume(volumeLimitLiters);
    if (mockMode) setVolume(0);

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
      let response;
      if (apiMode === 'cloud') {
        response = await unifiedFetch('https://www.link-tap.com/api/activateInstantMode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cloudUsername,
            apiKey: cloudApiKey,
            gatewayId,
            taplinkerId: deviceId,
            action: true,
            duration: durationMins, // Cloud API takes minutes
            autoBack: true
          }),
        });
      } else {
        response = await unifiedFetch(`http://${gatewayIp}/api.shtml`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cmd: 6,
            gw_id: gatewayId,
            dev_id: deviceId,
            duration: Math.round(durationMins * 60), // Local API expects SECONDS
          }),
        });
      }

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      addLog('success', 'API Start command received by Gateway.');
    } catch (err: any) {
      addLog('danger', `API Start command failed: ${err.message}`);
      setErrorMsg(err.message);
    }
  };

  // cmd 7: Stop watering (Emergency Button)
  commandersRef.current.start = executeStartCommand;

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
      let response;
      if (apiMode === 'cloud') {
        response = await unifiedFetch('https://www.link-tap.com/api/activateInstantMode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cloudUsername,
            apiKey: cloudApiKey,
            gatewayId,
            taplinkerId: deviceId,
            action: false,
            duration: 0,
            autoBack: true
          }),
        });
      } else {
        response = await unifiedFetch(`http://${gatewayIp}/api.shtml`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cmd: 7,
            gw_id: gatewayId,
            dev_id: deviceId,
          }),
        });
      }

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
    const displayHistory = flowHistory.map(d => ({ ...d, speed: unitSystem === 'imperial' ? d.speed * 0.264172 : d.speed }));
    const maxVal = Math.max(10, ...displayHistory.map((d) => d.speed * 1.2));
    
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
    displayHistory.forEach((pt, idx) => {
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
    const lastPoint = displayHistory[displayHistory.length - 1];
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
                BOAT AND RV GUARDIAN
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                A free app for using your smart valve as a burst pipe auto shutoff
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

            {/* Header Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowSettingsModal(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚙️ SETTINGS
              </button>
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
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add Boat Guardian to your home screen for quick offline boat monitoring.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Install</button>
                <button onClick={() => setShowInstallBanner(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Dismiss</button>
              </div>
            </div>
          )}

          {/* Alarm Banner if leak/burst is active */}
          {(isBroken || isLeak || isFall || displaySpeed > maxFlowRate) && (
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
                    {!isBroken && displaySpeed > maxFlowRate && `🚨 EXPENDITURE LIMIT: Flow rate (${displaySpeed.toFixed(1)} ${speedUnit}) exceeds local safety threshold (${maxFlowRate} ${speedUnit}).`}
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
                <div style={{ fontSize: '3rem', fontWeight: 800, color: displaySpeed > maxFlowRate ? 'var(--accent-red)' : 'var(--accent-cyan)', margin: '8px 0', textShadow: displaySpeed > maxFlowRate ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 15px rgba(0,242,254,0.3)' }}>
                  {displaySpeed.toFixed(1)}
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '6px' }}>{speedUnit}</span>
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
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{displayVolume.toFixed(2)} {volUnit}</div>
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

{/* Chart moved to Right Column */}

          {/* Active Job Progress */}
          {isWatering && targetVolume > 0 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(16, 185, 129, 0.4)', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Run Progress</span>
                <span className="status-dot connected" style={{ marginRight: 0 }}></span>
              </h3>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Time Remaining</span>
                  <span style={{ fontWeight: 'bold' }}>{Math.floor(remainDuration / 3600)}h {Math.floor((remainDuration % 3600) / 60)}m</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, 100 - (remainDuration / Math.max(1, targetDuration)) * 100))}%`, height: '100%', background: 'var(--accent-emerald)', transition: 'width 1s linear' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Volume Remaining</span>
                  <span style={{ fontWeight: 'bold' }}>{Math.max(0, (unitSystem === 'imperial' ? (targetVolume * 0.264172) - displayVolume : targetVolume - displayVolume)).toFixed(1)} {volUnit}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (displayVolume / Math.max(1, unitSystem === 'imperial' ? targetVolume * 0.264172 : targetVolume)) * 100))}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 1s linear' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Main Controls Console */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Normal Run Mode */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '12px' }}>Normal Run Mode</h3>
                <button onClick={() => setShowSettingsModal(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>⚙️</button>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Configured Target Time:</span>
                  <span style={{ fontWeight: 'bold' }}>{normalRunHours} hr {normalRunMinutes} min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Configured Volume Limit:</span>
                  <span style={{ fontWeight: 'bold' }}>{normalRunVolume} {volUnit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Auto Restart (Loop):</span>
                  <span style={{ fontWeight: 'bold', color: autoRestartNormal ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{autoRestartNormal ? 'ENABLED' : 'DISABLED'}</span>
                </div>
              </div>
              <button
                disabled={isWatering}
                onClick={() => {
                   let vol = normalRunVolume;
                   if (unitSystem === 'imperial') vol = vol / 0.264172; // Convert to liters for API
                   executeStartCommand((normalRunHours * 60) + normalRunMinutes, vol);
                }}
                className="btn-primary"
                style={{ marginTop: '12px', width: '100%', padding: '12px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                ▶ START NORMAL RUN
              </button>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

            {/* Mode 1: Fill a Tank */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px' }}>Fill a Tank / Custom Run Time</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Volume ({volUnit})</label>
                  <input type="number" min="1" className="form-input" value={inputVolume} onChange={(e) => setInputVolume(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="form-label">Max Duration (Mins)</label>
                  <input type="number" min="1" className="form-input" value={inputDuration} onChange={(e) => setInputDuration(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="form-label">Delay Start (Min / Sec)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="number" min="0" className="form-input" value={delayedStartMins} onChange={(e) => setDelayedStartMins(Math.max(0, Number(e.target.value)))} placeholder="Min" />
                    <input type="number" min="0" max="59" className="form-input" value={delayedStartSecs} onChange={(e) => setDelayedStartSecs(Math.max(0, Number(e.target.value)))} placeholder="Sec" />
                  </div>
                </div>
              </div>
              <button
                disabled={isWatering}
                onClick={() => {
                   let vol = inputVolume;
                   if (unitSystem === 'imperial') vol = vol / 0.264172; // Convert back to liters for API
                   const totalDelayMs = (delayedStartMins * 60000) + (delayedStartSecs * 1000);
                   if (totalDelayMs > 0) {
                      addLog('info', `Delayed start activated. Tank fill will start in ${delayedStartMins}m ${delayedStartSecs}s.`);
                      setTimeout(() => executeStartCommand(inputDuration, vol), totalDelayMs);
                   } else {
                      executeStartCommand(inputDuration, vol);
                   }
                }}
                className="btn-primary"
                style={{ marginTop: '12px', width: '100%', padding: '12px', fontSize: '0.95rem' }}
              >
                💧 START TANK FILL
              </button>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

            {/* Mode 2: Wash Down Mode */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '12px' }}>Wash Down Mode</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Unlimited water flow for a set duration.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div>
                   <label className="form-label">Duration</label>
                   <select className="form-input" value={washDownDuration} onChange={(e) => setWashDownDuration(Number(e.target.value))}>
                     <option value={5}>5 Minutes</option>
                     <option value={15}>15 Minutes</option>
                     <option value={30}>30 Minutes</option>
                     <option value={60}>60 Minutes</option>
                     <option value={120}>2 Hours</option>
                     <option value={240}>4 Hours</option>
                     <option value={480}>8 Hours</option>
                     <option value={720}>12 Hours</option>
                     <option value={1440}>24 Hours</option>
                   </select>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                   <button
                     disabled={isWatering}
                     onClick={() => executeStartCommand(washDownDuration, 99999)}
                     className="btn-primary"
                     style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', fontSize: '0.95rem' }}
                   >
                     🌊 START WASH DOWN
                   </button>
                 </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

            {/* Instant Off Button */}
            <div>
              <button
                onClick={executeStopCommand}
                className="btn-danger-glow"
                style={{ width: '100%', padding: '16px 20px', fontSize: '1.1rem' }}
              >
                🛑 INSTANT OFF
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Daily Monitoring */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Flow History Line Chart */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Flow Timeline Logs</h3>
            <canvas ref={canvasRef} style={{ width: '100%', height: '180px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', flex: 1 }}></canvas>
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(4,8,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
              <button onClick={() => setShowSettingsModal(false)} className="btn-secondary" style={{ position: 'absolute', top: '20px', right: '20px', padding: '6px 10px', fontSize: '1rem', zIndex: 10 }}>✕</button>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>⚙️ System Settings</h2>
              
              {/* Normal Run Profile Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Normal Run Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Duration</label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input type="number" min="0" className="form-input" value={normalRunHours} onChange={(e) => setNormalRunHours(Math.max(0, Number(e.target.value)))} style={{ width: '40%', padding: '8px' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>hrs</span>
                      <input type="number" min="0" max="59" className="form-input" value={normalRunMinutes} onChange={(e) => setNormalRunMinutes(Math.min(59, Math.max(0, Number(e.target.value))))} style={{ width: '40%', padding: '8px' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>mins</span>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Volume Limit ({volUnit})</label>
                    <input type="number" min="1" className="form-input" value={normalRunVolume} onChange={(e) => setNormalRunVolume(Math.max(1, Number(e.target.value)))} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" checked={autoRestartNormal} onChange={(e) => setAutoRestartNormal(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-restart profile automatically when time expires</span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>App Settings</h3>
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

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Flooding Sentry</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: autoGuardEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{autoGuardEnabled ? 'AUTO-GUARD ON' : 'DISABLED'}</span>
                    <input type="checkbox" checked={autoGuardEnabled} onChange={(e) => setAutoGuardEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }} />
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automatically shuts down the local water connection (cmd: 7) if values exceed thresholds or physical anomalies occur.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" checked={alertOffline} onChange={(e) => setAlertOffline(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-orange)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alert me if device goes offline</span>
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

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Hardware Connections</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-dot ${connectionStatus}`}></span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{connectionStatus === 'mock' ? 'MOCK MODE' : connectionStatus === 'connected' ? 'CONNECTED' : 'OFFLINE'}</span>
                    <button onClick={() => setManualRefresh(r => r + 1)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginLeft: '8px', opacity: 0.8 }}>
                      ↻ Refresh
                    </button>
                  </div>
                </div>
                {mockMode && (
                  <div style={{ background: 'rgba(255, 204, 0, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 204, 0, 0.4)', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ffcc00' }}>⚠️ <strong>Note:</strong> Network settings are disabled because the Mock Simulator is active. Scroll down and disable Mock Mode to connect to real hardware.</span>
                  </div>
                )}
                
                <div>
                  <label className="form-label">API Connection Mode</label>
                  <select className="form-input" value={apiMode} onChange={(e) => { setApiMode(e.target.value as 'local' | 'cloud'); setIsPollingActive(false); }} disabled={mockMode}>
                    <option value="local" disabled={!canUseRealConnection}>Local HTTP API (Faster, Requires local network)</option>
                    <option value="cloud">Cloud API (Works anywhere, requires internet)</option>
                  </select>
                </div>

                {!canUseRealConnection && apiMode === 'local' && (
                  <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '4px' }}>
                    ❌ <strong>Local API is disabled on the Web Version.</strong> Modern browsers (CORS) physically block internet websites from connecting to local IPs like 192.168.x.x. To use the Local API, you must download the native app. Please switch to the Cloud API above.
                  </div>
                )}

                {apiMode === 'cloud' && !mockMode && (
                  <>
                    <div><label className="form-label">Cloud Username</label><input type="text" className="form-input" value={cloudUsername} onChange={(e) => { setCloudUsername(e.target.value); setIsPollingActive(false); }} placeholder="App Username" /></div>
                    {cloudApiKey ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1 }}><label className="form-label">Cloud API Key</label><input type="password" className="form-input" value={cloudApiKey} onChange={(e) => { setCloudApiKey(e.target.value); setIsPollingActive(false); }} placeholder="Paste key or use Login below" /></div>
                        <button onClick={() => { setCloudApiKey(''); }} style={{ marginTop: '20px', background: 'none', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '6px', padding: '8px', color: '#ff8b8b', cursor: 'pointer', fontSize: '0.75rem' }}>✕ Clear</button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.2)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>🔑 Fetch API Key via Login</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Enter your LinkTap account password to automatically retrieve your API key.</div>
                        <input type="password" className="form-input" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="LinkTap account password" />
                        {fetchKeyError && <div style={{ fontSize: '0.78rem', color: '#ff8b8b' }}>❌ {fetchKeyError}</div>}
                        <button
                          className="btn-primary"
                          disabled={isFetchingKey || !cloudUsername || !loginPassword}
                          onClick={handleFetchApiKey}
                          style={{ padding: '10px', fontSize: '0.85rem' }}
                        >
                          {isFetchingKey ? '⏳ Fetching key...' : '🔑 Login & Fetch API Key'}
                        </button>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>Or paste your key manually:</div>
                        <input type="password" className="form-input" value={cloudApiKey} onChange={(e) => { setCloudApiKey(e.target.value); setIsPollingActive(false); }} placeholder="Paste API Key from portal" />
                      </div>
                    )}
                  </>
                )}

                {apiMode === 'local' && !mockMode && (
                  <div><label className="form-label">Gateway IP Address</label><input type="text" className="form-input" value={gatewayIp} onChange={(e) => { setGatewayIp(e.target.value); setIsPollingActive(false); }} placeholder="e.g. 192.168.1.100" /></div>
                )}
                
                {discoveredDevices.length > 0 ? (
                  <>
                    <div>
                      <label className="form-label">Gateway ID</label>
                      <select className="form-input" disabled={mockMode} value={gatewayId} onChange={(e) => { setGatewayId(e.target.value); setIsPollingActive(false); }}>
                        <option value="">-- Select Gateway --</option>
                        {discoveredDevices.map((gw: any) => (
                           <option key={gw.gatewayId} value={gw.gatewayId}>{gw.name} ({gw.gatewayId})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">TapLinker Device ID</label>
                      <select className="form-input" disabled={mockMode} value={deviceId} onChange={(e) => { setDeviceId(e.target.value); setIsPollingActive(false); }}>
                        <option value="">-- Select TapLinker --</option>
                        {(discoveredDevices.find((gw: any) => gw.gatewayId === gatewayId)?.taplinker || []).map((tl: any) => (
                           <option key={tl.taplinkerId} value={tl.taplinkerId}>{tl.taplinkerName} ({tl.taplinkerId})</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="form-label">Gateway ID</label>
                      <input 
                        type="text" 
                        disabled={mockMode} 
                        className="form-input" 
                        placeholder="e.g. 1485A036004B1200"
                        maxLength={16}
                        value={gatewayId} 
                        onChange={(e) => { 
                          setGatewayId(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 16)); 
                          setIsPollingActive(false); 
                        }} 
                      />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Must be exactly 16 uppercase hex characters (0-9, A-F). No dashes.</div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label className="form-label">TapLinker Device ID</label>
                      <input 
                        type="text" 
                        disabled={mockMode} 
                        className="form-input" 
                        placeholder="e.g. 6422F036004B1200"
                        maxLength={16}
                        value={deviceId} 
                        onChange={(e) => { 
                          setDeviceId(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 16)); 
                          setIsPollingActive(false); 
                        }} 
                      />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Must be exactly 16 uppercase hex characters. No dashes.</div>
                    </div>
                  </>
                )}

                <div style={{ marginTop: '4px' }}>
                   <button className="btn-secondary" disabled={isDiscovering || !cloudUsername || !cloudApiKey} onClick={handleDiscover} style={{ width: '100%', padding: '10px' }}>
                     {isDiscovering ? 'Discovering...' : '📡 Auto-Discover Devices from Cloud'}
                   </button>
                   {(!cloudUsername || !cloudApiKey) && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>Enter Cloud Username & API Key above to enable auto-discovery.</div>}
                </div>
                
                <div><label className="form-label">Polling Refresh Rate: {refreshInterval}s</label><input type="range" min="2" max="30" className="form-input" style={{ padding: 0 }} value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} /></div>

                <button 
                  className="btn-primary" 
                  disabled={mockMode || isPollingActive}
                  onClick={() => setIsPollingActive(true)}
                  style={{ marginTop: '8px', padding: '12px', fontSize: '1.05rem', fontWeight: 700 }}
                >
                  {isPollingActive ? '✓ Connected (Live Polling Active)' : '▶ Apply & Connect'}
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: mockMode ? 1 : 0.6 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Simulate Locally (Mock Mode)
                    {!canUseRealConnection && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem', display: 'block' }}><br/>Hardware Disabled in Web Demo</span>}
                  </label>
                  <input type="checkbox" disabled={!canUseRealConnection} checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} style={{ width: '16px', height: '16px', cursor: !canUseRealConnection ? 'not-allowed' : 'pointer', accentColor: 'var(--accent-cyan)' }} />
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimulatorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(4,8,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', border: '1px solid rgba(0, 242, 254, 0.4)' }}>
              <button onClick={() => setShowSimulatorModal(false)} className="btn-secondary" style={{ position: 'absolute', top: '20px', right: '20px', padding: '6px 10px', fontSize: '1rem', zIndex: 10 }}>✕</button>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '12px' }}>Mock Simulator Console</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Test your flood alarm system immediately: Simulate high-rate leakages, pipe damage, or low batteries.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                <button onClick={triggerMockBurst} className="btn-secondary" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: '#ff8b8b' }}>💥 Simulate 28 L/min Pipe Burst</button>
                <button onClick={triggerMockLeak} className="btn-secondary" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.05)', color: '#fde68a' }}>⚠️ Simulate Weeping Pipe Leak</button>
                <button onClick={triggerMockLowBattery} className="btn-secondary">🔋 Simulate Battery Drop (8%)</button>
                <button onClick={clearAlarms} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: 'none' }}>✅ Clear All Alarm Simulations</button>
              </div>
           </div>
        </div>
      )}

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
