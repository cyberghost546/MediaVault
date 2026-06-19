// =============================================================================
// useTheme — Custom Hook for Dark / Light Mode
// =============================================================================
// Controls which CSS theme is active by toggling the "dark" class on <html>.
// Tailwind's "darkMode: 'class'" config means:
//   - If <html> has class "dark" → dark styles apply
//   - If <html> has no "dark" class → light styles apply
// =============================================================================

// "useEffect" runs side effects (code that affects things outside React).
// "useState"  stores the current theme value.
import { useEffect, useState } from 'react'

// Import settings store to read and save the user's theme preference.
import { useSettingsStore } from '@/store/settingsStore'


// The three possible theme settings.
type ThemeValue = 'light' | 'dark' | 'system'


export function useTheme() {

  // Read the theme preference from the settings store.
  const theme          = useSettingsStore((s) => s.settings.theme)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  // "resolvedTheme" is the actual theme being displayed:
  //   - If theme is 'system', it follows the OS dark/light setting.
  //   - If theme is 'light' or 'dark', it is that literal value.
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')


  // "useEffect" with theme as a dependency runs every time "theme" changes.
  // WHY: Whenever the user changes their preference, we need to update <html>.
  useEffect(() => {

    // "document.documentElement" is the <html> element.
    const root = document.documentElement

    // Helper function that applies the actual class to <html>.
    function applyTheme(isDark: boolean) {
      if (isDark) {
        // Add "dark" class to activate Tailwind's dark mode styles.
        root.classList.add('dark')
        setResolvedTheme('dark')
      } else {
        // Remove "dark" class to show light styles.
        root.classList.remove('dark')
        setResolvedTheme('light')
      }
    }

    if (theme === 'system') {
      // "window.matchMedia" checks the OS/browser preference for dark mode.
      // "prefers-color-scheme: dark" is a CSS media feature that is true
      // when the OS is in dark mode.
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      // Apply the theme immediately based on current OS setting.
      applyTheme(mediaQuery.matches)

      // "addEventListener" lets us react when the OS theme changes WHILE the app is open.
      // For example, if the user switches from Light to Dark in Windows Settings.
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)

      // The function returned from useEffect is the "cleanup" function.
      // React calls it when this effect runs again or the component unmounts.
      // WHY: Without cleanup, the event listener would keep piling up.
      return () => mediaQuery.removeEventListener('change', handler)

    } else {
      // User explicitly chose 'light' or 'dark' — apply immediately.
      applyTheme(theme === 'dark')
    }

  }, [theme])  // Re-run whenever the "theme" value changes.


  // "setTheme" is what components call to change the theme.
  function setTheme(newTheme: ThemeValue) {
    // Save to the settings store (which persists to localStorage).
    updateSettings({ theme: newTheme })
  }

  // Return the current and resolved theme, plus the setter.
  return { theme, resolvedTheme, setTheme }
}
