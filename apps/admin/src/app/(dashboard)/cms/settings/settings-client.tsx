'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Sliders, Loader2, Save, Plus, X } from 'lucide-react'
import type { SiteSettingRow } from '@/lib/actions/cms'
import { getSiteSettings, updateSiteSetting } from '@/lib/actions/cms'

export function SettingsClient() {
  const [rows, setRows] = useState<SiteSettingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('{}')

  const load = useCallback(() => {
    setLoading(true)
    getSiteSettings().then(r => {
      setRows(r)
      const vals: Record<string, string> = {}
      r.forEach(row => { vals[row.key] = JSON.stringify(row.value, null, 2) })
      setEditValues(vals)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = (key: string) => {
    setSavingKey(key)
    startTransition(async () => {
      const res = await updateSiteSetting(key, editValues[key] ?? '{}')
      if (res?.error) { toast.error(res.error); setSavingKey(null); return }
      toast.success(`Setting "${key}" updated`)
      setSavingKey(null)
      load()
    })
  }

  const handleCreate = () => {
    if (!newKey.trim()) { toast.error('Key is required'); return }
    try { JSON.parse(newValue) } catch { toast.error('Invalid JSON'); return }
    startTransition(async () => {
      const res = await updateSiteSetting(newKey.trim(), newValue)
      if (res?.error) { toast.error(res.error); return }
      toast.success(`Setting "${newKey}" created`)
      setShowNew(false); setNewKey(''); setNewValue('{}')
      load()
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Sliders className="h-4 w-4" /></div>
          <div>
            <h1 className="text-[16px] font-semibold text-gray-900">Site Settings</h1>
            <p className="text-[12px] text-gray-500">{rows.length} settings</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add Setting
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.key} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 capitalize">{row.key.replace(/_/g, ' ')}</h3>
                  <p className="text-[11px] text-gray-400">Key: {row.key} · Updated: {new Date(row.updatedAt).toLocaleString()}</p>
                </div>
                <button onClick={() => handleSave(row.key)} disabled={isPending && savingKey === row.key}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {isPending && savingKey === row.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
              <textarea
                value={editValues[row.key] ?? ''}
                onChange={e => setEditValues(prev => ({ ...prev, [row.key]: e.target.value }))}
                rows={Math.min(Math.max((editValues[row.key] ?? '').split('\n').length, 3), 12)}
                className={`${inputCls} font-mono text-[12px]`}
              />
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
              <h3 className="text-[14px] font-semibold text-gray-900">New Setting</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label className="space-y-1 block">
                <span className="text-[12px] font-medium text-gray-600">Key *</span>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} className={inputCls} placeholder="e.g. analytics" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[12px] font-medium text-gray-600">Value (JSON) *</span>
                <textarea value={newValue} onChange={e => setNewValue(e.target.value)} rows={5} className={`${inputCls} font-mono text-[12px]`} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
