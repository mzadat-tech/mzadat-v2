'use client'

import { useState, useTransition, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import type { BlogFormData, BlogCategoryRow } from '@/lib/actions/cms'
import { getBlog, createBlog, updateBlog, getBlogCategories } from '@/lib/actions/cms'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

interface Props {
  paramsPromise?: Promise<{ id: string }>
}

export function BlogFormClient({ paramsPromise }: Props) {
  const resolvedParams = paramsPromise ? use(paramsPromise) : null
  const blogId = resolvedParams?.id
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<BlogCategoryRow[]>([])
  const [loading, setLoading] = useState(!!blogId)

  const [form, setForm] = useState({
    titleEn: '', titleAr: '', slug: '',
    excerptEn: '', excerptAr: '',
    bodyEn: '', bodyAr: '',
    featureImage: '', categoryId: '',
    tags: '',
    seoTitleEn: '', seoTitleAr: '',
    seoDescEn: '', seoDescAr: '',
    seoImage: '',
    status: 'draft',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    getBlogCategories().then(setCategories)
    if (blogId) {
      getBlog(blogId).then(blog => {
        if (!blog) { toast.error('Blog not found'); router.push('/cms/blogs'); return }
        setForm({
          titleEn: blog.title?.en ?? '', titleAr: blog.title?.ar ?? '',
          slug: blog.slug,
          excerptEn: blog.excerpt?.en ?? '', excerptAr: blog.excerpt?.ar ?? '',
          bodyEn: blog.body?.en ?? '', bodyAr: blog.body?.ar ?? '',
          featureImage: blog.featureImage ?? '', categoryId: blog.categoryId ?? '',
          tags: (blog.tags ?? []).join(', '),
          seoTitleEn: blog.seoTitle?.en ?? '', seoTitleAr: blog.seoTitle?.ar ?? '',
          seoDescEn: blog.seoDesc?.en ?? '', seoDescAr: blog.seoDesc?.ar ?? '',
          seoImage: blog.seoImage ?? '',
          status: blog.status,
        })
        setLoading(false)
      })
    }
  }, [blogId, router])

  const handleSubmit = () => {
    startTransition(async () => {
      const data: BlogFormData = {
        titleEn: form.titleEn, titleAr: form.titleAr, slug: form.slug,
        excerptEn: form.excerptEn, excerptAr: form.excerptAr,
        bodyEn: form.bodyEn, bodyAr: form.bodyAr,
        featureImage: form.featureImage, categoryId: form.categoryId,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitleEn: form.seoTitleEn, seoTitleAr: form.seoTitleAr,
        seoDescEn: form.seoDescEn, seoDescAr: form.seoDescAr,
        seoImage: form.seoImage,
        status: form.status,
      }
      const res = blogId ? await updateBlog(blogId, data) : await createBlog(data)
      if (res?.error) { toast.error(res.error); return }
      toast.success(blogId ? 'Blog updated' : 'Blog created')
      router.push('/cms/blogs')
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelCls = 'text-[12px] font-medium text-gray-600'

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cms/blogs" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-[16px] font-semibold text-gray-900">{blogId ? 'Edit Blog Post' : 'New Blog Post'}</h1>
        </div>
        <button onClick={handleSubmit} disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {blogId ? 'Update' : 'Create'}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-5">
        {/* Main column */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-900">Content</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={labelCls}>Title (EN) *</span>
                <input value={form.titleEn} onChange={e => { set('titleEn', e.target.value); if (!blogId) set('slug', slugify(e.target.value)) }} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}>Title (AR)</span>
                <input value={form.titleAr} onChange={e => set('titleAr', e.target.value)} dir="rtl" className={inputCls} />
              </label>
            </div>
            <label className="space-y-1 block">
              <span className={labelCls}>Slug *</span>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={labelCls}>Excerpt (EN)</span>
                <textarea value={form.excerptEn} onChange={e => set('excerptEn', e.target.value)} rows={2} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}>Excerpt (AR)</span>
                <textarea value={form.excerptAr} onChange={e => set('excerptAr', e.target.value)} rows={2} dir="rtl" className={inputCls} />
              </label>
            </div>
            <label className="space-y-1 block">
              <span className={labelCls}>Body (EN)</span>
              <textarea value={form.bodyEn} onChange={e => set('bodyEn', e.target.value)} rows={10} className={inputCls} />
            </label>
            <label className="space-y-1 block">
              <span className={labelCls}>Body (AR)</span>
              <textarea value={form.bodyAr} onChange={e => set('bodyAr', e.target.value)} rows={10} dir="rtl" className={inputCls} />
            </label>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-900">SEO</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={labelCls}>SEO Title (EN)</span>
                <input value={form.seoTitleEn} onChange={e => set('seoTitleEn', e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}>SEO Title (AR)</span>
                <input value={form.seoTitleAr} onChange={e => set('seoTitleAr', e.target.value)} dir="rtl" className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={labelCls}>SEO Description (EN)</span>
                <textarea value={form.seoDescEn} onChange={e => set('seoDescEn', e.target.value)} rows={2} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className={labelCls}>SEO Description (AR)</span>
                <textarea value={form.seoDescAr} onChange={e => set('seoDescAr', e.target.value)} rows={2} dir="rtl" className={inputCls} />
              </label>
            </div>
            <label className="space-y-1 block">
              <span className={labelCls}>SEO Image URL</span>
              <input value={form.seoImage} onChange={e => set('seoImage', e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-900">Publish</h2>
            <label className="space-y-1 block">
              <span className={labelCls}>Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className={labelCls}>Category</span>
              <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name?.en || c.slug}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className={labelCls}>Tags (comma-separated)</span>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} placeholder="news, updates" />
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-900">Featured Image</h2>
            <label className="space-y-1 block">
              <span className={labelCls}>Image URL</span>
              <input value={form.featureImage} onChange={e => set('featureImage', e.target.value)} className={inputCls} placeholder="https://..." />
            </label>
            {form.featureImage && (
              <img src={form.featureImage} alt="Preview" className="rounded-lg border border-gray-200 object-cover" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
