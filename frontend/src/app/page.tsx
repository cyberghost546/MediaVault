// =============================================================================
// app/page.tsx — HOME PAGE  (URL: "/")
// =============================================================================
// The first page users see. It explains what the app does and links to the
// main features (Download, Profile Backup, Download Manager).
// =============================================================================

// "use client" is needed because we use Link (client-side navigation).
'use client'

import Link from 'next/link'
import { Download, User, FolderOpen, ArrowRight, Shield, Zap, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'


// The feature cards shown in the grid on the home page.
const FEATURES = [
  {
    icon:  Download,
    title: 'Single Link Download',
    desc:  'Paste any public post URL and download images, videos, and reels instantly.',
    href:  '/download',
    color: 'text-brand-600',
    bg:    'bg-brand-50 dark:bg-brand-950',
  },
  {
    icon:  User,
    title: 'Profile Backup',
    desc:  'Scan an entire public profile and batch-download hundreds of files at once.',
    href:  '/profile',
    color: 'text-purple-600',
    bg:    'bg-purple-50 dark:bg-purple-950',
  },
  {
    icon:  FolderOpen,
    title: 'Download Manager',
    desc:  'Pause, resume, retry, and track all your downloads in one place.',
    href:  '/manager',
    color: 'text-emerald-600',
    bg:    'bg-emerald-50 dark:bg-emerald-950',
  },
] as const


export default function HomePage() {
  return (
    <div className="space-y-16">

      {/* ── HERO SECTION ── */}
      <section className="text-center pt-12 pb-4 space-y-6">

        {/* "animate-fadeIn" uses our custom Tailwind animation (defined in tailwind.config.ts) */}
        <div className="animate-fadeIn space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Your media,{' '}
            {/* "text-transparent bg-clip-text" creates a gradient text effect */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">
              your vault
            </span>
          </h1>

          <p className="max-w-xl mx-auto text-lg text-gray-500 dark:text-gray-400">
            Download photos, videos, and reels from public social media posts.
            Organise everything automatically. Works on any device.
          </p>
        </div>

        {/* Call-to-action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/download">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start Downloading
            </Button>
          </Link>
          <Link href="/profile">
            <Button size="lg" variant="secondary">
              Backup a Profile
            </Button>
          </Link>
        </div>

        {/* Supported platforms row */}
        <div className="flex justify-center gap-6 pt-2 text-sm text-gray-400">
          {['📘 Facebook', '🐦 X', '📸 Instagram', '🎵 TikTok', '👻 Snapchat'].map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Everything you need
        </h2>

        {/* Responsive 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, href, color, bg }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                {/* Icon circle */}
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>

                {/* Arrow indicator that appears on hover */}
                <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section className="border-t border-gray-200 dark:border-gray-800 pt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: Shield, title: 'Privacy First',   desc: 'We never store your files. Everything saves directly to your device.' },
            { icon: Zap,    title: 'Fast Downloads',  desc: 'Parallel downloads and smart queuing keep things moving quickly.'    },
            { icon: Globe,  title: 'Cross-Platform',  desc: 'Works on Windows, macOS, Linux, Android, and iOS.'                   },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-2">
              <Icon className="w-6 h-6 text-brand-600 mx-auto" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
