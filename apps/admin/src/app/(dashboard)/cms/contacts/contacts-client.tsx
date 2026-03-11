'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Trash2, Loader2, Eye, Mail, Phone } from 'lucide-react'
import type { ContactRow } from '@/lib/actions/cms'
import { getContacts, markContactRead, deleteContact } from '@/lib/actions/cms'

export function ContactsClient() {
  const [rows, setRows] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ContactRow | null>(null)
  const [deleting, setDeleting] = useState<ContactRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    getContacts().then(r => { setRows(r); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const unreadCount = rows.filter(r => !r.isRead).length

  const handleView = (c: ContactRow) => {
    setSelected(c)
    if (!c.isRead) {
      startTransition(async () => {
        await markContactRead(c.id)
        load()
      })
    }
  }

  const handleDelete = (c: ContactRow) => {
    startTransition(async () => {
      const res = await deleteContact(c.id)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Contact deleted')
      setDeleting(null)
      setSelected(null)
      load()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><MessageSquare className="h-4 w-4" /></div>
        <div>
          <h1 className="text-[16px] font-semibold text-gray-900">Contact Messages</h1>
          <p className="text-[12px] text-gray-500">{rows.length} messages{unreadCount > 0 && ` · ${unreadCount} unread`}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5 w-6"></th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Subject</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No messages yet</td></tr>
            ) : rows.map(c => (
              <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer ${!c.isRead ? 'bg-blue-50/30' : ''}`}
                onClick={() => handleView(c)}>
                <td className="px-4 py-2.5">
                  {!c.isRead && <span className="inline-block h-2 w-2 rounded-full bg-brand-600" />}
                </td>
                <td className={`px-4 py-2.5 ${!c.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{c.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.email}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.subject || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleView(c)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleting(c)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Message */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
              <h3 className="text-[14px] font-semibold text-gray-900">{selected.subject || 'No Subject'}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-[20px]">&times;</button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center gap-4 text-[13px]">
                <span className="font-medium text-gray-900">{selected.name}</span>
                <span className="flex items-center gap-1 text-gray-500"><Mail className="h-3 w-3" />{selected.email}</span>
                {selected.phone && <span className="flex items-center gap-1 text-gray-500"><Phone className="h-3 w-3" />{selected.phone}</span>}
              </div>
              <p className="text-[12px] text-gray-400">{new Date(selected.createdAt).toLocaleString()}</p>
              <div className="whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-[13px] text-gray-700">
                {selected.message}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button onClick={() => setSelected(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => { setDeleting(selected); setSelected(null) }}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Delete Message</h3>
            <p className="text-[13px] text-gray-600">Delete message from <strong>{deleting.name}</strong>?</p>
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
