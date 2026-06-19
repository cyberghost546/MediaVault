// =============================================================================
// app/settings/page.tsx — USER SETTINGS  (URL: "/settings")
// =============================================================================
// Lets the user configure:
//   • Appearance  — light / dark / system theme
//   • Downloads   — default folder, max concurrent downloads
//   • File naming — auto-organize into sub-folders, timestamp prefix
//   • Privacy     — skip duplicates
//   • Notifications
//
// All settings are stored in the Zustand settingsStore which persists to
// localStorage via the "persist" middleware. Changes take effect immediately.
// =============================================================================

'use client'

import { useSettingsStore } from '@/store/settingsStore'
import { useTheme          } from '@/hooks/useTheme'
import { Card              } from '@/components/ui/Card'
import { Button            } from '@/components/ui/Button'
import { toast             } from '@/store/toastStore'
import {
  Sun, Moon, Monitor, Folder, Download, LayoutGrid,
  Clock, Copy, Bell, RotateCcw, Save
} from 'lucide-react'
import clsx from 'clsx'


// =============================================================================
// Small reusable sub-components
// =============================================================================

// Section heading with an icon — used to group related settings visually.
function SectionHeader({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// A single settings row with a label, optional description, and a control on the right.
function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// A styled toggle switch (checkbox).
function Toggle({ checked, onChange, disabled }: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        checked
          ? 'bg-brand-600'
          : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}


// =============================================================================
// SettingsPage
// =============================================================================
export default function SettingsPage() {

  // Read the settings store.
  const settings       = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const resetSettings  = useSettingsStore((s) => s.resetSettings)

  // useTheme provides the setTheme helper that also updates the DOM class.
  const { setTheme } = useTheme()

  // Handler that saves both to the settings store AND updates the DOM theme.
  function handleThemeChange(theme: 'light' | 'dark' | 'system') {
    updateSettings({ theme })
    setTheme(theme)
    toast.success(`Theme set to ${theme}.`)
  }

  function handleReset() {
    resetSettings()
    toast.warning('Settings reset to defaults.')
  }


  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* PAGE HEADING */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Preferences are saved automatically and persist across sessions.
        </p>
      </div>


      {/* ── APPEARANCE ── */}
      <Card>
        <SectionHeader
          icon={<Sun className="w-5 h-5" />}
          title="Appearance"
          description="Choose how MediaVault looks on your device."
        />

        <SettingRow
          label="Color theme"
          description="'System' follows your OS dark/light mode setting."
        >
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['light', 'system', 'dark'] as const).map((option) => {
              const Icon = option === 'light' ? Sun : option === 'dark' ? Moon : Monitor
              const label = option.charAt(0).toUpperCase() + option.slice(1)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleThemeChange(option)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    settings.theme === option
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  title={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </SettingRow>
      </Card>


      {/* ── DOWNLOADS ── */}
      <Card>
        <SectionHeader
          icon={<Download className="w-5 h-5" />}
          title="Downloads"
          description="Configure where files go and how many download at once."
        />

        <SettingRow
          label="Download folder"
          description="Where downloaded files are saved on this device."
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
              <Folder className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="truncate">{settings.downloadPath}</span>
            </div>
          </div>
        </SettingRow>

        <SettingRow
          label="Concurrent downloads"
          description={`Download up to ${settings.maxConcurrentDownloads} file${settings.maxConcurrentDownloads !== 1 ? 's' : ''} at the same time.`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={settings.maxConcurrentDownloads}
              onChange={(e) => updateSettings({ maxConcurrentDownloads: Number(e.target.value) })}
              className="w-24 accent-brand-600"
            />
            <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">
              {settings.maxConcurrentDownloads}
            </span>
          </div>
        </SettingRow>
      </Card>


      {/* ── FILE ORGANIZATION ── */}
      <Card>
        <SectionHeader
          icon={<LayoutGrid className="w-5 h-5" />}
          title="File Organization"
          description="Control how downloaded files are named and sorted."
        />

        <SettingRow
          label="Auto-organize into folders"
          description="Creates platform/username sub-folders automatically (e.g. instagram/nasa/)."
        >
          <Toggle
            checked={settings.autoOrganize}
            onChange={(val) => updateSettings({ autoOrganize: val })}
          />
        </SettingRow>

        <SettingRow
          label="Prefix filenames with date"
          description="Adds the post date to the filename (e.g. 2024-06-19_video.mp4)."
        >
          <Toggle
            checked={settings.timestampRename}
            onChange={(val) => updateSettings({ timestampRename: val })}
          />
        </SettingRow>
      </Card>


      {/* ── PRIVACY ── */}
      <Card>
        <SectionHeader
          icon={<Copy className="w-5 h-5" />}
          title="Duplicate Detection"
          description="Avoid downloading the same file twice."
        />

        <SettingRow
          label="Skip duplicate files"
          description="Checks the download history before starting. Matches on source URL."
        >
          <Toggle
            checked={settings.skipDuplicates}
            onChange={(val) => updateSettings({ skipDuplicates: val })}
          />
        </SettingRow>
      </Card>


      {/* ── NOTIFICATIONS ── */}
      <Card>
        <SectionHeader
          icon={<Bell className="w-5 h-5" />}
          title="Notifications"
          description="In-app alerts when your downloads complete."
        />

        <SettingRow
          label="Notify on download complete"
          description="Shows a toast notification when each download finishes."
        >
          <Toggle
            checked={settings.notifyOnComplete}
            onChange={(val) => updateSettings({ notifyOnComplete: val })}
          />
        </SettingRow>
      </Card>


      {/* ── RESET ── */}
      <div className="flex justify-end pb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={handleReset}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Reset to defaults
        </Button>
      </div>

    </div>
  )
}
