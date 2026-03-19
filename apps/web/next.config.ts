import type { NextConfig } from 'next'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// Generate public/firebase-messaging-sw.js from env vars so the API key
// is never hard-coded in source control.  Runs on every `next dev` / `next build`.
// ---------------------------------------------------------------------------
function generateFirebaseServiceWorker() {
  const config = JSON.stringify(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
    },
    null,
    2,
  )

  const sw = `// Auto-generated from environment variables — do not edit manually.
// Handles background push notifications when the app is not in focus.

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js')

firebase.initializeApp(${config})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {}

  self.registration.showNotification(title ?? 'Mzadat', {
    body: body ?? '',
    icon: icon ?? '/logo/icon-192.png',
    badge: '/logo/badge-72.png',
    data: payload.data,
  })
})

// Open / focus the app window when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link ?? '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) return client.focus()
        }
        return clients.openWindow(url)
      }),
  )
})
`

  writeFileSync(join(process.cwd(), 'public', 'firebase-messaging-sw.js'), sw)
}

generateFirebaseServiceWorker()

process.env.TMZN ??= 'Asia/Muscat'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // images already optimised at upload (Sharp WebP q82, max 1920px) — bypass _next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
    ],
  },
}

export default nextConfig
