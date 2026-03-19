/**
 * FCM Push Service
 *
 * Sends Firebase Cloud Messaging push notifications to registered
 * web/mobile device tokens for a given user.
 *
 * Credentials are supplied via environment variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (newlines as \n in .env)
 */

import admin from 'firebase-admin'
import { prisma } from '@mzadat/db'

// ── Initialise once ──────────────────────────────────────

let _initialised = false

function getApp(): admin.app.App {
  if (_initialised) return admin.app()

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in env.',
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
  _initialised = true
  return admin.app()
}

// ── Types ────────────────────────────────────────────────

export interface FcmMessage {
  title: { en: string; ar: string }
  body: { en: string; ar: string }
  data?: Record<string, string>
  /** Which locale to send to this device — defaults to 'en' */
  locale?: 'en' | 'ar'
}

// ── Push helpers ─────────────────────────────────────────

/**
 * Send a push notification to all FCM tokens registered for `userId`.
 * Silently removes stale/invalid tokens.
 */
export async function pushToUser(userId: string, message: FcmMessage): Promise<void> {
  if (!process.env.FIREBASE_PROJECT_ID) return // FCM not configured – skip silently

  const rows = await prisma.userFcmToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  })
  if (rows.length === 0) return

  const tokens = rows.map((r) => r.token)
  const locale = message.locale ?? 'en'

  let app: admin.app.App
  try {
    app = getApp()
  } catch (err) {
    console.warn('[FCM] Skipping push — admin init failed:', err)
    return
  }

  const messaging = app.messaging()

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: message.title[locale],
      body: message.body[locale],
    },
    data: message.data,
    webpush: {
      notification: {
        title: message.title[locale],
        body: message.body[locale],
        icon: '/logo/icon-192.png',
        badge: '/logo/badge-72.png',
      },
      fcmOptions: {
        link: '/',
      },
    },
  })

  // Clean up invalid/expired tokens
  const staleIds: string[] = []
  response.responses.forEach((res, idx) => {
    if (
      !res.success &&
      (res.error?.code === 'messaging/registration-token-not-registered' ||
        res.error?.code === 'messaging/invalid-registration-token')
    ) {
      const row = rows[idx]
      if (row) staleIds.push(row.id)
    }
  })

  if (staleIds.length > 0) {
    await prisma.userFcmToken.deleteMany({ where: { id: { in: staleIds } } }).catch(() => {})
  }
}

/**
 * Register (upsert) an FCM token for a user and subscribe it to the 'all' topic.
 * If the token already exists for a different user, it is re-assigned.
 */
export async function registerToken(userId: string, token: string): Promise<void> {
  await prisma.userFcmToken.upsert({
    where: { token },
    update: { userId },
    create: { userId, token },
  })

  // Subscribe to the global broadcast topic (fire-and-forget)
  try {
    const app = getApp()
    await app.messaging().subscribeToTopic([token], 'all')
  } catch (err) {
    console.warn('[FCM] Failed to subscribe token to topic "all":', err)
  }
}

/**
 * Remove a specific FCM token (e.g. on logout) and unsubscribe from topics.
 */
export async function removeToken(token: string): Promise<void> {
  try {
    const app = getApp()
    await app.messaging().unsubscribeFromTopic([token], 'all')
  } catch {
    // best-effort
  }
  await prisma.userFcmToken.delete({ where: { token } }).catch(() => {})
}

/**
 * Send a push notification to all devices subscribed to a topic (e.g. 'all').
 */
export async function pushToTopic(topic: string, message: FcmMessage): Promise<void> {
  if (!process.env.FIREBASE_PROJECT_ID) return

  let app: admin.app.App
  try {
    app = getApp()
  } catch (err) {
    console.warn('[FCM] Skipping topic push — admin init failed:', err)
    return
  }

  const locale = message.locale ?? 'en'

  await app.messaging().send({
    topic,
    notification: {
      title: message.title[locale],
      body: message.body[locale],
    },
    data: message.data,
    webpush: {
      notification: {
        title: message.title[locale],
        body: message.body[locale],
        icon: '/logo/icon-192.png',
        badge: '/logo/badge-72.png',
      },
      fcmOptions: { link: '/' },
    },
  })
}
