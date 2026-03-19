'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Calls router.refresh() whenever the user re-focuses the browser tab,
 * ensuring Server Component data is always up-to-date without a full reload.
 */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])

  return null
}
