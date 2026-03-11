'use client'

import { useState, useTransition, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Package, ArrowLeft, Loader2, X, ImageIcon, Upload,
  ImageOff, Plus, Trash2, CalendarDays, MapPin, GripVertical, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react'
import { DatePicker } from '@mzadat/ui/components/date-picker'
import { TimeInput } from '@mzadat/ui/components/time-picker'
import { Dialog, DialogContent, DialogTitle } from '@mzadat/ui/components/dialog'
import { toMuscatDate } from '@/lib/timezone'
import { useBreadcrumbOverride } from '@/components/layout/breadcrumb-context'
import type {
  LotFormData, LotDetail, SpecificationRow,
  DropdownOption, MerchantOption, GroupOption,
} from '@/lib/actions/lots'
import { createLot, updateLot } from '@/lib/actions/lots'
import { uploadLotImage, uploadLotGalleryImages } from '@/lib/actions/images'

// ── Helpers ──────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Client-side image size check.
 * We skip client-side re-encoding entirely to preserve original quality.
 * Sharp on the server handles resize + watermark + WebP conversion from
 * the pristine source file. Body limit is 10 MB so most photos fit.
 */
async function compressImageClient(file: File): Promise<File> {
  // Compress if over 2 MB to stay comfortably under the 10 MB server action limit
  // JPEG at 0.95 is visually lossless — quality only degrades at the final WebP step on the server
  if (file.size < 2 * 1024 * 1024) return file

  return new Promise<File>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Downscale large images so the JPEG output stays under 10 MB
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
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          })
          resolve(compressed)
        },
        'image/jpeg',
        0.95,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ── Form State ──────────────────────────────────────────────────

interface FormState {
  // Core
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  shortDescriptionEn: string
  shortDescriptionAr: string
  // Images — featureImage and galleryImages store PATHS (e.g. "lots/file.webp")
  // Display URLs are tracked separately in component state
  featureImage: string
  useNoImage: boolean
  galleryImages: string[]
  // Relations
  categoryId: string
  groupId: string
  merchantId: string
  // Product
  quantity: string
  location: string
  inspectionNotes: string
  // Sale
  saleType: 'auction' | 'direct'
  scheduleType: 'default' | 'scheduled'
  // Auction
  minDeposit: string
  minDepositType: 'fixed' | 'percentage'
  minBidPrice: string
  reservePrice: string
  bidIncrement1: string
  bidIncrement2: string
  bidIncrement3: string
  bidIncrement4: string
  // Direct
  price: string
  salePrice: string
  // Schedule
  startDate: string
  endDate: string
  // Status
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'closed'
  // Specifications
  specifications: SpecificationRow[]
}

const emptyForm: FormState = {
  slug: '', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '',
  shortDescriptionEn: '', shortDescriptionAr: '',
  featureImage: '', useNoImage: false, galleryImages: [],
  categoryId: '', groupId: '', merchantId: '',
  quantity: '1', location: '', inspectionNotes: '',
  saleType: 'auction', scheduleType: 'default',
  minDeposit: '0', minDepositType: 'fixed', minBidPrice: '0', reservePrice: '',
  bidIncrement1: '1', bidIncrement2: '', bidIncrement3: '', bidIncrement4: '',
  price: '0', salePrice: '',
  startDate: '', endDate: '',
  status: 'draft',
  specifications: [],
}

function detailToForm(d: LotDetail): FormState {
  return {
    slug: d.slug,
    nameEn: d.nameEn, nameAr: d.nameAr,
    descriptionEn: d.descriptionEn, descriptionAr: d.descriptionAr,
    shortDescriptionEn: d.shortDescriptionEn, shortDescriptionAr: d.shortDescriptionAr,
    featureImage: d.featureImage ?? '',
    useNoImage: d.featureImage === '/Image_not_available.png',
    galleryImages: d.galleryImages, // these are storage paths
    categoryId: d.categoryId ?? '', groupId: d.groupId ?? '', merchantId: d.merchantId,
    quantity: String(d.quantity),
    location: d.location, inspectionNotes: d.inspectionNotes,
    saleType: d.saleType, scheduleType: d.scheduleType,
    minDeposit: String(d.minDeposit), minDepositType: d.minDepositType,
    minBidPrice: String(d.minBidPrice), reservePrice: d.reservePrice != null ? String(d.reservePrice) : '',
    bidIncrement1: String(d.bidIncrement1),
    bidIncrement2: d.bidIncrement2 != null ? String(d.bidIncrement2) : '',
    bidIncrement3: d.bidIncrement3 != null ? String(d.bidIncrement3) : '',
    bidIncrement4: d.bidIncrement4 != null ? String(d.bidIncrement4) : '',
    price: String(d.price), salePrice: d.salePrice != null ? String(d.salePrice) : '',
    startDate: d.startDate ?? '', endDate: d.endDate ?? '',
    status: d.status,
    specifications: d.specifications,
  }
}

// ── Reusable elements ───────────────────────────────────────────

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" /></svg>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────

interface LotFormPageProps {
  editing?: LotDetail | null
  categories: DropdownOption[]
  merchants: MerchantOption[]
  groups: GroupOption[]
}

export function LotFormPage({ editing, categories, merchants, groups }: LotFormPageProps) {
  const router = useRouter()
  const { setOverride } = useBreadcrumbOverride()
  const [form, setForm] = useState<FormState>(() => editing ? detailToForm(editing) : emptyForm)
  const [slugManual, setSlugManual] = useState(!!editing)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const featureInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Map storage paths → signed display URLs
  // Initialized from editing data (which already has signed URLs from server)
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>(() => {
    if (!editing) return {}
    const map: Record<string, string> = {}
    if (editing.featureImage && editing.featureImageUrl) {
      map[editing.featureImage] = editing.featureImageUrl
    }
    editing.galleryImages.forEach((path, i) => {
      if (editing.galleryDisplayUrls[i]) map[path] = editing.galleryDisplayUrls[i]
    })
    return map
  })

  /** Get the display URL for a storage path */
  const getDisplayUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('/')) return path // local paths like /Image_not_available.png
    return imageUrlMap[path] || ''
  }

  // ── Field helpers ─────────────────────────────────────────────

  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }))
  }, [])

  const onInput = useCallback((key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })), [])

  const handleNameEn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((p) => ({ ...p, nameEn: val, slug: slugManual ? p.slug : slugify(val) }))
  }

  const handleSaleTypeChange = (saleType: 'auction' | 'direct') => {
    setForm((p) => {
      if (saleType === 'direct' && !p.groupId) {
        return {
          ...p,
          saleType,
          scheduleType: 'default',
          startDate: '',
          endDate: '',
        }
      }

      return { ...p, saleType }
    })
  }

  // Auto-fill minDeposit + dates when group changes
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gId = e.target.value
    const group = groups.find((g) => g.id === gId)
    setForm((p) => ({
      ...p,
      groupId: gId,
      minDeposit: group ? String(group.minDeposit) : p.minDeposit,
      // Inherit dates from group — they become readonly while grouped
      startDate: group?.startDate ?? p.startDate,
      endDate: group?.endDate ?? p.endDate,
      // Force scheduled mode when group is selected
      scheduleType: group ? 'scheduled' as const : p.scheduleType,
    }))
  }

  // Get the selected group's min deposit (used to enforce minimum on the input)
  const selectedGroup = groups.find((g) => g.id === form.groupId)
  const groupMinDeposit = selectedGroup?.minDeposit ?? 0
  const isGrouped = !!form.groupId

  const openImagePreview = (src: string) => {
    if (!src) return
    setPreviewImage(src)
    setPreviewScale(1)
  }

  const closeImagePreview = () => {
    setPreviewImage(null)
    setPreviewScale(1)
  }

  const zoomBy = (delta: number) => {
    setPreviewScale((prev) => {
      const next = prev + delta
      return Math.min(4, Math.max(0.5, Number(next.toFixed(2))))
    })
  }

  const handlePreviewWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? 0.1 : -0.1)
  }

  useEffect(() => {
    if (!editing) {
      setOverride(null)
      return
    }

    const lotName = form.nameEn.trim() || editing.nameEn || 'Lot'
    setOverride(['Lots', lotName, 'Edit'])

    return () => setOverride(null)
  }, [editing, form.nameEn, setOverride])

  // ── Feature Image ─────────────────────────────────────────────

  const handleFeatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImageClient(file)
      const fd = new FormData()
      fd.append('file', compressed)
      const result = await uploadLotImage(fd)
      if (result.error) { toast.error(result.error) }
      else {
        setForm((p) => ({ ...p, featureImage: result.path, useNoImage: false }))
        setImageUrlMap((m) => ({ ...m, [result.path]: result.displayUrl }))
        toast.success('Feature image uploaded')
      }
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (featureInputRef.current) featureInputRef.current.value = '' }
  }

  const handleUseNoImage = (checked: boolean) => {
    setForm((p) => ({ ...p, useNoImage: checked, featureImage: checked ? '/Image_not_available.png' : '' }))
  }

  // ── Gallery Images ────────────────────────────────────────────

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploadingGallery(true)
    try {
      const compressedFiles = await Promise.all(Array.from(files).map(compressImageClient))
      const fd = new FormData()
      compressedFiles.forEach((f) => fd.append('files', f))
      const result = await uploadLotGalleryImages(fd)
      if (result.errors.length) result.errors.forEach((err) => toast.error(err))
      if (result.paths.length) {
        setForm((p) => ({ ...p, galleryImages: [...p.galleryImages, ...result.paths] }))
        // Add display URLs to map
        const newMap: Record<string, string> = {}
        result.paths.forEach((path, i) => { newMap[path] = result.displayUrls[i] })
        setImageUrlMap((m) => ({ ...m, ...newMap }))
        toast.success(`${result.paths.length} image${result.paths.length > 1 ? 's' : ''} uploaded`)
      }
    } catch { toast.error('Gallery upload failed') }
    finally { setUploadingGallery(false); if (galleryInputRef.current) galleryInputRef.current.value = '' }
  }

  const removeGalleryImage = (idx: number) => {
    setForm((p) => ({ ...p, galleryImages: p.galleryImages.filter((_, i) => i !== idx) }))
  }

  // ── Specifications ────────────────────────────────────────────

  const addSpec = () => {
    setForm((p) => ({
      ...p,
      specifications: [...p.specifications, { labelEn: '', labelAr: '', valueEn: '', valueAr: '', sortOrder: p.specifications.length }],
    }))
  }

  const updateSpec = (idx: number, field: keyof SpecificationRow, val: string) => {
    setForm((p) => ({
      ...p,
      specifications: p.specifications.map((s, i) => i === idx ? { ...s, [field]: val } : s),
    }))
  }

  const removeSpec = (idx: number) => {
    setForm((p) => ({
      ...p,
      specifications: p.specifications.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })),
    }))
  }

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nameEn.trim()) { setError('English name is required.'); return }
    if (!form.slug.trim()) { setError('Slug is required.'); return }
    if (!form.merchantId) { setError('Merchant is required.'); return }
    if (!form.location.trim()) { setError('Location is required.'); return }
    if (!form.featureImage && !form.useNoImage) {
      setError('Feature image is required. Upload an image or check "Use No-Image Placeholder".')
      return
    }

    const isDirectStandalone = form.saleType === 'direct' && !form.groupId

    const data: LotFormData = {
      slug: form.slug,
      nameEn: form.nameEn, nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      shortDescriptionEn: form.shortDescriptionEn || undefined,
      shortDescriptionAr: form.shortDescriptionAr || undefined,
      featureImage: form.featureImage || undefined,
      useNoImage: form.useNoImage,
      galleryImages: form.galleryImages,
      categoryId: form.categoryId || undefined,
      groupId: form.groupId || undefined,
      quantity: parseInt(form.quantity) || 1,
      location: form.location,
      inspectionNotes: form.inspectionNotes || undefined,
      saleType: form.saleType,
      scheduleType: isDirectStandalone ? 'default' : form.scheduleType,
      minDeposit: form.minDeposit || '0',
      minDepositType: form.minDepositType,
      minBidPrice: form.minBidPrice || '0',
      reservePrice: form.reservePrice || undefined,
      bidIncrement1: form.bidIncrement1 || '1',
      bidIncrement2: form.bidIncrement2 || undefined,
      bidIncrement3: form.bidIncrement3 || undefined,
      bidIncrement4: form.bidIncrement4 || undefined,
      price: form.price || '0',
      salePrice: form.salePrice || undefined,
      startDate: isDirectStandalone ? undefined : (form.startDate || undefined),
      endDate: isDirectStandalone ? undefined : (form.endDate || undefined),
      status: form.status,
      specifications: form.specifications.filter((s) => s.labelEn.trim() || s.valueEn.trim()),
    }

    startTransition(async () => {
      const result = editing
        ? await updateLot(editing.id, form.merchantId, data)
        : await createLot(form.merchantId, data)

      if (result.error) { setError(result.error) }
      else {
        toast.success(editing ? 'Lot updated successfully' : 'Lot created successfully')
        router.push('/products')
        router.refresh()
      }
    })
  }

  const busy = isPending || uploading || uploadingGallery

  const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
  const selectCls = "w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[13px] text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
  const labelCls = "mb-1 block text-[12px] font-medium text-gray-600"
  const sectionCls = "rounded-xl border border-gray-200 bg-white p-5 space-y-4"
  const sectionTitle = "text-[13px] font-semibold text-gray-800 mb-3"
  const showScheduleSection = isGrouped || form.saleType === 'auction'

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/products')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">
              {editing ? 'Edit Lot' : 'Create New Lot'}
            </h1>
            <p className="text-[13px] text-gray-400">
              {editing ? `Editing: ${editing.nameEn}` : 'Fill in the lot details below'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push('/products')} disabled={busy}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editing ? 'Save Changes' : 'Create Lot'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4">
        {/* ══════════════ LEFT COLUMN ══════════════ */}
        <div className="col-span-7 space-y-4">

          {/* ── Basic Info ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name (English) <span className="text-red-400">*</span></label>
                <input type="text" value={form.nameEn} onChange={handleNameEn} placeholder="e.g. Vintage Watch" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Name (Arabic)</label>
                <input type="text" dir="rtl" value={form.nameAr} onChange={onInput('nameAr')} placeholder="مثلاً: ساعة كلاسيكية" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Slug <span className="text-red-400">*</span></label>
              <input type="text" value={form.slug} onChange={(e) => { setSlugManual(true); setField('slug', e.target.value) }} placeholder="e.g. vintage-watch-001" className={`${inputCls} font-mono`} />
              <p className="mt-0.5 text-[11px] text-gray-400">Auto-generated from English name</p>
            </div>
          </section>

          {/* ── Description ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Description</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Short Description (EN)</label>
                <textarea rows={2} value={form.shortDescriptionEn} onChange={onInput('shortDescriptionEn')} placeholder="Brief summary…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Short Description (AR)</label>
                <textarea rows={2} dir="rtl" value={form.shortDescriptionAr} onChange={onInput('shortDescriptionAr')} placeholder="ملخص قصير…" className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Description (EN)</label>
                <textarea rows={4} value={form.descriptionEn} onChange={onInput('descriptionEn')} placeholder="Detailed description…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Full Description (AR)</label>
                <textarea rows={4} dir="rtl" value={form.descriptionAr} onChange={onInput('descriptionAr')} placeholder="وصف تفصيلي…" className={`${inputCls} resize-none`} />
              </div>
            </div>
          </section>

          {/* ── Specifications ── */}
          <section className={sectionCls}>
            <div className="flex items-center justify-between">
              <h3 className={`${sectionTitle} mb-0!`}>Specifications</h3>
              <button type="button" onClick={addSpec}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Plus className="h-3 w-3" /> Add Row
              </button>
            </div>

            {form.specifications.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-gray-400">
                No specifications — click &quot;Add Row&quot; to start
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-2 text-[11px] font-medium text-gray-400">
                  <span>Label (EN)</span><span>Label (AR)</span><span>Value (EN)</span><span>Value (AR)</span><span />
                </div>
                {form.specifications.map((spec, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-2 items-center">
                    <input type="text" value={spec.labelEn} onChange={(e) => updateSpec(idx, 'labelEn', e.target.value)} placeholder="e.g. Color" className={inputCls} />
                    <input type="text" dir="rtl" value={spec.labelAr} onChange={(e) => updateSpec(idx, 'labelAr', e.target.value)} placeholder="مثلاً: اللون" className={inputCls} />
                    <input type="text" value={spec.valueEn} onChange={(e) => updateSpec(idx, 'valueEn', e.target.value)} placeholder="e.g. Red" className={inputCls} />
                    <input type="text" dir="rtl" value={spec.valueAr} onChange={(e) => updateSpec(idx, 'valueAr', e.target.value)} placeholder="مثلاً: أحمر" className={inputCls} />
                    <button type="button" onClick={() => removeSpec(idx)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Location ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Location & Notes</h3>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}><MapPin className="h-3 w-3" /> Location <span className="text-red-400">*</span></label>
              <input type="text" value={form.location} onChange={onInput('location')} placeholder="e.g. Muscat, Oman" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Inspection Notes</label>
              <textarea rows={2} value={form.inspectionNotes} onChange={onInput('inspectionNotes')} placeholder="Optional inspection details…" className={`${inputCls} resize-none`} />
            </div>
          </section>
        </div>

        {/* ══════════════ RIGHT COLUMN ══════════════ */}
        <div className="col-span-5 space-y-4">

          {/* ── Feature Image ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Feature Image <span className="text-red-400">*</span></h3>

            {form.featureImage && !form.useNoImage ? (
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => openImagePreview(getDisplayUrl(form.featureImage))}
                  className="block"
                >
                  <img src={getDisplayUrl(form.featureImage)} alt="Feature" className="h-36 w-full cursor-zoom-in rounded-lg border border-gray-200 object-cover" />
                </button>
                <button type="button" onClick={() => setField('featureImage', '')}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : form.useNoImage ? (
              <button
                type="button"
                onClick={() => openImagePreview('/Image_not_available.png')}
                className="block w-full"
              >
                <img src="/Image_not_available.png" alt="No Image Available" className="h-36 w-full cursor-zoom-in rounded-lg border border-dashed border-gray-300 object-contain bg-gray-50 p-4" />
              </button>
            ) : (
              <button type="button" onClick={() => featureInputRef.current?.click()} disabled={uploading}
                className="flex h-36 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 transition-colors">
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-[11px]">Processing…</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6" />
                    <span className="text-[11px]">Click to upload</span>
                    <span className="text-[10px] text-gray-300">Watermark + WebP auto-applied</span>
                  </div>
                )}
              </button>
            )}

            <input ref={featureInputRef} type="file" accept="image/*" onChange={handleFeatureUpload} className="hidden" />

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.useNoImage} onChange={(e) => handleUseNoImage(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
              <span className="flex items-center gap-1 text-[12px] text-gray-500">
                <ImageOff className="h-3 w-3" /> Use &quot;No Image Available&quot; placeholder
              </span>
            </label>
          </section>

          {/* ── Gallery Images ── */}
          <section className={sectionCls}>
            <div className="flex items-center justify-between">
              <h3 className={`${sectionTitle} mb-0!`}>Gallery <span className="text-[11px] font-normal text-gray-400">(optional)</span></h3>
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {uploadingGallery ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add
              </button>
            </div>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
            {form.galleryImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {form.galleryImages.map((path, idx) => (
                  <div key={idx} className="group relative">
                    <button
                      type="button"
                      onClick={() => openImagePreview(getDisplayUrl(path))}
                      className="block w-full"
                    >
                      <img src={getDisplayUrl(path)} alt={`Gallery ${idx + 1}`} className="h-20 w-full cursor-zoom-in rounded-md border border-gray-200 object-cover" />
                    </button>
                    <button type="button" onClick={() => removeGalleryImage(idx)}
                      className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex hover:bg-red-600">
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/50 px-1 text-[9px] text-white">{idx + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-[12px] text-gray-400">No gallery images</p>
            )}
            {uploadingGallery && (
              <div className="flex items-center gap-2 text-[12px] text-blue-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
              </div>
            )}
          </section>

          {/* ── Merchant + Category + Group ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Assignment</h3>
            <div>
              <label className={labelCls}>Merchant <span className="text-red-400">*</span></label>
              <SelectWrapper>
                <select value={form.merchantId} onChange={onInput('merchantId')} className={selectCls}>
                  <option value="">— Select —</option>
                  {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </SelectWrapper>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <SelectWrapper>
                <select value={form.categoryId} onChange={onInput('categoryId')} className={selectCls}>
                  <option value="">— None —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                </select>
              </SelectWrapper>
            </div>
            <div>
              <label className={labelCls}>Group</label>
              <SelectWrapper>
                <select value={form.groupId} onChange={handleGroupChange} className={selectCls}>
                  <option value="">— None (standalone) —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.nameEn}</option>)}
                </select>
              </SelectWrapper>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {isGrouped
                  ? 'Dates, deposit & schedule inherited from group'
                  : 'Standalone lot — dates are editable'}
              </p>
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={onInput('quantity')} className={inputCls} />
            </div>
          </section>

          {/* ── Sale Type ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Sale Configuration</h3>
            <div>
              <label className={labelCls}>Sale Type <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {(['auction', 'direct'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => handleSaleTypeChange(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${form.saleType === t ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                    {t === 'auction' ? 'Auction Sale' : 'Direct Sale'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Auction Fields ── */}
            {form.saleType === 'auction' && (
              <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Minimum Deposit <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      min={groupMinDeposit}
                      step="0.001"
                      value={form.minDeposit}
                      onChange={onInput('minDeposit')}
                      readOnly={!!selectedGroup}
                      className={`${inputCls}${selectedGroup ? ' bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                    {selectedGroup && (
                      <p className="mt-0.5 text-[11px] text-amber-600">
                        Set by group "{selectedGroup.nameEn}" — min {groupMinDeposit.toFixed(3)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Min Bid Price <span className="text-red-400">*</span></label>
                    <input type="number" min="0" step="0.001" value={form.minBidPrice} onChange={onInput('minBidPrice')} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Reserve Price</label>
                  <input type="number" min="0" step="0.001" value={form.reservePrice} onChange={onInput('reservePrice')} placeholder="Optional" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Bidding Increments</label>
                  <div className="grid grid-cols-4 gap-2">
                    <input type="number" min="0" step="0.001" value={form.bidIncrement1} onChange={onInput('bidIncrement1')} placeholder="Inc. 1" className={inputCls} />
                    <input type="number" min="0" step="0.001" value={form.bidIncrement2} onChange={onInput('bidIncrement2')} placeholder="Inc. 2" className={inputCls} />
                    <input type="number" min="0" step="0.001" value={form.bidIncrement3} onChange={onInput('bidIncrement3')} placeholder="Inc. 3" className={inputCls} />
                    <input type="number" min="0" step="0.001" value={form.bidIncrement4} onChange={onInput('bidIncrement4')} placeholder="Inc. 4" className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Direct Sale Fields ── */}
            {form.saleType === 'direct' && (
              <div className="space-y-3 rounded-lg border border-purple-100 bg-purple-50/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Regular Price <span className="text-red-400">*</span></label>
                    <input type="number" min="0" step="0.001" value={form.price} onChange={onInput('price')} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sale Price</label>
                    <input type="number" min="0" step="0.001" value={form.salePrice} onChange={onInput('salePrice')} placeholder="Optional" className={inputCls} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Schedule ── */}
          {showScheduleSection && (
            <section className={sectionCls}>
              <h3 className={sectionTitle}>Schedule</h3>
              {isGrouped && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-[12px] text-amber-700">
                  Dates inherited from group &quot;{selectedGroup?.nameEn}&quot; — edit the group to change schedule
                </div>
              )}
              <div>
                <label className={labelCls}>Schedule <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  {([{ val: 'default', label: 'No' }, { val: 'scheduled', label: 'Yes' }] as const).map(({ val, label }) => (
                    <button key={val} type="button"
                      onClick={() => !isGrouped && setField('scheduleType', val)}
                      disabled={isGrouped}
                      className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${form.scheduleType === val ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'} ${isGrouped ? 'cursor-not-allowed opacity-60' : ''}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.scheduleType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`${labelCls} flex items-center gap-1`}><CalendarDays className="h-3 w-3" /> Start Date</label>
                    <div className={`flex gap-2 ${isGrouped ? 'pointer-events-none opacity-60' : ''}`}>
                      <DatePicker
                        value={form.startDate ? new Date(form.startDate) : null}
                        onChange={(d) => {
                          if (isGrouped) return
                          const time = form.startDate ? form.startDate.slice(11, 16) : '00:00'
                          if (!d) { setField('startDate', ''); return }
                          const yyyy = d.getFullYear()
                          const mm = String(d.getMonth() + 1).padStart(2, '0')
                          const dd = String(d.getDate()).padStart(2, '0')
                          setField('startDate', `${yyyy}-${mm}-${dd}T${time}`)
                        }}
                        placeholder="Start date"
                        className="flex-1"
                        disabled={isGrouped}
                      />
                      <TimeInput
                        value={form.startDate ? form.startDate.slice(11, 16) : ''}
                        onChange={(t) => {
                          if (isGrouped) return
                          const date = form.startDate ? form.startDate.slice(0, 10) : toMuscatDate(new Date())
                          setField('startDate', `${date}T${t}`)
                        }}
                        className="w-30"
                        disabled={isGrouped}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`${labelCls} flex items-center gap-1`}><CalendarDays className="h-3 w-3" /> End Date</label>
                    <div className={`flex gap-2 ${isGrouped ? 'pointer-events-none opacity-60' : ''}`}>
                      <DatePicker
                        value={form.endDate ? new Date(form.endDate) : null}
                        onChange={(d) => {
                          if (isGrouped) return
                          const time = form.endDate ? form.endDate.slice(11, 16) : '00:00'
                          if (!d) { setField('endDate', ''); return }
                          const yyyy = d.getFullYear()
                          const mm = String(d.getMonth() + 1).padStart(2, '0')
                          const dd = String(d.getDate()).padStart(2, '0')
                          setField('endDate', `${yyyy}-${mm}-${dd}T${time}`)
                        }}
                        placeholder="End date"
                        className="flex-1"
                        disabled={isGrouped}
                      />
                      <TimeInput
                        value={form.endDate ? form.endDate.slice(11, 16) : ''}
                        onChange={(t) => {
                          if (isGrouped) return
                          const date = form.endDate ? form.endDate.slice(0, 10) : toMuscatDate(new Date())
                          setField('endDate', `${date}T${t}`)
                        }}
                        className="w-30"
                        disabled={isGrouped}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Status ── */}
          <section className={sectionCls}>
            <h3 className={sectionTitle}>Status</h3>
            <div className="flex flex-wrap gap-2">
              {(['draft', 'pending', 'published', 'inactive', 'closed'] as const).map((s) => {
                const colors: Record<string, string> = {
                  draft: 'border-gray-300 bg-gray-50 text-gray-600',
                  pending: 'border-amber-300 bg-amber-50 text-amber-700',
                  published: 'border-emerald-300 bg-emerald-50 text-emerald-700',
                  inactive: 'border-red-300 bg-red-50 text-red-700',
                  closed: 'border-slate-300 bg-slate-50 text-slate-700',
                }
                const active = form.status === s
                return (
                  <button key={s} type="button" onClick={() => setField('status', s)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${active ? colors[s] + ' ring-1 ring-offset-1' : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'}`}>
                    {s}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </form>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && closeImagePreview()}>
        <DialogContent className="max-w-6xl border-gray-200 bg-white p-2 sm:p-3">
          <DialogTitle className="sr-only">Lot Image Preview</DialogTitle>
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-1 pb-2">
            <p className="text-[12px] text-gray-500">Scroll to zoom • {Math.round(previewScale * 100)}%</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => zoomBy(-0.25)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(0.25)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
          {previewImage && (
            <div
              className="mt-2 flex h-[78vh] items-center justify-center overflow-auto rounded-md bg-gray-50"
              onWheel={handlePreviewWheel}
            >
              <img
                src={previewImage}
                alt="Lot preview"
                className="max-h-none w-auto max-w-none rounded-md object-contain transition-transform duration-150"
                style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
