/**
 * Email Queue — BullMQ queue for async email delivery.
 *
 * All email sends go through this queue so they:
 *  - Never block the request/response cycle
 *  - Automatically retry on SMTP errors (3 attempts, exponential backoff)
 *  - Get rate-limited naturally by worker concurrency
 *  - Are observable via BullMQ dashboard
 */
import { Queue } from 'bullmq'
import { bullConnection } from '../config/redis.js'
import type { EmailTemplateName } from '@mzadat/email'

export const QUEUE_NAME_EMAIL = 'email' as const

// ── Job payload types ────────────────────────────────────

export type EmailJobName = EmailTemplateName

export interface EmailJobData {
  /** Which template to render */
  template: EmailJobName
  /** Recipient email address */
  to: string
  /** Email subject line */
  subject: string
  /** Locale for bilingual rendering */
  locale: 'en' | 'ar'
  /** Template-specific props — typed per template in the worker */
  props: Record<string, unknown>
}

// ── Queue instance ───────────────────────────────────────

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME_EMAIL, {
  ...bullConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  },
})

// Suppress noisy Redis reconnection errors
emailQueue.on('error', (err) => {
  if (!(emailQueue as any).__errorLogged) {
    console.warn(`⚠️  Queue "${emailQueue.name}" Redis error: ${err.message}`)
    ;(emailQueue as any).__errorLogged = true
  }
})
