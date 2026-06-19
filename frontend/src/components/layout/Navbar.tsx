// =============================================================================
// Navbar Component
// The top navigation bar shown on every page.
// Contains the app logo, navigation links, and the dark/light mode toggle.
//
// HOW IT COMMUNICATES:
//   - Reads "activeCount" from useDownloadStore to show a badge.
//   - Calls "setTheme" from useTheme to toggle dark mode.
//   - Uses Next.js "Link" for client-side navigation (no page reload).
// =============================================================================

'use client'

// "Link" from Next.js handles navigation without a full page reload.
// It is like <a href="..."> but faster — it pre-fetches the destination page.
import Link from 'next/link'

// "usePathname" tells us what the current URL path is.
// We use it to highlight the active nav link.
import { usePathname } from 'next/navigation'

// Icons from lucide-react — each icon is a React component.
import {
  Download,      // Cloud with down arrow — represents downloads
  History,       // Clock arrow — represents history
  FolderOpen,    // Open folder — represents file manager
  User,          // Person outline — represents profile scan
  Moon,          // Crescent moon — dark mode
  Sun,           // Sun — light mode
  LockKeyhole,   // Lock with keyhole — used as the app logo (Vault icon doesn't exist in this version)
  Settings,      // Gear — represents settings
} from 'lucide-react'

// clsx merges class strings.
import clsx from 'clsx'

// Our hooks.
import { useDownloadStore } from '@/store/downloadStore'
import { useTheme } from '@/hooks/useTheme'


// "NAV_LINKS" is an array of objects describing each navigation item.
// We define it outside the component so it is not recreated on every render.
const NAV_LINKS = [
  { href: '/download',  label: 'Download',  icon: Download  },
  { href: '/profile',   label: 'Profile',   icon: User      },
  { href: '/manager',   label: 'Manager',   icon: FolderOpen},
  { href: '/history',   label: 'History',   icon: History   },
  { href: '/settings',  label: 'Settings',  icon: Settings  },
] as const  // "as const" makes the array immutable and its values literal types


export function Navbar() {

  // "usePathname()" returns the current URL path (e.g. "/download").
  const pathname = usePathname()

  // Read the active download count from the global store.
  // This re-renders the Navbar whenever "activeCount" changes.
  const activeCount = useDownloadStore((s) => s.activeCount)

  // Read and set the current theme.
  const { theme, setTheme } = useTheme()

  // Toggle between light and dark mode.
  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    // "sticky top-0 z-40" makes the navbar stick to the top of the viewport while scrolling.
    // "z-40" controls the stacking order — the navbar appears above content but below modals (z-50).
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">

      {/* Inner container: limits the max width and centres content */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* ── LOGO ── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* App icon */}
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <LockKeyhole className="w-4 h-4 text-white" />
          </div>
          {/* App name */}
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            Media<span className="text-brand-600">Vault</span>
          </span>
        </Link>

        {/* ── NAVIGATION LINKS (desktop) ── */}
        {/* "hidden md:flex" hides on mobile, shows on medium screens and up */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {

            // Determine if this link is the currently active page.
            const isActive = pathname === href || pathname.startsWith(href + '/')

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  // Base link styles
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  // Active vs inactive styling
                  isActive
                    ? 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-950'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {/* The icon from the NAV_LINKS array */}
                <Icon className="w-4 h-4" />
                {label}

                {/* Badge: shows active download count on the Manager link */}
                {label === 'Manager' && activeCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-brand-600 rounded-full leading-none">
                    {activeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── RIGHT SIDE ACTIONS ── */}
        <div className="flex items-center gap-2">

          {/* Dark / Light mode toggle button */}
          {/* type="button" prevents accidental form submission if this were inside a <form> */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {/* Show the Sun icon in dark mode (clicking goes to light), Moon in light mode */}
            {theme === 'dark'
              ? <Sun  className="w-4.5 h-4.5" />
              : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      {/* Shown only on small screens (md:hidden hides it on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-1',
                'text-xs font-medium transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
