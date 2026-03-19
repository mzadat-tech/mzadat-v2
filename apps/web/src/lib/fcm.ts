import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { firebaseApp } from './firebase'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

/**
 * Request notification permission and return the FCM registration token.
 * Returns null if permission is denied or messaging is unsupported.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  try {
    // Register the SW (no-op if already registered), then wait until it is active
    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const registration = await navigator.serviceWorker.ready

    const messaging = getMessaging(firebaseApp)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    return token ?? null
  } catch (err) {
    console.warn('[FCM] Failed to get token:', err)
    return null
  }
}

/**
 * Subscribe to foreground messages. Returns an unsubscribe function.
 */
export function onForegroundMessage(handler: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const messaging = getMessaging(firebaseApp)
  return onMessage(messaging, handler)
}
