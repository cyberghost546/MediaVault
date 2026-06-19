// =============================================================================
// app/profile/page.tsx — PROFILE BACKUP PAGE  (URL: "/profile")
// =============================================================================
// Allows users to paste a PUBLIC profile URL and batch-download all media.
// Scanning a profile can find hundreds of posts, so this page shows a
// scan progress indicator while the backend works.
// =============================================================================

'use client'

import { useState } from 'react'
import { UrlInput   } from '@/components/download/UrlInput'
import { MediaGrid  } from '@/components/media/MediaGrid'
import { Card       } from '@/components/ui/Card'
import { Button     } from '@/components/ui/Button'
import { scanProfile} from '@/services/downloadService'
import { useDownload} from '@/hooks/useDownload'
import type { ProfileScanResult } from '@/types'
import { Users, Loader2 } from 'lucide-react'


export default function ProfilePage() {

  // Holds the scan result (account info + list of media items).
  const [scanResult, setScanResult] = useState<ProfileScanResult | null>(null)

  // True while the profile scan is in progress.
  const [isScanning, setIsScanning] = useState(false)

  // Error message from the scan.
  const [scanError, setScanError] = useState<string | null>(null)

  // Use the download hook to queue batch downloads.
  const { startBatch, isStarting } = useDownload()


  // "handleScan" is called when the user submits a profile URL.
  async function handleScan(url: string) {
    setIsScanning(true)
    setScanError(null)
    setScanResult(null)

    try {
      // Call the PHP backend to scan the profile.
      // This can take 30–120 seconds for large profiles.
      const result = await scanProfile(url, 100)
      setScanResult(result)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to scan profile')
    } finally {
      setIsScanning(false)
    }
  }


  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Backup</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Scan a public profile to see and download all available media.
        </p>
      </div>

      {/* URL Input */}
      <Card>
        <UrlInput
          onExtract={handleScan}
          isLoading={isScanning}
          externalError={scanError}
        />
      </Card>

      {/* Scanning indicator */}
      {isScanning && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Scanning profile… This may take a minute for large accounts.
            </p>
          </div>
        </Card>
      )}

      {/* Scan result */}
      {scanResult && !isScanning && (
        <>
          {/* Profile summary card */}
          <Card>
            <div className="flex items-center gap-4">

              {/* Avatar */}
              {scanResult.avatarUrl ? (
                <img
                  src={scanResult.avatarUrl}
                  alt={scanResult.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {scanResult.displayName ?? `@${scanResult.username}`}
                </p>
                {scanResult.displayName && (
                  <p className="text-sm text-gray-500">@{scanResult.username}</p>
                )}
                <p className="text-sm text-gray-500 mt-0.5">
                  {scanResult.totalPostsFound} posts found · {scanResult.items.length} media items
                </p>
              </div>

              {/* Download all button */}
              <Button
                variant="primary"
                isLoading={isStarting}
                disabled={scanResult.items.length === 0 || isStarting}
                onClick={() => startBatch(scanResult.items)}
              >
                Download All ({scanResult.items.length})
              </Button>
            </div>
          </Card>

          {/* Filterable grid of media */}
          <MediaGrid
            items={scanResult.items}
            onDownload={(item) => startBatch([item])}
          />
        </>
      )}

      {/* Legal notice */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        Only scan public profiles. Do not use this tool to access private accounts
        or content protected by authentication.
      </p>
    </div>
  )
}
