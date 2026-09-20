import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fasocarnet.app',
  appName: 'FasoCarnet',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
