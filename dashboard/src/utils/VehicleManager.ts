import { VEHICLE_KEYS, VEHICLE_DEFAULT_CONFIG } from './configSync';

export interface DeviceConfig {
  id: string; // Internal BoatRV Device ID (e.g., 'brv_dev_123')
  type: 'linktap_valve' | 'shelly_sensor';
  role: string; // e.g., 'Fresh Water', 'High Power'
  name: string;
  
  // LinkTap mapping
  linktapGatewayId?: string;
  linktapDeviceId?: string;
  
  // Shelly mapping
  shellyDeviceId?: string;
  
  // Device-specific settings
  maxFlowRate?: number;
  maxDuration?: number;
  autoGuardEnabled?: boolean;
}

export interface Vehicle {
  id: string;
  config: Record<string, string>;
}

export function generateVehicleId() {
  return 'v_' + Math.random().toString(36).substr(2, 9);
}

export function getVehiclesMap(): Record<string, Vehicle> {
  try {
    const data = localStorage.getItem('lt_vehicles');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

export function saveVehiclesMap(map: Record<string, Vehicle>) {
  localStorage.setItem('lt_vehicles', JSON.stringify(map));
}

export function getActiveVehicleId(): string {
  let id = localStorage.getItem('lt_active_vehicle_id');
  if (!id) {
    // If no active vehicle exists, initialize one with current root keys to preserve existing user data
    const map = getVehiclesMap();
    id = generateVehicleId();
    const currentConfig: Record<string, string> = {};
    for (const key of VEHICLE_KEYS) {
      currentConfig[key] = localStorage.getItem(key) || VEHICLE_DEFAULT_CONFIG[key];
    }
    // Set a default name if it was empty
    if (!currentConfig.lt_vessel_name) {
      currentConfig.lt_vessel_name = 'My First Vessel';
      localStorage.setItem('lt_vessel_name', 'My First Vessel');
    }
    map[id] = { id, config: currentConfig };
    saveVehiclesMap(map);
    localStorage.setItem('lt_active_vehicle_id', id);
  }
  return id;
}

// Ensure an active vehicle exists on module load
getActiveVehicleId();

/**
 * Saves the current active configuration from root localStorage into the active vehicle profile.
 */
export function syncRootToActiveVehicle() {
  const activeId = getActiveVehicleId();
  const map = getVehiclesMap();
  
  if (!map[activeId]) {
    map[activeId] = { id: activeId, config: {} };
  }
  
  for (const key of VEHICLE_KEYS) {
    map[activeId].config[key] = localStorage.getItem(key) || VEHICLE_DEFAULT_CONFIG[key];
  }
  
  saveVehiclesMap(map);
}

/**
 * Switches the active vehicle, saving current state and loading the new vehicle state into root localStorage.
 */
export function switchVehicle(newId: string) {
  const map = getVehiclesMap();
  if (!map[newId]) throw new Error('Vehicle not found');

  // Backup current state
  syncRootToActiveVehicle();

  // Load new state
  const newConfig = map[newId].config;
  for (const key of VEHICLE_KEYS) {
    localStorage.setItem(key, newConfig[key] || VEHICLE_DEFAULT_CONFIG[key]);
  }

  localStorage.setItem('lt_active_vehicle_id', newId);
  window.dispatchEvent(new Event('settings_updated'));
}

export function addNewVehicle(name: string = 'New Vessel') {
  const map = getVehiclesMap();
  const id = generateVehicleId();
  const newConfig = { ...VEHICLE_DEFAULT_CONFIG, lt_vessel_name: name };
  map[id] = { id, config: newConfig };
  saveVehiclesMap(map);
  return id;
}

export function deleteVehicle(id: string) {
  const map = getVehiclesMap();
  if (Object.keys(map).length <= 1) {
    throw new Error('Cannot delete the last vehicle.');
  }

  delete map[id];
  saveVehiclesMap(map);

  const activeId = localStorage.getItem('lt_active_vehicle_id');
  if (activeId === id) {
    // We deleted the active vehicle, switch to the first available one
    const newActiveId = Object.keys(map)[0];
    const newConfig = map[newActiveId].config;
    for (const key of VEHICLE_KEYS) {
      localStorage.setItem(key, newConfig[key] || VEHICLE_DEFAULT_CONFIG[key]);
    }
    localStorage.setItem('lt_active_vehicle_id', newActiveId);
    localStorage.setItem('lt_active_vehicle_id', newActiveId);
    window.dispatchEvent(new Event('settings_updated'));
  }
}

// --- Device Array Management Helpers ---

export function getDevices(): DeviceConfig[] {
  try {
    const data = localStorage.getItem('lt_devices');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveDevices(devices: DeviceConfig[]) {
  localStorage.setItem('lt_devices', JSON.stringify(devices));
  window.dispatchEvent(new Event('settings_updated'));
}

export function addDevice(device: DeviceConfig) {
  const devices = getDevices();
  devices.push(device);
  saveDevices(devices);
}

export function updateDevice(id: string, updates: Partial<DeviceConfig>) {
  const devices = getDevices();
  const index = devices.findIndex(d => d.id === id);
  if (index !== -1) {
    devices[index] = { ...devices[index], ...updates };
    saveDevices(devices);
  }
}

export function removeDevice(id: string) {
  const devices = getDevices();
  const newDevices = devices.filter(d => d.id !== id);
  saveDevices(newDevices);
}
