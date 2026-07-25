import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bunkr.downloader',
  appName: 'BunkrDownloader',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
