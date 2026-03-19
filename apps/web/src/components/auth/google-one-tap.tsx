'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'

export function GoogleOneTap() {
  const router = useRouter()

  useEffect(() => {
    // Only proceed if the client ID is configured
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    const supabase = createClient()

    const initializeGoogleOneTap = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) return // Don't prompt if already logged in

        // Generate a cryptographically secure nonce
        const generateNonce = async () => {
          const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
          const encoder = new TextEncoder()
          const encodedNonce = encoder.encode(nonce)
          const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashedNonce = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
          return { nonce, hashedNonce }
        }

        generateNonce().then(({ nonce, hashedNonce }) => {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: clientId,
            nonce: hashedNonce,
            callback: async (response: any) => {
              try {
                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential,
                  nonce: nonce,
                })

                if (error) {
                  console.error('One Tap Error:', error.message)
                  return
                }

                if (data?.session) {
                  // Sync the OAuth user profile with your Express API
                  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`
                  try {
                    const res = await fetch(`${apiUrl}/auth/oauth/sync`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${data.session.access_token}`,
                      },
                    })
                    const syncData = await res.json()
                    
                    if (res.status === 404 && syncData.requireCompletion) {
                      router.push('/auth/complete-profile')
                      router.refresh()
                      return
                    }
                  } catch (err) {
                    console.error('Failed to sync One Tap profile:', err)
                  }

                  // Redirect to dashboard on success
                  router.push('/dashboard')
                  router.refresh()
                }
              } catch (err) {
                console.error('Failed to handle Google One Tap sign in', err)
              }
            },
          })

          // Show the One Tap prompt
          // @ts-ignore
          window.google.accounts.id.prompt()
        })
      })
    }

    // Ensure we only prompt if the user is completely logged out
    // @ts-ignore
    if (typeof window !== 'undefined' && window.google) {
      initializeGoogleOneTap()
    }
    
    // Mount initialize method onto window so the Script onLoad can trigger it
    // @ts-ignore
    window.initializeGoogleOneTap = initializeGoogleOneTap
  }, [router])

  // Don't render if there's no client ID
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-ignore
        if (typeof window.initializeGoogleOneTap === 'function') {
          // @ts-ignore
          window.initializeGoogleOneTap()
        }
      }}
    />
  )
}
