// =============================================================================
// app/layout.tsx — ROOT LAYOUT
// =============================================================================
// In Next.js App Router, layout.tsx wraps every page.
// This file sets up:
//   1. The HTML document structure (<html>, <head>, <body>)
//   2. Global styles (globals.css → Tailwind)
//   3. The Navbar that appears at the top of every page
//   4. The ThemeProvider that manages dark/light mode
//
// FLOW:
//   Browser requests any page → Next.js renders layout.tsx first
//   → The layout renders the Navbar + {children}
//   → {children} is replaced with the matched page component
//   (e.g. for "/download" → children = download/page.tsx)
// =============================================================================

// Import global styles. MUST be imported in the root layout.
import './globals.css'

// Import the Navbar component.
import { Navbar } from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui/ToastContainer'

// Import Metadata type — used to set the browser tab title and description.
import type { Metadata, Viewport } from 'next'

// Import ReactNode type — "children" is whatever page is rendered inside this layout.
import type { ReactNode } from 'react'


// "metadata" is a special Next.js export.
// Next.js automatically adds these values to <head> as <title> and <meta> tags.
export const metadata: Metadata = {
  title: {
    // "template" adds " | MediaVault" after every page title automatically.
    template: '%s | MediaVault',
    // "default" is the title when a page does not specify its own.
    default:  'MediaVault',
  },
  description: 'Download your public social media content from Facebook, Instagram, TikTok, X and Snapchat.',
}

// "viewport" must be a separate export in Next.js 14+ — not inside metadata.
// WHY: Next.js split it out so the viewport meta tag is handled consistently.
export const viewport: Viewport = {
  width:         'device-width',
  initialScale:  1,
}


// "RootLayout" is the component that Next.js renders first for every page.
// "children" is the page component that goes inside it.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (

    // "lang=en" tells screen readers and search engines the language.
    // We do NOT add the "dark" class here — useTheme adds it dynamically via JS.
    <html lang="en">

      <body>
        {/* The Navbar is in the layout so it appears on every page automatically */}
        <Navbar />

        {/* "main" is a semantic HTML5 landmark — screen readers jump to it with a shortcut */}
        {/* "pb-20 md:pb-0" adds bottom padding on mobile for the fixed bottom nav bar */}
        <main className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
          {children}
        </main>
        {/* Toast notifications — rendered once here, usable from any page */}
        <ToastContainer />
      </body>

    </html>
  )
}
