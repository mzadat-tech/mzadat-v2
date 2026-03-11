'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { LayoutGrid, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { WidgetRow, WidgetFormData } from '@/lib/actions/cms'
import { getWidgets, createWidget, updateWidget, deleteWidget } from '@/lib/actions/cms'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
      status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

const WIDGET_TYPES = ['hero_banner', 'text_content', 'cta', 'image_banner', 'faq', 'stats', 'testimonials', 'features']
const PAGE_SLUGS = ['home', 'about-us', 'contact-us', 'auctions', 'blog']

function WidgetModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing: WidgetRow | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const content = (editing?.content ?? {}) as Record<string, string>
  const linkLabel = (editing?.linkLabel ?? {}) as Record<string, string>

  const [form, setForm] = useState({
    title: editing?.title ?? '',
    pageSlug: editing?.pageSlug ?? 'home',
    widgetType: editing?.widgetType ?? 'text_content',
    contentEn: content?.en ?? '',
    contentAr: content?.ar ?? '',
    image: editing?.image ?? '',
    linkUrl: editing?.linkUrl ?? '',
    linkLabelEn: linkLabel?.en ?? '',
    linkLabelAr: linkLabel?.ar ?? '',
    linkNewTab: editing?.linkNewTab ?? false,
    extraData: editing?.extraData ? JSON.stringify(editing.extraData, null, 2) : '{}',
    sortOrder: editing?.sortOrder ?? 0,
    status: editing?.status ?? 'active',
  })

  const set = (k: string, v: string | number | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    startTransition(async () => {
      const data: WidgetFormData = {
        title: form.title, pageSlug: form.pageSlug, widgetType: form.widgetType,
        contentEn: form.contentEn, contentAr: form.contentAr,
        image: form.image, linkUrl: form.linkUrl,
        linkLabelEn: form.linkLabelEn, linkLabelAr: form.linkLabelAr,
        linkNewTab: form.linkNewTab, extraData: form.extraData,
        sortOrder: form.sortOrder, status: form.status,
      }
      const res = editing ? await updateWidget(editing.id, data) : await createWidget(data)
      if (res?.error) { toast.error(res.error); return }
      toast.success(editing ? 'Widget updated' : 'Widget created')
      onSuccess()
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelCls = 'text-[12px] font-medium text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-gray-900">{editing ? 'Edit Widget' : 'New Widget'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="space-y-1 block"><span className={labelCls}>Title *</span>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1"><span className={labelCls}>Page *</span>
              <select value={form.pageSlug} onChange={e => set('pageSlug', e.target.value)} className={inputCls}>
                {PAGE_SLUGS.map(p => <option key={p} value={p}>{p}</option>)}
              </select></label>
            <label className="space-y-1"><span className={labelCls}>Type *</span>
              <select value={form.widgetType} onChange={e => set('widgetType', e.target.value)} className={inputCls}>
                {WIDGET_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></label>
            <label className="space-y-1"><span className={labelCls}>Sort Order</span>
              <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} className={inputCls} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Content (EN)</span>
              <textarea value={form.contentEn} onChange={e => set('contentEn', e.target.value)} rows={3} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Content (AR)</span>
              <textarea value={form.contentAr} onChange={e => set('contentAr', e.target.value)} rows={3} dir="rtl" className={inputCls} /></label>
          </div>
          <label className="space-y-1 block"><span className={labelCls}>Image URL</span>
            <input value={form.image} onChange={e => set('image', e.target.value)} className={inputCls} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Link URL</span>
              <input value={form.linkUrl} onChange={e => set('linkUrl', e.target.value)} className={inputCls} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1"><span className={labelCls}>Link Label (EN)</span>
                <input value={form.linkLabelEn} onChange={e => set('linkLabelEn', e.target.value)} className={inputCls} /></label>
              <label className="space-y-1"><span className={labelCls}>Link Label (AR)</span>
                <input value={form.linkLabelAr} onChange={e => set('linkLabelAr', e.target.value)} className={inputCls} /></label>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-gray-600">
              <input type="checkbox" checked={form.linkNewTab} onChange={e => set('linkNewTab', e.target.checked)} className="rounded border-gray-300" />
              Open link in new tab
            </label>
            <label className="space-y-1"><span className={labelCls}>Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select></label>
          </div>
          <label className="space-y-1 block"><span className={labelCls}>Extra Data (JSON)</span>
            <textarea value={form.extraData} onChange={e => set('extraData', e.target.value)} rows={3} className={`${inputCls} font-mono text-[12px]`} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function WidgetsClient() {
  const [rows, setRows] = useState<WidgetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WidgetRow | null>(null)
  const [deleting, setDeleting] = useState<WidgetRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getWidgets().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (w: WidgetRow) => {
    startTransition(async () => {
      const res = await deleteWidget(w.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Widget deleted')
      setDeleting(null); load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><LayoutGrid className="h-4 w-4" /></div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Widgets</h1>
            <p className="text-[12px] text-gray-500">{rows.length} widgets</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add Widget
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Page</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Order</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No widgets yet</td></tr>
            ) : rows.map(w => (
              <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{w.title}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600">{w.pageSlug}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{w.widgetType.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2.5 text-gray-500">{w.sortOrder}</td>
                <td className="px-4 py-2.5"><StatusBadge status={w.status} /></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(w); setShowModal(true) }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleting(w)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <WidgetModal editing={editing} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load() }} />}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Widget</h3>
            <p className="text-[13px] text-gray-600">Delete <strong>{deleting.title}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleting)} disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
