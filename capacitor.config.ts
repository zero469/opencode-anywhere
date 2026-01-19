import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.opencode.anywhere',
  appName: 'OpenCode Anywhere',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    Keyboard: {
      resize: 'none'
    }
  }
};

export default config;
