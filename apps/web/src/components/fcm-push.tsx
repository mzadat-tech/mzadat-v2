'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { requestFcmToken, onForegroundMessage } from '@/lib/fcm'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function registerTokenWithApi(token: string) {
  const headers = await getAuthHeaders()
  if (!headers) return
  await fetch(`${API_BASE}/notifications/fcm-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  }).catch(() => {})
}

export async function deregisterFcmToken(token: string) {
  const headers = await getAuthHeaders()
  if (!headers) return
  await fetch(`${API_BASE}/notifications/fcm-token`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ token }),
  }).catch(() => {})
}

/**
 * Initialises FCM: requests permission, registers the token with the API,
 * and shows foreground in-app toasts for incoming messages.
 *
 * Only activates when the user is signed in.
 */
export function FcmPush() {
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    async function init() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const token = await requestFcmToken()
      if (!token) return
      tokenRef.current = token

      await registerTokenWithApi(token)

      unsubscribe = onForegroundMessage((payload) => {
        const title = payload.notification?.title ?? 'Mzadat'
        const body = payload.notification?.body ?? ''
        toast(title, {
          description: body,
          duration: 8000,
          icon: <Bell className="h-4 w-4 text-primary" />,
          action: {
            label: 'View',
            onClick: () => window.dispatchEvent(new CustomEvent('open-notification-bell')),
          },
        })
        // Signal the notification bell to refresh
        window.dispatchEvent(new CustomEvent('fcm-notification'))
      })
    }

    init()

    return () => {
      unsubscribe?.()
    }
  }, [])

  return null
}
