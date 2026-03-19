'use client'

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Layers, Plus, Pencil, Trash2, Loader2, Search,
  X, Upload, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  RotateCcw, Package, ChevronDown, Check,
  AlertTriangle, XCircle,
} from 'lucide-react'
import { DatePicker } from '@mzadat/ui/components/date-picker'
import { TimeInput } from '@mzadat/ui/components/time-picker'
import { toMuscatDate } from '@/lib/timezone'
import type {
  GroupRow, GroupDetail, GroupFormData, GroupListResult,
  GroupFilters, GroupStats, StoreOption, MerchantOption,
  GroupLiveInfo, ForceClosePreview,
} from '@/lib/actions/groups'
import {
  getGroups, getGroupsPageData, getGroup,
  createGroup, updateGroup, deleteGroup,
  getGroupStats, getGroupDropdowns,
  getGroupLiveStats,
  getForceClosePreview, forceCloseGroup,
} from '@/lib/actions/groups'
import { uploadLotImage } from '@/lib/actions/images'

// ── Helpers ──────────────────────────────────────────────────────

async function compressImageClient(file: File): Promise<File> {
  if (file.size < 2 * 1024 * 1024) return file
  return new Promise<File>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 3000
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.95,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

function formatDateTime(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Muscat',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-50 text-slate-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-gray-500">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color] ?? colorMap.blue}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    upcoming: 'border-blue-200 bg-blue-50 text-blue-600',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    closed: 'border-slate-200 bg-slate-50 text-slate-500',
    cancelled: 'border-red-200 bg-red-50 text-red-500',
  }
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? 'border-gray-200 bg-gray-50 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ── Pagination ───────────────────────────────────────────────────

function Pagination({ page, totalPages, total, perPage, onPageChange }: {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <p className="text-[12px] text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-[12px] text-gray-400">…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-7 rounded-md px-1.5 py-1 text-[12px] font-medium transition-colors ${
                p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Searchable Select ────────────────────────────────────────────

type SelectOption = { value: string; label: string }

function SearchableSelect({ value, onChange, options, placeholder = 'Select…', fullWidth = false }: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options,
    [options, query]
  )

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dropdownW = fullWidth ? rect.width : 224
    const dropdownH = 280
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.left
    if (left + dropdownW > vw - 8) left = Math.max(8, rect.right - dropdownW)

    let top = rect.bottom + 4
    if (top + dropdownH > vh - 8) top = Math.max(8, rect.top - dropdownH - 4)

    setPos({ top, left, width: fullWidth ? rect.width : undefined })
  }, [fullWidth])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => setOpen(false)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      updatePosition()
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setPos(null)
    }
  }, [open, updatePosition])

  const clearValue = value && value !== 'all' && !fullWidth

  return (
    <div ref={containerRef} className={fullWidth ? 'relative w-full' : 'relative'}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-lg border bg-white text-[13px] transition-colors ${
          fullWidth ? 'h-[38px] w-full px-3 py-2' : 'h-8 pl-3 pr-2'
        } ${
          open ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'
        } ${value && value !== 'all' && value !== '' ? 'text-gray-900' : 'text-gray-500'}`}>
        <span className={`truncate text-left ${fullWidth ? 'flex-1' : 'max-w-[140px]'}`}>{selectedLabel}</span>
        {clearValue ? (
          <span onClick={(e) => { e.stopPropagation(); onChange('all'); setOpen(false) }}
            className="ml-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${fullWidth ? 'ml-auto' : ''} ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && pos && (
        <div ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: pos.width ?? 224 }}
          className="rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.length > 5 && (
            <div className="border-b border-gray-100 p-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 text-[12px] text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-[12px] text-gray-400">No results</p>
            ) : (
              filtered.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    opt.value === value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Check className={`h-3 w-3 shrink-0 ${opt.value === value ? 'text-blue-600' : 'text-transparent'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Delete Confirm ───────────────────────────────────────────────

function DeleteConfirm({ group, onClose, onDeleted }: {
  group: GroupRow
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const blocked = group.lotsCount > 0

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteGroup(group.id)
      if (res.error) toast.error(res.error)
      else { toast.success('Group deleted'); onDeleted(group.id) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
        <h3 className="text-[14px] font-semibold text-gray-900">Delete Group</h3>
        {blocked ? (
          <p className="text-[13px] text-red-500">
            Cannot delete — this group has {group.lotsCount} lot(s). Remove or reassign them first.
          </p>
        ) : (
          <p className="text-[13px] text-gray-600">
            Are you sure you want to delete <strong>{group.nameEn}</strong>? This action cannot be undone.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isPending || blocked}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Force Close Confirmation Dialog ──────────────────────────────

function ForceCloseConfirm({ group, onClose, onClosed }: {
  group: GroupRow
  onClose: () => void
  onClosed: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<ForceClosePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    getForceClosePreview(group.id).then((res) => {
      if (res.error) setPreviewError(res.error)
      else setPreview(res.data ?? null)
    }).catch(() => setPreviewError('Failed to load preview')).finally(() => setLoadingPreview(false))
  }, [group.id])

  const handleClose = () => {
    startTransition(async () => {
      const res = await forceCloseGroup(group.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        const d = res.data!
        toast.success(`Group closed — ${d.closedLots} lot${d.closedLots === 1 ? '' : 's'} ended, winners being processed`)
        onClosed()
      }
    })
  }

  const isAlreadyClosed = preview?.groupStatus === 'closed'
  const hasActiveLots = (preview?.activeLots ?? 0) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900">Close Auction Group</h3>
            <p className="mt-0.5 text-[12px] text-gray-400">
              {group.nameEn}
            </p>
          </div>
        </div>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : previewError ? (
          <p className="text-[13px] text-red-500">{previewError}</p>
        ) : isAlreadyClosed ? (
          <p className="text-[13px] text-gray-600">This group is already closed.</p>
        ) : (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-[13px] font-medium text-amber-800">
                This will immediately:
              </p>
              <ul className="text-[12px] text-amber-700 space-y-1 ml-3 list-disc">
                {hasActiveLots && (
                  <li>
                    Close <strong>{preview!.activeLots}</strong> active lot{preview!.activeLots === 1 ? '' : 's'}
                  </li>
                )}
                <li>Declare winners for all ended auctions</li>
                <li>Refund deposits to non-winning bidders</li>
                <li>Send winner/loser notifications and emails</li>
                <li>Close the entire group</li>
              </ul>
            </div>

            {preview && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <p className="text-[18px] font-semibold text-gray-900">{preview.activeLots}</p>
                  <p className="text-[11px] text-gray-400">Active Lots</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <p className="text-[18px] font-semibold text-gray-900">{preview.closedLots}</p>
                  <p className="text-[11px] text-gray-400">Already Closed</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <p className="text-[18px] font-semibold text-gray-900">{preview.activeRegistrations}</p>
                  <p className="text-[11px] text-gray-400">Registrations</p>
                </div>
              </div>
            )}

            <p className="text-[12px] text-red-500 font-medium">
              This action cannot be undone.
            </p>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleClose} disabled={isPending || loadingPreview || !!previewError || isAlreadyClosed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isPending ? 'Closing…' : 'Close Auction'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Group Form Modal ─────────────────────────────────────────────

interface FormState {
  nameEn: string
  nameOm: string
  image: string
  storeId: string
  merchantId: string
  startDate: string
  endDate: string
  inspectionStartDate: string
  inspectionEndDate: string
  minDeposit: string
  status: 'upcoming' | 'active' | 'closed' | 'cancelled'
}

const emptyForm: FormState = {
  nameEn: '', nameOm: '', image: '', storeId: '', merchantId: '',
  startDate: '', endDate: '', inspectionStartDate: '', inspectionEndDate: '',
  minDeposit: '0.000', status: 'upcoming',
}

function detailToForm(d: GroupDetail): FormState {
  return {
    nameEn: d.nameEn,
    nameOm: d.nameOm,
    image: d.image ?? '',
    storeId: d.storeId ?? '',
    merchantId: d.merchantId,
    startDate: d.startDate,
    endDate: d.endDate,
    inspectionStartDate: d.inspectionStartDate ?? '',
    inspectionEndDate: d.inspectionEndDate ?? '',
    minDeposit: d.minDeposit.toFixed(3),
    status: d.status,
  }
}

interface GroupModalProps {
  editing: GroupDetail | null
  stores: StoreOption[]
  merchants: MerchantOption[]
  onClose: () => void
  onSuccess: () => void
}

function GroupModal({ editing, stores, merchants, onClose, onSuccess }: GroupModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? detailToForm(editing) : emptyForm,
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Track display URL for image preview
  const [imageDisplayUrl, setImageDisplayUrl] = useState<string>(() =>
    editing?.imageUrl ?? '',
  )

  useEffect(() => { firstInputRef.current?.focus() }, [])

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImageClient(file)
      const fd = new FormData()
      fd.append('file', compressed)
      const result = await uploadLotImage(fd)
      if (result.error) {
        toast.error(result.error)
      } else {
        setForm((p) => ({ ...p, image: result.path }))
        setImageDisplayUrl(result.displayUrl)
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const removeImage = () => {
    setForm((p) => ({ ...p, image: '' }))
    setImageDisplayUrl('')
  }

  // Date helpers (DatePicker + TimeInput combined)
  const getDatePart = (isoStr: string) => {
    if (!isoStr) return undefined
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? undefined : d
  }

  const getTimePart = (isoStr: string) => {
    if (!isoStr) return ''
    const parts = isoStr.split('T')
    return parts[1]?.slice(0, 5) ?? ''
  }

  const setDatePart = (key: keyof FormState, date: Date | undefined) => {
    if (!date) {
      setForm((p) => ({ ...p, [key]: '' }))
      return
    }
    const existing = form[key] as string
    const time = getTimePart(existing) || '00:00'
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    setForm((p) => ({ ...p, [key]: `${yyyy}-${mm}-${dd}T${time}` }))
  }

  const setTimePart = (key: keyof FormState, time: string) => {
    const existing = form[key] as string
    const datePart = existing.split('T')[0]
    if (!datePart) {
      // No date set yet — use today in Muscat
      const todayStr = toMuscatDate(new Date())
      setForm((p) => ({ ...p, [key]: `${todayStr}T${time}` }))
    } else {
      setForm((p) => ({ ...p, [key]: `${datePart}T${time}` }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nameEn.trim()) { setError('English name is required.'); return }
    if (!form.merchantId) { setError('Merchant/Store is required.'); return }
    if (!form.startDate) { setError('Start date is required.'); return }
    if (!form.endDate) { setError('End date is required.'); return }

    const data: GroupFormData = {
      nameEn: form.nameEn,
      nameOm: form.nameOm,
      image: form.image || undefined,
      storeId: form.storeId || undefined,
      merchantId: form.merchantId,
      startDate: form.startDate,
      endDate: form.endDate,
      inspectionStartDate: form.inspectionStartDate || undefined,
      inspectionEndDate: form.inspectionEndDate || undefined,
      minDeposit: parseFloat(form.minDeposit) || 0,
      status: form.status,
    }

    startTransition(async () => {
      const result = editing
        ? await updateGroup(editing.id, data)
        : await createGroup(data)

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(editing ? 'Group updated' : 'Group created')
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-400" />
            <h2 className="text-[14px] font-semibold text-gray-900">
              {editing ? 'Edit Group' : 'New Group'}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-600">
              Image <span className="text-red-400">*</span>
            </label>
            {imageDisplayUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDisplayUrl} alt="Group" className="h-24 w-24 rounded-lg border border-gray-200 object-cover" />
                <button type="button" onClick={removeImage}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-[10px]">{uploading ? 'Uploading…' : 'Upload'}</span>
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Name (en) <span className="text-red-400">*</span>
              </label>
              <input ref={firstInputRef} type="text" value={form.nameEn} onChange={set('nameEn')}
                placeholder="Enter Name"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                required />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Name (om) <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.nameOm} onChange={set('nameOm')}
                placeholder="Enter Name"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                required />
            </div>
          </div>

          {/* Merchant/Store */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Merchant <span className="text-red-400">*</span>
              </label>
              <SearchableSelect
                value={form.merchantId}
                onChange={(v) => setForm((prev) => ({ ...prev, merchantId: v === 'all' ? '' : v }))}
                placeholder="Select Merchant"
                fullWidth
                options={[
                  { value: '', label: 'Select Merchant' },
                  ...merchants.map((m) => ({ value: m.id, label: `${m.name} (${m.email})` })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Merchant/Store <span className="text-red-400">*</span>
              </label>
              <SearchableSelect
                value={form.storeId}
                onChange={(v) => {
                  const store = stores.find((s) => s.id === v)
                  setForm((prev) => ({
                    ...prev,
                    storeId: v === 'all' ? '' : v,
                    merchantId: store?.ownerId ?? prev.merchantId,
                  }))
                }}
                placeholder="Select Store"
                fullWidth
                options={[
                  { value: '', label: 'Select Store' },
                  ...stores.map((s) => ({ value: s.id, label: s.nameEn })),
                ]}
              />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Start Date <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <DatePicker
                  value={getDatePart(form.startDate)}
                  onChange={(d) => setDatePart('startDate', d)}
                  placeholder="Select Date"
                  className="flex-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
                <TimeInput
                  value={getTimePart(form.startDate)}
                  onChange={(t) => setTimePart('startDate', t)}
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                End Date <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <DatePicker
                  value={getDatePart(form.endDate)}
                  onChange={(d) => setDatePart('endDate', d)}
                  placeholder="Select Date"
                  className="flex-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
                <TimeInput
                  value={getTimePart(form.endDate)}
                  onChange={(t) => setTimePart('endDate', t)}
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
              </div>
            </div>
          </div>

          {/* Inspection dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Inspection Start Date
              </label>
              <div className="flex gap-2">
                <DatePicker
                  value={getDatePart(form.inspectionStartDate)}
                  onChange={(d) => setDatePart('inspectionStartDate', d)}
                  placeholder="Select Date"
                  className="flex-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
                <TimeInput
                  value={getTimePart(form.inspectionStartDate)}
                  onChange={(t) => setTimePart('inspectionStartDate', t)}
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Inspection End Date
              </label>
              <div className="flex gap-2">
                <DatePicker
                  value={getDatePart(form.inspectionEndDate)}
                  onChange={(d) => setDatePart('inspectionEndDate', d)}
                  placeholder="Select Date"
                  className="flex-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
                <TimeInput
                  value={getTimePart(form.inspectionEndDate)}
                  onChange={(t) => setTimePart('inspectionEndDate', t)}
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                />
              </div>
            </div>
          </div>

          {/* Minimum Deposit */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-600">
              Minimum Deposit <span className="text-red-400">*</span>
            </label>
            <input type="number" step="0.001" min="0" value={form.minDeposit}
              onChange={set('minDeposit')}
              placeholder="0.000"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              required />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────

function GroupTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Groups</h1>
          <p className="text-[13px] text-gray-400">Manage auction groups</p>
        </div>
        <div className="h-9 w-32 rounded-lg bg-blue-600 animate-pulse" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Group', 'Start Date', 'End Date', 'Inspection Start', 'Inspection End', 'Min Deposit', 'Lots', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-3 py-2.5">
                    <div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Client Component ────────────────────────────────────────

export function GroupsClient() {
  const router = useRouter()
  const [initialLoading, setInitialLoading] = useState(true)
  const hasFetched = useRef(false)

  // Data
  const [listResult, setListResult] = useState<GroupListResult>({ rows: [], total: 0, page: 1, perPage: 20, totalPages: 0 })
  const [stats, setStats] = useState<GroupStats>({ total: 0, upcoming: 0, active: 0, closed: 0, totalLots: 0 })
  const [stores, setStores] = useState<StoreOption[]>([])
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [liveStats, setLiveStats] = useState<Map<string, GroupLiveInfo>>(new Map())

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStore, setFilterStore] = useState('all')
  const [filterMerchant, setFilterMerchant] = useState('all')
  const [page, setPage] = useState(1)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<GroupDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null)
  const [closeTarget, setCloseTarget] = useState<GroupRow | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  // Debounce ref
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  // Initial load
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    Promise.all([
      getGroupsPageData(),
      getGroupLiveStats(),
    ]).then(([{ data, stats: s, dropdowns }, live]) => {
      setListResult(data)
      setStats(s)
      setStores(dropdowns.stores)
      setMerchants(dropdowns.merchants)
      const liveMap = new Map<string, GroupLiveInfo>()
      live.forEach((l) => liveMap.set(l.groupId, l))
      setLiveStats(liveMap)
      setInitialLoading(false)
    }).catch(() => setInitialLoading(false))
  }, [])

  // Fetch on filter/page change
  const fetchGroups = useCallback(async (filters: GroupFilters) => {
    const result = await getGroups(filters)
    setListResult(result)
  }, [])

  useEffect(() => {
    if (initialLoading) return
    const filters: GroupFilters = {
      search: debouncedSearch || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      storeId: filterStore !== 'all' ? filterStore : undefined,
      merchantId: filterMerchant !== 'all' ? filterMerchant : undefined,
      page,
      perPage: 20,
    }
    fetchGroups(filters)
  }, [debouncedSearch, filterStatus, filterStore, filterMerchant, page, initialLoading, fetchGroups])

  // Handlers
  const handlePageChange = (p: number) => setPage(p)

  const resetFilters = () => {
    setSearch('')
    setFilterStatus('all')
    setFilterStore('all')
    setFilterMerchant('all')
    setPage(1)
  }

  const openCreate = () => {
    setEditTarget(null)
    setShowModal(true)
  }

  const openEdit = async (group: GroupRow) => {
    setLoadingEdit(group.id)
    try {
      const detail = await getGroup(group.id)
      if (detail) {
        setEditTarget(detail)
        setShowModal(true)
      } else {
        toast.error('Group not found')
      }
    } catch {
      toast.error('Failed to load group')
    } finally {
      setLoadingEdit(null)
    }
  }

  const handleSuccess = useCallback(() => {
    // Refresh list, stats & dropdowns in parallel (single auth each)
    const filters: GroupFilters = {
      search: debouncedSearch || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      storeId: filterStore !== 'all' ? filterStore : undefined,
      merchantId: filterMerchant !== 'all' ? filterMerchant : undefined,
      page,
      perPage: 20,
    }
    fetchGroups(filters)
    getGroupStats().then(setStats)
    getGroupDropdowns().then((d) => {
      setStores(d.stores)
      setMerchants(d.merchants)
    })
  }, [debouncedSearch, filterStatus, filterStore, filterMerchant, page, fetchGroups])

  const hasActiveFilters = search || filterStatus !== 'all' || filterStore !== 'all' || filterMerchant !== 'all'

  if (initialLoading) return <GroupTableSkeleton />

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Groups</h1>
            <p className="text-[13px] text-gray-400">
              Manage auction groups — batch lots by merchant, event, or schedule
            </p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Group
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Total Groups" value={stats.total} icon={Layers} color="blue" />
          <StatCard label="Upcoming" value={stats.upcoming} icon={CalendarIcon} color="amber" />
          <StatCard label="Active" value={stats.active} icon={Layers} color="emerald" />
          <StatCard label="Closed" value={stats.closed} icon={Layers} color="slate" />
          <StatCard label="Total Lots" value={stats.totalLots} icon={Package} color="purple" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search groups…"
              className="h-8 min-w-55 rounded-lg border border-gray-200 py-0 pl-8 pr-3 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <SearchableSelect
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1) }}
            placeholder="All statuses"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          <SearchableSelect
            value={filterStore}
            onChange={(v) => { setFilterStore(v); setPage(1) }}
            placeholder="All stores"
            options={[
              { value: 'all', label: 'All stores' },
              ...stores.map((s) => ({ value: s.id, label: s.nameEn })),
            ]}
          />

          <SearchableSelect
            value={filterMerchant}
            onChange={(v) => { setFilterMerchant(v); setPage(1) }}
            placeholder="All merchants"
            options={[
              { value: 'all', label: 'All merchants' },
              ...merchants.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          <span className="ml-auto text-[12px] text-gray-400">
            {listResult.total} group{listResult.total === 1 ? '' : 's'}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white">
          {listResult.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <Layers className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-gray-600">
                {hasActiveFilters ? 'No groups match your filter' : 'No groups yet'}
              </p>
              {!hasActiveFilters && (
                <button onClick={openCreate}
                  className="mt-3 text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Create your first group →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">Group</th>
                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">Start Date</th>
                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">End Date</th>
                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">Inspection Start</th>
                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-gray-400">Inspection End</th>
                      <th className="px-3 py-2.5 text-right text-[12px] font-medium text-gray-400">Min Deposit</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-gray-400">Lots</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-gray-400">Status</th>
                      <th className="px-3 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listResult.rows.map((group, idx) => (
                      <tr key={group.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        {/* Group (image + en + om) */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {group.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={group.imageUrl} alt={group.nameEn}
                                className="h-11 w-11 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                                <Layers className="h-3.5 w-3.5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{group.nameEn}</p>
                              {group.nameOm && <p className="text-[11px] text-gray-400">{group.nameOm}</p>}
                              {group.storeName && (
                                <p className="text-[11px] text-gray-400">{group.storeName}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                          {formatDateTime(group.startDate)}
                        </td>

                        {/* End Date */}
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                          {formatDateTime(group.endDate)}
                        </td>

                        {/* Inspection Start */}
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                          {formatDateTime(group.inspectionStartDate)}
                        </td>

                        {/* Inspection End */}
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">
                          {formatDateTime(group.inspectionEndDate)}
                        </td>

                        {/* Min Deposit */}
                        <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                          {formatCurrency(group.minDeposit)}
                        </td>

                        {/* Lots + Live Info */}
                        <td className="px-3 py-2.5 text-center">
                          {group.lotsCount > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-600">
                                {group.lotsCount}
                              </span>
                              {liveStats.has(group.id) && (() => {
                                const live = liveStats.get(group.id)!
                                return live.liveLots > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                                    </span>
                                    {live.liveLots} live · {live.totalBids} bids
                                  </span>
                                ) : null
                              })()}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <StatusBadge status={group.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => openEdit(group)}
                              disabled={loadingEdit === group.id}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                              title="Edit">
                              {loadingEdit === group.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                            {group.status !== 'closed' && group.status !== 'cancelled' && (
                              <button onClick={() => setCloseTarget(group)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Close Auction">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => setDeleteTarget(group)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={listResult.page}
                totalPages={listResult.totalPages}
                total={listResult.total}
                perPage={listResult.perPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <GroupModal
          editing={editTarget}
          stores={stores}
          merchants={merchants}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSuccess={handleSuccess}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          group={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => {
            setDeleteTarget(null)
            setListResult((prev) => ({
              ...prev,
              rows: prev.rows.filter((r) => r.id !== id),
              total: prev.total - 1,
            }))
            handleSuccess()
          }}
        />
      )}
      {closeTarget && (
        <ForceCloseConfirm
          group={closeTarget}
          onClose={() => setCloseTarget(null)}
          onClosed={() => {
            setCloseTarget(null)
            handleSuccess()
          }}
        />
      )}
    </>
  )
}
