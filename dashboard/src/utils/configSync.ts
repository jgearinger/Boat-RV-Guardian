export const LOCAL_ONLY_KEYS = [
  'lt_sync_cloud',
  'lt_alert_offline',
  'lt_notif_enabled',
  'lt_alarm_sound',
  'lt_alarm_vol',
  'lt_alarm_repeat',
  'lt_notif_ag',
  'lt_notif_batt',
  'lt_notif_water',
  'lt_notif_flood',
  'lt_notif_house_batt',
  'lt_notif_engine_batt',
  'lt_notif_shore'
];

export const VEHICLE_DEFAULT_CONFIG: Record<string, string> = {
  lt_cloud_user: '',
  lt_cloud_key: '',
  lt_gateway_ip: '',
  lt_gateway_id: '',
  lt_device_id: '',
  lt_device_id_2: '',
  lt_store_history_cloud: 'false',
  lt_refresh: '5',
  lt_auto_guard: 'true',
  lt_unit: 'imperial',
  lt_tz: ((Intl as any).supportedValuesOf ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
  lt_nr_hrs: '0',
  lt_nr_mins: '0',
  lt_nr_daily: 'false',
  lt_nr_vol: '10',
  lt_nr_auto: 'false',
  lt_maxflow: '15',
  lt_maxdur: '30',
  lt_reset_time: '12:00',
  lt_enable_history: 'true',
  lt_input_dur: '15',
  lt_input_vol: '50',
  lt_del_mins: '0',
  lt_del_secs: '15',
  lt_wash_dur: '30',
  lt_wd_resume: 'false',
  lt_norm_daily: 'false',
  lt_norm_hrs: '24',
  lt_norm_mins: '0',
  lt_norm_vol: '300',
  lt_auto_restart: 'false',
  lt_target_dur: '0',
  lt_target_vol: '0',
  lt_batt_low_v: '11.9',
  lt_batt_crit_v: '11.5',
  lt_batt_charge_v: '13.2',
  lt_batt_over_v: '15.5',
  lt_vessel_name: 'New Vessel',
  lt_is_cloud_polling: 'false',
  lt_is_local_polling: 'false',
  lt_mock: 'true',
  lt_devices: '[]'
};

export const VEHICLE_KEYS = Object.keys(VEHICLE_DEFAULT_CONFIG);

export function isLocalVehicleConfigDefault(): boolean {
  for (const key of VEHICLE_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null && val !== VEHICLE_DEFAULT_CONFIG[key]) {
      return false; // Found a non-default value
    }
  }
  return true;
}

export function getLocalVehicleConfig(): Record<string, any> {
  const config: Record<string, any> = {};
  for (const key of VEHICLE_KEYS) {
    const val = localStorage.getItem(key);
    config[key] = val !== null ? val : VEHICLE_DEFAULT_CONFIG[key];
  }
  return config;
}

export function applyCloudVehicleConfig(config: Record<string, any>) {
  for (const key of VEHICLE_KEYS) {
    if (config[key] !== undefined) {
      localStorage.setItem(key, config[key] as string);
    }
  }
  window.dispatchEvent(new Event('settings_updated'));
}
