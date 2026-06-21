export const DEFAULT_CONFIG: Record<string, string> = {
  lt_cloud_user: '',
  lt_cloud_key: '',
  lt_alert_offline: 'true',
  lt_gateway_ip: '',
  lt_gateway_id: '',
  lt_device_id: '',
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
  lt_notifications: 'false',
  lt_alarm_sound: 'beep',
  lt_alarm_vol: '1.0',
  lt_alarm_repeat: 'once',
  lt_notif_autoguard: 'true',
  lt_notif_battery: 'false',
  lt_notif_watering: 'false',
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
  lt_vessel_name: '',
  lt_is_cloud_polling: 'false',
  lt_is_local_polling: 'false',
  lt_mock: 'true'
};

export const SYNCABLE_KEYS = Object.keys(DEFAULT_CONFIG);

export function isLocalConfigDefault(): boolean {
  for (const key of SYNCABLE_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null && val !== DEFAULT_CONFIG[key]) {
      return false; // Found a non-default value
    }
  }
  return true;
}

export function getLocalConfig(): Record<string, any> {
  const config: Record<string, any> = {};
  for (const key of SYNCABLE_KEYS) {
    const val = localStorage.getItem(key);
    config[key] = val !== null ? val : DEFAULT_CONFIG[key];
  }
  
  // Maintain backward compatibility with Cloudflare Worker
  config.linktap = {
    username: config.lt_cloud_user,
    apiKey: config.lt_cloud_key,
    gatewayId: config.lt_gateway_id,
    taplinkerId: config.lt_device_id
  };
  
  return config;
}

export function applyCloudConfig(config: Record<string, any>) {
  for (const key of SYNCABLE_KEYS) {
    if (config[key] !== undefined) {
      localStorage.setItem(key, config[key] as string);
    }
  }
  window.dispatchEvent(new Event('settings_updated'));
}
