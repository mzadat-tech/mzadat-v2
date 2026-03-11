'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  ImageIcon,
  Tag,
  ArrowUpDown,
} from 'lucide-react'
import type { CategoryRow, CategoryFormData } from '@/lib/actions/categories'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/categories'

// ── Helpers ──────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
        status === 'active'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {status}
    </span>
  )
}

// ── Category Form Modal ──────────────────────────────────────────

interface FormState {
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  icon: string
  image: string
  sortOrder: number
  parentId: string
  status: 'active' | 'inactive'
}

const emptyForm: FormState = {
  slug: '',
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  icon: '',
  image: '',
  sortOrder: 0,
  parentId: '',
  status: 'active',
}

function categoryToForm(c: CategoryRow): FormState {
  return {
    slug: c.slug,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    descriptionEn: c.descriptionEn ?? '',
    descriptionAr: c.descriptionAr ?? '',
    icon: c.icon ?? '',
    image: c.image ?? '',
    sortOrder: c.sortOrder,
    parentId: c.parentId ?? '',
    status: c.status,
  }
}

interface CategoryModalProps {
  categories: CategoryRow[]
  editing: CategoryRow | null
  onClose: () => void
  onSuccess: () => void
}

function CategoryModal({ categories, editing, onClose, onSuccess }: CategoryModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? categoryToForm(editing) : emptyForm,
  )
  const [slugManual, setSlugManual] = useState(!!editing)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = key === 'sortOrder' ? Number(e.target.value) : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNameEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((prev) => ({
      ...prev,
      nameEn: val,
      slug: slugManual ? prev.slug : slugify(val),
    }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true)
    setForm((prev) => ({ ...prev, slug: e.target.value }))
  }

  // Exclude self and descendants when editing (to prevent circular hierarchy)
  const parentOptions = categories.filter((c) => c.id !== editing?.id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nameEn.trim()) {
      setError('English name is required.')
      return
    }
    if (!form.slug.trim()) {
      setError('Slug is required.')
      return
    }

    const data: CategoryFormData = {
      slug: form.slug,
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      icon: form.icon || undefined,
      image: form.image || undefined,
      sortOrder: form.sortOrder,
      parentId: form.parentId || undefined,
      status: form.status,
    }

    startTransition(async () => {
      const result = editing
        ? await updateCategory(editing.id, data)
        : await createCategory(data)

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(editing ? 'Category updated' : 'Category created')
        onSuccess()
        onClose()
      }
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-gray-400" />
            <h2 className="text-[14px] font-semibold text-gray-900">
              {editing ? 'Edit Category' : 'New Category'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Name (English) <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={form.nameEn}
                onChange={handleNameEnChange}
                placeholder="e.g. Electronics"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Name (Arabic)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.nameAr}
                onChange={set('nameAr')}
                placeholder="مثلاً: إلكترونيات"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Slug */}
          <div className="mb-4">
            <label className="mb-1 block text-[12px] font-medium text-gray-600">
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="e.g. electronics"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            />
            <p className="mt-0.5 text-[11px] text-gray-400">Auto-generated from English name — edit if needed</p>
          </div>

          {/* Description row */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Description (English)
              </label>
              <textarea
                rows={3}
                value={form.descriptionEn}
                onChange={set('descriptionEn')}
                placeholder="Short description…"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Description (Arabic)
              </label>
              <textarea
                rows={3}
                dir="rtl"
                value={form.descriptionAr}
                onChange={set('descriptionAr')}
                placeholder="وصف قصير…"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Icon & Image row */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-gray-600">
                <Tag className="h-3 w-3" /> Icon
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={set('icon')}
                placeholder="e.g. cpu or https://…/icon.svg"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-gray-600">
                <ImageIcon className="h-3 w-3" /> Image URL
              </label>
              <input
                type="url"
                value={form.image}
                onChange={set('image')}
                placeholder="https://…/image.jpg"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Parent, Sort Order, Status row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="mb-1 block text-[12px] font-medium text-gray-600">
                Parent Category
              </label>
              <div className="relative">
                <select
                  value={form.parentId}
                  onChange={set('parentId')}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[13px] text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">— Root (no parent) —</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameEn}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4"/></svg>
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-gray-600">
                <ArrowUpDown className="h-3 w-3" /> Sort Order
              </label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={set('sortOrder')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-600">Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={set('status')}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[13px] text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4"/></svg>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ───────────────────────────────────────────────

interface DeleteConfirmProps {
  category: CategoryRow
  onClose: () => void
  onDeleted: (id: string, parentId: string | null) => void
}

function DeleteConfirm({ category, onClose, onDeleted }: DeleteConfirmProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result.error) {
        toast.error(result.error)
        onClose()
      } else {
        toast.success(`"${category.nameEn}" deleted`)
        onDeleted(category.id, category.parentId)
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-[14px] font-semibold text-gray-900">Delete Category</h2>
        <p className="mb-1 text-[13px] text-gray-500">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">{category.nameEn}</span>?
        </p>
        {category.productsCount > 0 && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <strong>Cannot delete</strong> — this category has{' '}
            <strong>{category.productsCount}</strong> lot{category.productsCount === 1 ? '' : 's'} linked to it.
            Reassign or remove those lots first.
          </div>
        )}
        {category.childrenCount > 0 && category.productsCount === 0 && (
          <p className="mb-3 text-[13px] text-amber-600">
            Its {category.childrenCount} subcategor{category.childrenCount === 1 ? 'y' : 'ies'} will be
            moved up to the parent level.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || category.productsCount > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Client Component ─────────────────────────────────────────

// ── Skeleton ─────────────────────────────────────────────────────

function CategoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Categories</h1>
          <p className="text-[13px] text-gray-400">Manage product categories and subcategories</p>
        </div>
        <div className="h-9 w-32 rounded-lg bg-blue-600 animate-pulse" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-8 w-55 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-8 w-28 rounded-lg bg-gray-100 animate-pulse" />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Name</th>
              <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Slug</th>
              <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Parent</th>
              <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Lots</th>
              <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Sort</th>
              <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Status</th>
              <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-gray-100 animate-pulse" />
                    <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse" />
                  </div>
                </td>
                <td className="px-4 py-2.5"><div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" /></td>
                <td className="px-4 py-2.5"><div className="h-3.5 w-14 rounded bg-gray-100 animate-pulse" /></td>
                <td className="px-4 py-2.5 text-center"><div className="mx-auto h-3.5 w-6 rounded bg-gray-100 animate-pulse" /></td>
                <td className="px-4 py-2.5 text-center"><div className="mx-auto h-3.5 w-6 rounded bg-gray-100 animate-pulse" /></td>
                <td className="px-4 py-2.5 text-center"><div className="mx-auto h-5 w-14 rounded bg-gray-100 animate-pulse" /></td>
                <td className="px-4 py-2.5 text-right"><div className="ml-auto h-5 w-12 rounded bg-gray-100 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Client ──────────────────────────────────────────────────

export function CategoriesClient() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const hasFetched = useRef(false)

  // Initial data load
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    getCategories().then((data) => {
      setCategories(data)
      setInitialLoading(false)
    }).catch(() => setInitialLoading(false))
  }, [])

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CategoryRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Refresh data after mutations
  const handleSuccess = useCallback(() => {
    getCategories().then(setCategories)
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setShowModal(true)
  }

  const openEdit = (cat: CategoryRow) => {
    setEditTarget(cat)
    setShowModal(true)
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // Filter & display
  const filtered = categories.filter((c) => {
    const matchSearch =
      !search ||
      c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      c.nameAr.includes(search) ||
      c.slug.includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  // Build display order: root cats first, then their children inline
  const rootCats = filtered.filter((c) => !c.parentId)
  const childMap = new Map<string, CategoryRow[]>()
  for (const c of filtered) {
    if (c.parentId) {
      const arr = childMap.get(c.parentId) ?? []
      arr.push(c)
      childMap.set(c.parentId, arr)
    }
  }

  const displayRows: { cat: CategoryRow; depth: number }[] = []
  const appendTree = (cat: CategoryRow, depth: number) => {
    displayRows.push({ cat, depth })
    if (expanded.has(cat.id)) {
      for (const child of childMap.get(cat.id) ?? []) {
        appendTree(child, depth + 1)
      }
    }
  }
  for (const root of rootCats) {
    appendTree(root, 0)
  }
  // Also include filtered children whose parents are not in rootCats (search mode)
  for (const c of filtered) {
    if (c.parentId && !rootCats.some((r) => r.id === c.id) && !displayRows.some((r) => r.cat.id === c.id)) {
      displayRows.push({ cat: c, depth: 1 })
    }
  }

  if (initialLoading) return <CategoryTableSkeleton />

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Categories</h1>
            <p className="text-[13px] text-gray-400">Manage product categories and subcategories</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Category
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className="h-8 min-w-55 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="h-8 appearance-none rounded-lg border border-gray-200 bg-white py-0 pl-3 pr-7 text-[13px] text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4"/></svg>
          </div>
          <span className="ml-auto text-[12px] text-gray-400">
            {filtered.length} categor{filtered.length === 1 ? 'y' : 'ies'}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white">
          {displayRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <FolderTree className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-gray-600">
                {search || filterStatus !== 'all' ? 'No categories match your filter' : 'No categories yet'}
              </p>
              {!search && filterStatus === 'all' && (
                <button
                  onClick={openCreate}
                  className="mt-3 text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Create your first category →
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Name</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Slug</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Parent</th>
                    <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Lots</th>
                    <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Sort</th>
                    <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Status</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map(({ cat, depth }) => {
                    const hasChildren = (childMap.get(cat.id)?.length ?? 0) > 0
                    const isExpanded = expanded.has(cat.id)

                    return (
                      <tr
                        key={cat.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-4 py-2.5">
                          <div
                            className="flex items-center gap-1"
                            style={{ paddingLeft: depth * 20 }}
                          >
                            {hasChildren ? (
                              <button
                                onClick={() => toggleExpand(cat.id)}
                                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5.5 shrink-0" />
                            )}
                            {cat.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cat.image}
                                alt={cat.nameEn}
                                className="h-7 w-7 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100">
                                <FolderTree className="h-3.5 w-3.5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{cat.nameEn}</p>
                              {cat.nameAr && (
                                <p className="text-[11px] text-gray-400" dir="rtl">
                                  {cat.nameAr}
                                </p>
                              )}
                            </div>
                            {hasChildren && (
                              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                {childMap.get(cat.id)?.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[12px] text-gray-500">{cat.slug}</span>
                        </td>

                        {/* Parent */}
                        <td className="px-4 py-2.5 text-gray-500">
                          {cat.parentNameEn ? (
                            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[12px]">
                              {cat.parentNameEn}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Lots */}
                        <td className="px-4 py-2.5 text-center">
                          {cat.productsCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-600">
                              {cat.productsCount}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Sort */}
                        <td className="px-4 py-2.5 text-center text-gray-500">{cat.sortOrder}</td>

                        {/* Status */}
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={cat.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEdit(cat)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(cat)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <CategoryModal
          categories={categories}
          editing={editTarget}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id, parentId) => {
            setDeleteTarget(null)
            // Immediately remove the deleted row and re-parent its children in local state
            setCategories((prev) =>
              prev
                .filter((c) => c.id !== id)
                .map((c) =>
                  c.parentId === id
                    ? { ...c, parentId: parentId ?? null, parentNameEn: null }
                    : c,
                ),
            )
            getCategories().then(setCategories)
          }}
        />
      )}
    </>
  )
}
