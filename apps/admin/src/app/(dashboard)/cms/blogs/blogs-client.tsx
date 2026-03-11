'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PenSquare, Plus, Pencil, Trash2, Loader2, Eye, Calendar } from 'lucide-react'
import type { BlogRow } from '@/lib/actions/cms'
import { getBlogs, deleteBlog } from '@/lib/actions/cms'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'border-gray-200 bg-gray-50 text-gray-500',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    archived: 'border-amber-200 bg-amber-50 text-amber-600',
  }
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? map.draft}`}>
      {status}
    </span>
  )
}

export function BlogsClient() {
  const [rows, setRows] = useState<BlogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<BlogRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getBlogs().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (blog: BlogRow) => {
    startTransition(async () => {
      const res = await deleteBlog(blog.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Blog post deleted')
      setDeleting(null)
      load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <PenSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Blog Posts</h1>
            <p className="text-[12px] text-gray-500">{rows.length} posts</p>
          </div>
        </div>
        <Link href="/cms/blogs/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> New Post
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No blog posts yet</td></tr>
            ) : rows.map(blog => (
              <tr key={blog.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{blog.title?.en || '—'}</p>
                  <p className="text-[11px] text-gray-400">{blog.slug}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{blog.categoryName || '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={blog.status} /></td>
                <td className="px-4 py-2.5 text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/cms/blogs/${blog.id}`}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => setDeleting(blog)}
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

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Blog Post</h3>
            <p className="text-[13px] text-gray-600">
              Are you sure you want to delete <strong>{deleting.title?.en}</strong>?
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
