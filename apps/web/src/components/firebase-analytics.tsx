'use client'

import { useEffect } from 'react'
import { firebaseApp } from '@/lib/firebase'

export function FirebaseAnalytics() {
  useEffect(() => {
    // getAnalytics requires window — safely import on client only
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
      isSupported().then((supported) => {
        if (supported) {
          getAnalytics(firebaseApp)
        }
      })
    })
  }, [])

  return null
}
