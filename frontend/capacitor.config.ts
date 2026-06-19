// Import the type so TypeScript validates our config object.
import type { CapacitorConfig } from '@capacitor/cli'

// This is the main Capacitor configuration.
// Every property here affects how the mobile app is built and behaves.
const config: CapacitorConfig = {

  // "appId" is the unique identifier for your app on Google Play and the App Store.
  // Format: reverse domain name (like Java package names).
  // WHY: App stores use this ID to identify your app. Never change it after publishing
  //      because it would create a completely new app listing.
  appId: 'com.mediavault.app',

  // "appName" is the display name shown under the app icon on the user's phone.
  appName: 'MediaVault',

  // "webDir" tells Capacitor where to find the built web files.
  // WHY: "next build" with "output: export" puts files into the "out" folder.
  //      Capacitor copies everything from this folder into the native project.
  webDir: 'out',

  // "server" controls how the app loads its web content on the device.
  server: {

    // "androidScheme: 'https'" makes the WebView use https:// internally.
    // WHY: Some browser security features (like localStorage) only work on https.
    //      This setting makes Android treat the local file as if it were https.
    androidScheme: 'https',

    // "allowNavigation" lists external URLs the WebView is allowed to open.
    // WHY: By default Capacitor blocks all external navigation for security.
    //      We need to allow our PHP backend so API calls can reach it.
    allowNavigation: [
      'localhost:8000',   // PHP backend (development)
      '*.mediavault.app', // Production domain (replace with your real domain)
    ],
  },

  // "plugins" configures individual Capacitor plugins.
  plugins: {

    // "Filesystem" is a Capacitor plugin that lets the app read and write files
    // on the device's storage (photos, videos, downloads folder).
    // WHY: A regular browser cannot write to arbitrary folders on a phone.
    //      Capacitor's Filesystem plugin bypasses this limitation using native code.
    Filesystem: {
      // "iosSupportedFolders" lists which iOS folders we need access to.
      iosSupportedFolders: ['Documents', 'Library'],
    },

    // "SplashScreen" controls the loading screen shown when the app first opens.
    SplashScreen: {
      // How many milliseconds to show the splash screen before hiding it.
      launchShowDuration: 2000,

      // "backgroundColor" is the hex color of the splash screen background.
      backgroundColor: '#0f172a', // dark navy — matches our dark theme
    },
  },
}

// Export the config so Capacitor's CLI can import and use it.
export default config
