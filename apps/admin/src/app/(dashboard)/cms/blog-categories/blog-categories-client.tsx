'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { BookOpen, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { BlogCategoryRow, BlogCategoryFormData } from '@/lib/actions/cms'
import {
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '@/lib/actions/cms'

// ── Helpers ──────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
      status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

// ── Modal ────────────────────────────────────────────────────

function CategoryModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing: BlogCategoryRow | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    nameEn: editing?.name?.en ?? '',
    nameAr: editing?.name?.ar ?? '',
    slug: editing?.slug ?? '',
    descriptionEn: editing?.description?.en ?? '',
    descriptionAr: editing?.description?.ar ?? '',
    image: editing?.image ?? '',
    status: editing?.status ?? 'active',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    startTransition(async () => {
      const data: BlogCategoryFormData = {
        nameEn: form.nameEn,
        nameAr: form.nameAr,
        slug: form.slug,
        descriptionEn: form.descriptionEn,
        descriptionAr: form.descriptionAr,
        image: form.image,
        status: form.status,
      }
      const res = editing
        ? await updateBlogCategory(editing.id, data)
        : await createBlogCategory(data)
      if (res?.error) { toast.error(res.error); return }
      toast.success(editing ? 'Category updated' : 'Category created')
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-gray-900">
            {editing ? 'Edit Blog Category' : 'New Blog Category'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Name (EN) *</span>
              <input value={form.nameEn} onChange={e => { set('nameEn', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Name (AR)</span>
              <input value={form.nameAr} onChange={e => set('nameAr', e.target.value)} dir="rtl"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-[12px] font-medium text-gray-600">Slug *</span>
            <input value={form.slug} onChange={e => set('slug', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Description (EN)</span>
              <textarea value={form.descriptionEn} onChange={e => set('descriptionEn', e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Description (AR)</span>
              <textarea value={form.descriptionAr} onChange={e => set('descriptionAr', e.target.value)} rows={2} dir="rtl"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Image URL</span>
              <input value={form.image} onChange={e => set('image', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-gray-600">Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
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

// ── Main ─────────────────────────────────────────────────────

export function BlogCategoriesClient() {
  const [rows, setRows] = useState<BlogCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BlogCategoryRow | null>(null)
  const [deleting, setDeleting] = useState<BlogCategoryRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getBlogCategories().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (cat: BlogCategoryRow) => {
    startTransition(async () => {
      const res = await deleteBlogCategory(cat.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Category deleted')
      setDeleting(null)
      load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Blog Categories</h1>
            <p className="text-[12px] text-gray-500">{rows.length} categories</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add Category
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Slug</th>
              <th className="px-4 py-2.5">Posts</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No categories yet</td></tr>
            ) : rows.map(cat => (
              <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{cat.name?.en || '—'}</p>
                  {cat.name?.ar && <p className="text-[11px] text-gray-400" dir="rtl">{cat.name.ar}</p>}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{cat.slug}</td>
                <td className="px-4 py-2.5 text-gray-500">{cat.blogsCount}</td>
                <td className="px-4 py-2.5"><StatusBadge status={cat.status} /></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(cat); setShowModal(true) }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleting(cat)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CategoryModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load() }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Category</h3>
            <p className="text-[13px] text-gray-600">
              Are you sure you want to delete <strong>{deleting.name?.en}</strong>?
            </p>
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
