'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Menu as MenuIcon, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { MenuRow, MenuFormData } from '@/lib/actions/cms'
import { getMenus, createMenu, updateMenu, deleteMenu } from '@/lib/actions/cms'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
      status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

const LOCATIONS = ['header', 'footer_1', 'footer_2', 'footer_3', 'mobile']

function MenuModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing: MenuRow | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    nameEn: editing?.name?.en ?? '',
    nameAr: editing?.name?.ar ?? '',
    location: editing?.location ?? 'header',
    items: editing?.items ? JSON.stringify(editing.items, null, 2) : '[]',
    status: editing?.status ?? 'active',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    // Validate JSON
    try { JSON.parse(form.items) } catch { toast.error('Invalid JSON for menu items'); return }

    startTransition(async () => {
      const data: MenuFormData = {
        nameEn: form.nameEn, nameAr: form.nameAr,
        location: form.location, items: form.items, status: form.status,
      }
      const res = editing ? await updateMenu(editing.id, data) : await createMenu(data)
      if (res?.error) { toast.error(res.error); return }
      toast.success(editing ? 'Menu updated' : 'Menu created')
      onSuccess()
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelCls = 'text-[12px] font-medium text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-gray-900">{editing ? 'Edit Menu' : 'New Menu'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Name (EN) *</span>
              <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Name (AR)</span>
              <input value={form.nameAr} onChange={e => set('nameAr', e.target.value)} dir="rtl" className={inputCls} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Location *</span>
              <select value={form.location} onChange={e => set('location', e.target.value)} className={inputCls}>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select></label>
            <label className="space-y-1"><span className={labelCls}>Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select></label>
          </div>
          <label className="space-y-1 block">
            <span className={labelCls}>Menu Items (JSON)</span>
            <p className="text-[11px] text-gray-400">Array of {`{label, url, target, icon?, children?[]}`}</p>
            <textarea value={form.items} onChange={e => set('items', e.target.value)} rows={10} className={`${inputCls} font-mono text-[12px]`} />
          </label>
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

export function MenusClient() {
  const [rows, setRows] = useState<MenuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MenuRow | null>(null)
  const [deleting, setDeleting] = useState<MenuRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getMenus().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (m: MenuRow) => {
    startTransition(async () => {
      const res = await deleteMenu(m.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Menu deleted')
      setDeleting(null); load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><MenuIcon className="h-4 w-4" /></div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Menus</h1>
            <p className="text-[12px] text-gray-500">{rows.length} menus</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add Menu
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Items</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No menus yet</td></tr>
            ) : rows.map(m => {
              const items = Array.isArray(m.items) ? m.items : []
              return (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{m.name?.en || '—'}</p>
                    {m.name?.ar && <p className="text-[11px] text-gray-400" dir="rtl">{m.name.ar}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-600">{m.location}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{items.length} items</td>
                  <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(m); setShowModal(true) }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleting(m)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && <MenuModal editing={editing} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load() }} />}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Menu</h3>
            <p className="text-[13px] text-gray-600">Delete <strong>{deleting.name?.en}</strong>?</p>
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
