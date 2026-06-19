// Zustand's "create" and the "persist" middleware.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Import the AppSettings type we defined in types/index.ts.
import type { AppSettings } from '@/types'


// The store combines the settings data with a single action to update it.
interface SettingsStore {

  // The current settings object.
  settings: AppSettings

  // Update any subset of settings (you only pass the fields you want to change).
  updateSettings: (partial: Partial<AppSettings>) => void

  // Reset everything back to factory defaults.
  resetSettings: () => void
}


// DEFAULT_SETTINGS are the values a brand-new user gets on first launch.
// Defined outside the store so we can reuse them in "resetSettings".
const DEFAULT_SETTINGS: AppSettings = {

  // Start in 'system' mode — respect the OS dark/light preference.
  theme: 'system',

  // Default download folder. On mobile, Capacitor overrides this with the
  // device's actual Downloads directory.
  downloadPath: 'downloads',

  // Automatically create platform/username sub-folders.
  autoOrganize: true,

  // Prefix filenames with the post date.
  timestampRename: true,

  // Skip files that look like duplicates (same URL already downloaded).
  skipDuplicates: true,

  // Run up to 3 downloads at the same time.
  maxConcurrentDownloads: 3,

  // Show a desktop notification when each download finishes.
  notifyOnComplete: true,
}


// Export the hook so components can use it.
export const useSettingsStore = create<SettingsStore>()(

  // Persist settings to localStorage so the user's preferences survive refresh.
  persist(
    (set) => ({

      // Start with the defaults.
      settings: DEFAULT_SETTINGS,

      // Merge incoming changes with the current settings.
      // Example:  updateSettings({ theme: 'dark' })
      //   Before: { theme: 'system', autoOrganize: true, ... }
      //   After:  { theme: 'dark',   autoOrganize: true, ... }
      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }))
      },

      // Replace settings entirely with the defaults.
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS })
      },
    }),

    {
      // Key in localStorage.
      name: 'mediavault-settings',
    }
  )
)
