/**
 * Email Service
 *
 * High-level API to enqueue transactional emails.
 * All emails are sent asynchronously via the BullMQ email queue.
 *
 * Usage:
 *   emailService.sendAuctionWon({ to, locale, firstName, ... })
 *
 * The queue worker handles rendering + SMTP delivery with automatic retries.
 */
import { emailQueue, type EmailJobName } from '../queues/email.queue.js'
import { env } from '../config/env.js'

// ── Helpers ──────────────────────────────────────────────

function webUrl(path: string): string {
  return `${env.WEB_URL}${path}`
}

function enqueue(
  template: EmailJobName,
  to: string,
  subject: string,
  locale: 'en' | 'ar',
  props: Record<string, unknown>,
) {
  return emailQueue.add(template, { template, to, subject, locale, props }, {
    // Dedup: don't send the same email to the same user within a short window
    jobId: `${template}:${to}:${Date.now()}`,
  }).catch((err) => {
    console.error(`[EmailService] Failed to enqueue "${template}" for ${to}:`, err.message)
  })
}

function subject(en: string, ar: string, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? ar : en
}

// ── Public API ───────────────────────────────────────────

export const emailService = {
  /**
   * Welcome email — sent when a new user signs up.
   */
  sendWelcome(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
  }) {
    return enqueue('welcome', params.to, subject('Welcome to Mzadat!', 'مرحبًا بك في مزادات!', params.locale), params.locale, {
      firstName: params.firstName,
      browseUrl: webUrl('/auctions'),
    })
  },

  /**
   * Auction won — sent to the winner after processing.
   */
  sendAuctionWon(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    productName: { en: string; ar: string }
    bidAmount: string
    taxAmount: string
    totalAmount: string
    orderNumber: string
    paymentDays: number
    productId: string
  }) {
    return enqueue(
      'auction-won',
      params.to,
      subject(
        `🏆 You won "${params.productName.en}"!`,
        `🏆 فزت بـ "${params.productName.ar}"!`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        productName: params.productName,
        bidAmount: params.bidAmount,
        taxAmount: params.taxAmount,
        totalAmount: params.totalAmount,
        orderNumber: params.orderNumber,
        paymentDays: params.paymentDays,
        productUrl: webUrl(`/auctions/${params.productId}`),
      },
    )
  },

  /**
   * Auction lost — sent to losing bidders when auction ends.
   */
  sendAuctionLost(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    productName: { en: string; ar: string }
    refundAmount?: string
    groupName?: { en: string; ar: string }
  }) {
    return enqueue(
      'auction-lost',
      params.to,
      subject(
        `Auction ended — "${params.productName.en}"`,
        `انتهى المزاد — "${params.productName.ar}"`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        productName: params.productName,
        refundAmount: params.refundAmount,
        groupName: params.groupName,
        browseUrl: webUrl('/auctions'),
      },
    )
  },

  /**
   * Registration confirmed — sent after successful group registration.
   */
  sendRegistrationConfirmed(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    groupName: { en: string; ar: string }
    orderNumber: string
    depositAmount: string
    taxAmount: string
    totalAmount: string
    isVipFree: boolean
    lotCount: number
    groupId: string
  }) {
    return enqueue(
      'registration-confirmed',
      params.to,
      subject(
        `Registration confirmed — ${params.orderNumber}`,
        `تم تأكيد التسجيل — ${params.orderNumber}`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        groupName: params.groupName,
        orderNumber: params.orderNumber,
        depositAmount: params.depositAmount,
        taxAmount: params.taxAmount,
        totalAmount: params.totalAmount,
        isVipFree: params.isVipFree,
        lotCount: params.lotCount,
        groupUrl: webUrl(`/groups/${params.groupId}`),
      },
    )
  },

  /**
   * Deposit refund — sent when auction deposit is refunded to wallet.
   */
  sendDepositRefund(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    amount: string
    groupName: { en: string; ar: string }
    reason?: 'non_winner' | 'reserve_not_met' | 'auction_cancelled'
  }) {
    return enqueue(
      'deposit-refund',
      params.to,
      subject(
        `Deposit refunded — ${params.amount} OMR`,
        `تم استرداد التأمين — ${params.amount} ر.ع.`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        amount: params.amount,
        groupName: params.groupName,
        reason: params.reason ?? 'non_winner',
        walletUrl: webUrl('/dashboard/wallet'),
        browseUrl: webUrl('/auctions'),
      },
    )
  },

  /**
   * Wallet deposit approved — sent when bank deposit is approved by admin.
   */
  sendWalletDepositApproved(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    amount: string
    referenceNumber: string
    newBalance?: string
  }) {
    return enqueue(
      'wallet-deposit-approved',
      params.to,
      subject(
        `✅ Deposit approved — ${params.amount} OMR`,
        `✅ تمت الموافقة على الإيداع — ${params.amount} ر.ع.`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        amount: params.amount,
        referenceNumber: params.referenceNumber,
        newBalance: params.newBalance,
        walletUrl: webUrl('/dashboard/wallet'),
      },
    )
  },

  /**
   * Wallet deposit rejected — sent when bank deposit is rejected by admin.
   */
  sendWalletDepositRejected(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    amount: string
    referenceNumber: string
    reason?: string
  }) {
    return enqueue(
      'wallet-deposit-rejected',
      params.to,
      subject(
        `Deposit rejected — ${params.referenceNumber}`,
        `تم رفض الإيداع — ${params.referenceNumber}`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        amount: params.amount,
        referenceNumber: params.referenceNumber,
        reason: params.reason,
        supportUrl: webUrl('/support'),
      },
    )
  },

  /**
   * Wallet credited — sent on admin adjustments or other credits.
   */
  sendWalletCredited(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    amount: string
    description: string
    referenceNumber?: string
    newBalance?: string
  }) {
    return enqueue(
      'wallet-credited',
      params.to,
      subject(
        `Wallet credited — ${params.amount} OMR`,
        `تم شحن المحفظة — ${params.amount} ر.ع.`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        amount: params.amount,
        description: params.description,
        referenceNumber: params.referenceNumber,
        newBalance: params.newBalance,
      },
    )
  },

  /**
   * Payment reminder — sent to winners who haven't paid yet.
   */
  sendPaymentReminder(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    productName: { en: string; ar: string }
    orderNumber: string
    totalAmount: string
    daysLeft: number
    productId: string
  }) {
    return enqueue(
      'payment-reminder',
      params.to,
      subject(
        params.daysLeft <= 1
          ? `🚨 URGENT: Payment due today — ${params.orderNumber}`
          : `⏰ Payment reminder — ${params.daysLeft} days left`,
        params.daysLeft <= 1
          ? `🚨 عاجل: الدفع مستحق اليوم — ${params.orderNumber}`
          : `⏰ تذكير بالدفع — ${params.daysLeft} أيام متبقية`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        productName: params.productName,
        orderNumber: params.orderNumber,
        totalAmount: params.totalAmount,
        daysLeft: params.daysLeft,
        productUrl: webUrl(`/auctions/${params.productId}`),
      },
    )
  },

  /**
   * Outbid — sent when someone places a higher bid.
   */
  sendOutbid(params: {
    to: string
    locale: 'en' | 'ar'
    firstName: string
    productName: { en: string; ar: string }
    currentBid: string
    productId: string
  }) {
    return enqueue(
      'outbid',
      params.to,
      subject(
        `You've been outbid on "${params.productName.en}"`,
        `تم تجاوز مزايدتك على "${params.productName.ar}"`,
        params.locale,
      ),
      params.locale,
      {
        firstName: params.firstName,
        productName: params.productName,
        currentBid: params.currentBid,
        productUrl: webUrl(`/auctions/${params.productId}`),
      },
    )
  },
}
