'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  Bell,
  CheckCheck,
  Wallet,
  Gavel,
  Trophy,
  Users,
  AlertTriangle,
  Settings,
  Info,
} from 'lucide-react'

interface NotifRow {
  id: string
  type: string
  title: Record<string, string>
  body: Record<string, string>
  data: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  admin_wallet_deposit_request: <Wallet className="h-4 w-4 text-blue-500" />,
  admin_wallet_deposit_reviewed: <Wallet className="h-4 w-4 text-emerald-500" />,
  admin_new_bid: <Gavel className="h-4 w-4 text-amber-500" />,
  admin_auction_ended: <Gavel className="h-4 w-4 text-gray-500" />,
  admin_winner_processed: <Trophy className="h-4 w-4 text-emerald-600" />,
  admin_no_winner: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  admin_new_registration: <Users className="h-4 w-4 text-blue-500" />,
  admin_new_user: <Users className="h-4 w-4 text-green-500" />,
  admin_wallet_adjustment: <Settings className="h-4 w-4 text-purple-500" />,
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotifRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // Get current admin user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()

    async function fetchNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) {
        setNotifications(
          data.map((n: { id: string; type: string; title: Record<string, string>; body: Record<string, string>; data: Record<string, unknown>; is_read: boolean; created_at: string }) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            isRead: n.is_read,
            createdAt: n.created_at,
          })),
        )
      }
    }

    fetchNotifs()

    // Realtime subscription
    const channel = supabase
      .channel('admin-notifs-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifs(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markAllRead() {
    if (!userId) return
    const supabase = createSupabaseBrowserClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  async function markOneRead(id: string) {
    const supabase = createSupabaseBrowserClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const title = n.title?.en ?? ''
                const body = n.body?.en ?? ''
                return (
                  <button
                    key={n.id}
                    onClick={() => markOneRead(n.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                      !n.isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-gray-200">
                      {NOTIF_ICONS[n.type] ?? <Info className="h-4 w-4 text-gray-400" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{title}</span>
                      <span className="block line-clamp-2 text-xs text-gray-500">{body}</span>
                      <span className="mt-1 block text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
