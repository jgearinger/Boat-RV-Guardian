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
  localIp?: string; // Shelly local IP (for local RPC polling / factory reset)

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

// 8-char password with upper, lower, and digits — used as each vehicle's Shelly local password.
export function generateShellyPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Guarantee at least one of each class, then fill the rest.
  let chars = [pick(upper), pick(upper), pick(lower), pick(lower), pick(lower), pick(digits), pick(digits), pick(all)];
  // Shuffle so the guaranteed positions aren't predictable.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Dispatch settings_updated with the cloud-sync guard raised so SyncModal's auto-save does
// NOT treat a vehicle change as an edit and write the freshly-loaded config to the wrong record.
function dispatchSettingsUpdatedGuarded() {
  (window as any).__is_syncing_cloud = true;
  window.dispatchEvent(new Event('settings_updated'));
  (window as any).__is_syncing_cloud = false;
}

// Tombstones: ids deleted locally. Filtered out of cloud re-hydration so a deleted vehicle
// cannot reappear in the window before the cloud allowedUsers removal propagates.
export function getDeletedVehicleIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem('lt_deleted_vehicles') || '[]');
  } catch {
    return [];
  }
}

function addDeletedVehicleId(id: string) {
  const ids = getDeletedVehicleIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem('lt_deleted_vehicles', JSON.stringify(ids));
  }
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
    // Generate a Shelly local password for this vehicle if one isn't set
    if (!currentConfig.sh_local_password) {
      currentConfig.sh_local_password = generateShellyPassword();
      localStorage.setItem('sh_local_password', currentConfig.sh_local_password);
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
  dispatchSettingsUpdatedGuarded();
}

export function addNewVehicle(name: string = 'New Vessel') {
  const map = getVehiclesMap();
  const id = generateVehicleId();
  const newConfig = { ...VEHICLE_DEFAULT_CONFIG, lt_vessel_name: name, sh_local_password: generateShellyPassword() };
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
  addDeletedVehicleId(id); // tombstone so the cloud listener can't re-add it

  const activeId = localStorage.getItem('lt_active_vehicle_id');
  if (activeId === id) {
    // We deleted the active vehicle, switch to the first available one
    const newActiveId = Object.keys(map)[0];
    const newConfig = map[newActiveId].config;
    for (const key of VEHICLE_KEYS) {
      localStorage.setItem(key, newConfig[key] || VEHICLE_DEFAULT_CONFIG[key]);
    }
    localStorage.setItem('lt_active_vehicle_id', newActiveId);
    dispatchSettingsUpdatedGuarded();
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
