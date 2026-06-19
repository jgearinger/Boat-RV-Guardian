import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jgearinger.linktapboatrv',
  appName: 'linktap-boat-rv',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: ['192.168.*', '10.*', '172.16.*', '172.31.*']
  }
};

export default config;
