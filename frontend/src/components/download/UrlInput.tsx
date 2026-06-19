// =============================================================================
// UrlInput Component
// The main input field where users paste or DRAG-AND-DROP a URL.
//
// Drag-and-drop: users can drag a URL from a browser address bar, a link
// on a web page, or a text file and drop it onto this component.
// react-dropzone handles the DragEvent plumbing; we extract the URL text
// from the dropped item and populate the field automatically.
//
// DATA FLOW:
//   User pastes/drops URL
//     → handleChange / handleDrop updates local state
//     → User clicks "Analyse" (or presses Enter)
//     → onSubmit calls props.onExtract(url)
//     → Parent → useDownload → downloadService → PHP → Python → yt-dlp
//     → Response flows back and MediaPreview is shown
// =============================================================================

'use client'

import { useState, useCallback, type FormEvent } from 'react'

// useDropzone is the primary hook from react-dropzone.
// It returns props to spread onto a container div that turns it into a drop zone.
import { useDropzone } from 'react-dropzone'

import { Link2, Search, X, AlertCircle, CheckCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input  } from '@/components/ui/Input'
import { isValidUrl, normaliseUrl          } from '@/utils/urlParser'
import { detectPlatform, getPlatformDisplayName } from '@/utils/platformDetector'
import clsx from 'clsx'
import type { Platform } from '@/types'


// =============================================================================
// Props
// =============================================================================
interface UrlInputProps {
  onExtract:     (url: string) => Promise<void>
  isLoading:     boolean
  externalError?: string | null
}


export function UrlInput({ onExtract, isLoading, externalError }: UrlInputProps) {

  const [url,               setUrl]               = useState('')
  const [localError,        setLocalError]        = useState<string | null>(null)
  const [detectedPlatform,  setDetectedPlatform]  = useState<Platform | null>(null)


  // ── HELPERS ──

  // Update the URL state and auto-detect the platform.
  // Used by both the text input onChange and the drop handler.
  const applyUrl = useCallback((value: string) => {
    setUrl(value)
    setLocalError(null)
    if (value.trim().length > 10) {
      const platform = detectPlatform(value)
      setDetectedPlatform(platform !== 'unknown' ? platform : null)
    } else {
      setDetectedPlatform(null)
    }
  }, [])


  // ── DRAG-AND-DROP ──

  // "onDrop" fires when the user drops something onto the drop zone.
  // react-dropzone normally deals with FILE drops (files[]), but URLs dragged
  // from a browser address bar or a hyperlink are NOT file objects — they come
  // through as DataTransferItems with type "text/uri-list" or "text/plain".
  // We intercept these via the low-level "onDrop" DOM event callback.
  const handleDrop = useCallback(
    (_acceptedFiles: File[], _rejected: unknown[], event: React.DragEvent) => {
      // DataTransfer.items gives us every dropped item, including plain text URLs.
      const items = event.dataTransfer?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // "text/uri-list" is set when dragging from a browser address bar or link.
        // "text/plain" is a fallback (e.g. dragging selected text that is a URL).
        if (item.kind === 'string' &&
            (item.type === 'text/uri-list' || item.type === 'text/plain')) {

          item.getAsString((droppedText) => {
            // Take the first line — uri-list can have multiple URLs separated by \n.
            const firstUrl = droppedText.split('\n').find((line) =>
              line.trim().length > 0 && !line.startsWith('#')  // skip comments
            )?.trim()

            if (firstUrl) applyUrl(firstUrl)
          })
          break
        }
      }
    },
    [applyUrl]
  )

  // useDropzone wires up drag events to the container div.
  // "noClick" — we don't open a file-picker when the user clicks (the Input handles that).
  // "noKeyboard" — same reason; keyboard navigation targets the <input> directly.
  // "accept" — we don't want file uploads; set to empty to accept any drop.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDrop:     handleDrop as any,
    noClick:    true,
    noKeyboard: true,
    multiple:   false,
  })


  // ── TEXT INPUT HANDLERS ──

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyUrl(e.target.value)
  }

  function handleClear() {
    setUrl('')
    setLocalError(null)
    setDetectedPlatform(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const trimmed = url.trim()

    if (!trimmed) {
      setLocalError('Please paste a URL first.')
      return
    }

    if (!isValidUrl(trimmed)) {
      setLocalError('This does not look like a valid URL. Check for typos.')
      return
    }

    const platform = detectPlatform(trimmed)
    if (platform === 'unknown') {
      setLocalError(
        'This platform is not supported yet. Supported: Facebook, X (Twitter), Instagram, TikTok, Snapchat.'
      )
      return
    }

    const clean = normaliseUrl(trimmed)
    await onExtract(clean)
  }

  const displayError = localError ?? externalError ?? null


  return (
    // getRootProps() wires drag-enter / drag-over / drop events onto this div.
    // We spread it here so the ENTIRE card becomes a drop target.
    <form onSubmit={handleSubmit} className="relative w-full" {...getRootProps()}>
      {/* react-dropzone injects a hidden <input type="file"> — we discard it
          because we only want text/URL drops, not file uploads. */}
      <input {...getInputProps()} className="hidden" />

      {/* ── DROP OVERLAY ── */}
      {/* Shown while a URL is being dragged over the component */}
      {isDragActive && (
        <div
          className={clsx(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3',
            'rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/90 dark:bg-brand-900/70',
            'pointer-events-none'  // let mouse events fall through to the drop zone
          )}
        >
          <Upload className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-bounce" />
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            Drop the URL here
          </p>
        </div>
      )}

      <div className={clsx('relative flex flex-col gap-3', isDragActive && 'opacity-40')}>

        {/* ── HEADING ── */}
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Paste a public URL
          </h2>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Upload className="w-3 h-3" /> or drag &amp; drop
          </span>
        </div>

        {/* ── INPUT + BUTTON ROW ── */}
        <div className="flex gap-2">

          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={handleChange}
              disabled={isLoading}
              leftElement={<Link2 className="w-4 h-4" />}
              rightElement={
                url.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Clear URL"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null
              }
              error={displayError ?? undefined}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            leftIcon={<Search className="w-4 h-4" />}
            className="shrink-0 self-start"
          >
            Analyse
          </Button>
        </div>

        {/* ── PLATFORM BADGE ── */}
        {detectedPlatform && !displayError && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>
              Detected: <strong>{getPlatformDisplayName(detectedPlatform)}</strong>
            </span>
          </div>
        )}

        {/* ── ERROR MESSAGE ── */}
        {displayError && (
          <div className="flex items-start gap-2 text-sm text-red-500" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {/* ── SUPPORTED PLATFORMS HINT ── */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Supported: Facebook · X (Twitter) · Instagram · TikTok · Snapchat
        </p>
      </div>
    </form>
  )
}
