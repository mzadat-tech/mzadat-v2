/**
 * Email Worker — processes email jobs from the BullMQ queue.
 *
 * Renders React Email templates to HTML via @mzadat/email, then sends via
 * Nodemailer SMTP. Provider-agnostic: works with Mailtrap (testing),
 * SendGrid SMTP, Amazon SES SMTP, or any standards-compliant SMTP server.
 *
 * Concurrency: 5 (safe for most SMTP providers)
 */
import { Worker, type Job } from 'bullmq'
import nodemailer from 'nodemailer'
import { renderEmail } from '@mzadat/email'

import { bullConnection } from '../config/redis.js'
import { env } from '../config/env.js'
import { QUEUE_NAME_EMAIL, type EmailJobData } from '../queues/email.queue.js'

// ── SMTP Transport ───────────────────────────────────────

function createTransport() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('⚠️  SMTP credentials not configured — emails will be logged but not sent')
    return null
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!transporter) {
    transporter = createTransport()
  }
  return transporter
}

// ── Worker ───────────────────────────────────────────────

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME_EMAIL,
    async (job: Job<EmailJobData>) => {
      const { template, to, subject, locale, props } = job.data

      // Render the React Email template to HTML (JSX handled inside @mzadat/email)
      const html = await renderEmail(template, { ...props, locale })

      const transport = getTransporter()
      if (!transport) {
        // No SMTP configured — log the email for development
        console.log(`📧 [DEV] Email "${template}" → ${to} | Subject: ${subject}`)
        return { status: 'logged', to, template }
      }

      // Send via SMTP
      const result = await transport.sendMail({
        from: `Mzadat <${env.EMAIL_FROM}>`,
        to,
        subject,
        html,
      })

      console.log(`📧 Email sent: "${template}" → ${to} [${result.messageId}]`)
      return { status: 'sent', messageId: result.messageId, to, template }
    },
    {
      ...bullConnection,
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    console.log(`✅ Email job completed: ${job.data.template} → ${job.data.to}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Email job failed: ${job?.data.template} → ${job?.data.to}`, err.message)
  })

  worker.on('error', () => {
    // Suppress noisy reconnection errors
  })

  console.log('🏗️  Email worker started')
  return worker
}
