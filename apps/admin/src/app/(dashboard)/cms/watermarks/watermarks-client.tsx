'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Droplets, Upload, Trash2, Check, Loader2, X, Ban } from 'lucide-react'
import type { WatermarkRow } from '@/lib/actions/cms'
import {
  getWatermarks,
  uploadWatermark,
  setActiveWatermark,
  deactivateAllWatermarks,
  deleteWatermark,
} from '@/lib/actions/cms'

// ── Main Client ─────────────────────────────────────────────

export function WatermarksClient() {
  const [rows, setRows] = useState<WatermarkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    getWatermarks()
      .then(setRows)
      .catch(() => toast.error('Failed to load watermarks'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      const res = await uploadWatermark(fd)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Watermark uploaded')
        load()
      }
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  function handleSetActive(id: string) {
    startTransition(async () => {
      const res = await setActiveWatermark(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Watermark activated')
        load()
      }
    })
  }

  function handleDeactivateAll() {
    startTransition(async () => {
      const res = await deactivateAllWatermarks()
      if (res.error) toast.error(res.error)
      else {
        toast.success('All watermarks deactivated — images will upload without watermark')
        load()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteWatermark(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Watermark deleted')
        setConfirmDeleteId(null)
        load()
      }
    })
  }

  const activeWatermark = rows.find(r => r.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <Droplets className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Watermarks</h1>
            <p className="text-[13px] text-gray-500">
              Upload and manage watermarks applied to lot images
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeWatermark && (
            <button
              onClick={handleDeactivateAll}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              Disable Watermark
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload Watermark
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              disabled={isPending}
            />
          </label>
        </div>
      </div>

      {/* Active Watermark Preview */}
      {activeWatermark && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold text-emerald-800">Active Watermark</h3>
              <p className="mt-0.5 text-[12px] text-emerald-600">
                This watermark is applied to all new lot image uploads
              </p>
              {activeWatermark.previewUrl && (
                <div className="mt-3 inline-block rounded-lg border border-emerald-200 bg-white p-2">
                  <img
                    src={activeWatermark.previewUrl}
                    alt="Active watermark"
                    className="h-24 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <Droplets className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-[13px] text-gray-500">No watermarks uploaded yet</p>
          <p className="mt-1 text-[12px] text-gray-400">
            Upload a watermark image to apply it to lot images
          </p>
        </div>
      ) : (
        /* Watermark Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(wm => (
            <div
              key={wm.id}
              className={`group relative rounded-xl border p-4 transition ${
                wm.isActive
                  ? 'border-emerald-200 bg-emerald-50/30 ring-1 ring-emerald-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Status badge */}
              <div className="mb-3 flex items-center justify-between">
                <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                  wm.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}>
                  {wm.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-[11px] text-gray-400">
                  {new Date(wm.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Preview */}
              <div className="flex h-32 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-2">
                {wm.previewUrl ? (
                  <img
                    src={wm.previewUrl}
                    alt="Watermark"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[12px] text-gray-400">Preview unavailable</span>
                )}
              </div>

              {/* Path */}
              <p className="mt-2 truncate text-[11px] text-gray-400" title={wm.image}>
                {wm.image}
              </p>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                {!wm.isActive && (
                  <button
                    onClick={() => handleSetActive(wm.id)}
                    disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Set Active
                  </button>
                )}

                {confirmDeleteId === wm.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <button
                      onClick={() => handleDelete(wm.id)}
                      disabled={isPending}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] text-gray-500 transition hover:bg-gray-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(wm.id)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] text-gray-500 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="text-[13px] font-medium text-blue-800">How watermarks work</h4>
        <ul className="mt-2 space-y-1 text-[12px] text-blue-600">
          <li>• Only one watermark can be active at a time</li>
          <li>• The active watermark is applied edge-to-edge on all new lot image uploads</li>
          <li>• Watermarks are applied at 40% opacity for optimal visibility</li>
          <li>• Use a transparent PNG for best results</li>
          <li>• Disabling watermark means new uploads will have no watermark overlay</li>
        </ul>
      </div>
    </div>
  )
}
