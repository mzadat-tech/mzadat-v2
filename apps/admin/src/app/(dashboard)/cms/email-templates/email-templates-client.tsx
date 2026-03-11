'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Mail, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { EmailTemplateRow, EmailTemplateFormData } from '@/lib/actions/cms'
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/actions/cms'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
      status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

function TemplateModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing: EmailTemplateRow | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    slug: editing?.slug ?? '',
    subjectEn: editing?.subject?.en ?? '',
    subjectAr: editing?.subject?.ar ?? '',
    bodyEn: editing?.body?.en ?? '',
    bodyAr: editing?.body?.ar ?? '',
    variables: editing?.variables ? JSON.stringify(editing.variables, null, 2) : '[]',
    status: editing?.status ?? 'active',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    try { JSON.parse(form.variables) } catch { toast.error('Invalid JSON for variables'); return }
    startTransition(async () => {
      const data: EmailTemplateFormData = {
        name: form.name, slug: form.slug,
        subjectEn: form.subjectEn, subjectAr: form.subjectAr,
        bodyEn: form.bodyEn, bodyAr: form.bodyAr,
        variables: form.variables, status: form.status,
      }
      const res = editing ? await updateEmailTemplate(editing.id, data) : await createEmailTemplate(data)
      if (res?.error) { toast.error(res.error); return }
      toast.success(editing ? 'Template updated' : 'Template created')
      onSuccess()
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelCls = 'text-[12px] font-medium text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-gray-900">{editing ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Name *</span>
              <input value={form.name} onChange={e => { set('name', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Slug *</span>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Subject (EN) *</span>
              <input value={form.subjectEn} onChange={e => set('subjectEn', e.target.value)} className={inputCls} /></label>
            <label className="space-y-1"><span className={labelCls}>Subject (AR)</span>
              <input value={form.subjectAr} onChange={e => set('subjectAr', e.target.value)} dir="rtl" className={inputCls} /></label>
          </div>
          <label className="space-y-1 block"><span className={labelCls}>Body (EN) *</span>
            <textarea value={form.bodyEn} onChange={e => set('bodyEn', e.target.value)} rows={8} className={inputCls} placeholder="HTML template with {{variable}} placeholders" /></label>
          <label className="space-y-1 block"><span className={labelCls}>Body (AR)</span>
            <textarea value={form.bodyAr} onChange={e => set('bodyAr', e.target.value)} rows={8} dir="rtl" className={inputCls} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelCls}>Variables (JSON)</span>
              <textarea value={form.variables} onChange={e => set('variables', e.target.value)} rows={3} className={`${inputCls} font-mono text-[12px]`}
                placeholder='[{"key":"name","description":"User name"}]' /></label>
            <label className="space-y-1"><span className={labelCls}>Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select></label>
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

export function EmailTemplatesClient() {
  const [rows, setRows] = useState<EmailTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null)
  const [deleting, setDeleting] = useState<EmailTemplateRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getEmailTemplates().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = (t: EmailTemplateRow) => {
    startTransition(async () => {
      const res = await deleteEmailTemplate(t.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Template deleted')
      setDeleting(null); load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Mail className="h-4 w-4" /></div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Email Templates</h1>
            <p className="text-[12px] text-gray-500">{rows.length} templates</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add Template
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Slug</th>
              <th className="px-4 py-2.5">Subject</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No email templates yet</td></tr>
            ) : rows.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{t.slug}</td>
                <td className="px-4 py-2.5 text-gray-500">{t.subject?.en || '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(t); setShowModal(true) }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleting(t)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <TemplateModal editing={editing} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load() }} />}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Template</h3>
            <p className="text-[13px] text-gray-600">Delete <strong>{deleting.name}</strong>?</p>
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
