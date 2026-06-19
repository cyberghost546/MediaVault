// Import the type definition from Tailwind so TypeScript knows what is allowed.
import type { Config } from 'tailwindcss'

// The configuration object Tailwind reads when it processes your CSS.
const config: Config = {

  // "content" tells Tailwind WHERE to look for class names.
  // WHY: Tailwind only includes CSS for classes it actually finds in your code.
  //      If it cannot find the file, the class will be missing from the final CSS.
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // "darkMode: 'class'" means dark mode is activated by adding the "dark" class
  // to the <html> element — we control this in our ThemeProvider.
  // WHY: This gives us full control over when dark mode turns on, rather than
  //      relying on the user's OS setting alone (which is "media" mode).
  darkMode: 'class',

  // "theme.extend" adds new values WITHOUT removing Tailwind's built-in defaults.
  // Everything inside "extend" is merged with the defaults.
  theme: {
    extend: {

      // Custom color palette for MediaVault's brand.
      // Usage in JSX:  className="bg-brand-600 text-brand-50"
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',   // ← primary button color
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Surface colors for cards and panels in dark/light mode.
        surface: {
          light: '#ffffff',
          dark:  '#0f172a',
        },
      },

      // Custom font family loaded from Google Fonts or local files.
      // Usage: className="font-sans"
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      // Custom border radius values.
      // "xl2" gives slightly more rounded corners than Tailwind's built-in "2xl".
      borderRadius: {
        xl2: '1rem',
      },

      // Custom box shadows for cards and modals.
      boxShadow: {
        card: '0 2px 8px 0 rgb(0 0 0 / 0.08)',
        modal:'0 20px 60px -12px rgb(0 0 0 / 0.4)',
      },

      // Custom animation keyframes used for loading spinners and progress bars.
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // Register the keyframes above as usable Tailwind animation utilities.
      // Usage: className="animate-shimmer"
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
        fadeIn:  'fadeIn 0.2s ease-out',
      },
    },
  },

  // "plugins" can add extra utility classes to Tailwind.
  // We have none right now, but this is where you would add them.
  plugins: [],
}

// Export the config so Tailwind can read it.
export default config
