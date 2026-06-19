import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jgearinger.boatrvguardian',
  appName: 'Boat-RV-Guardian',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: ['192.168.*', '10.*', '172.16.*', '172.31.*']
  }
};

export default config;
