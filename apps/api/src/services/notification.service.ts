/**
 * Notification Service
 *
 * Creates, queries, and manages in-app notifications for both
 * customers and admins. Notifications are bilingual (en/ar) and
 * optionally pushed in real-time via WebSocket.
 *
 * All DB reads use the raw pg pool; writes use Prisma for type safety.
 */

import { prisma, query, queryOne } from '@mzadat/db'
import type { Prisma } from '@mzadat/db'
import { broadcastNotificationEvent } from '../websocket/broadcaster.js'
import { pushToUser } from './fcm.service.js'

// ── Notification Types ───────────────────────────────────

/** Customer-facing notification types */
export type CustomerNotificationType =
  | 'outbid'
  | 'auction_won'
  | 'auction_lost'
  | 'auction_start'
  | 'auction_end'
  | 'auction_extended'
  | 'inspection_start'
  | 'inspection_end'
  | 'wallet_deposit_approved'
  | 'wallet_deposit_rejected'
  | 'wallet_credited'
  | 'wallet_debited'
  | 'deposit_refund'
  | 'registration_confirmed'
  | 'payment_reminder'
  | 'reserve_not_met'

/** Admin-facing notification types */
export type AdminNotificationType =
  | 'admin_wallet_deposit_request'
  | 'admin_wallet_deposit_reviewed'
  | 'admin_new_bid'
  | 'admin_auction_ended'
  | 'admin_winner_processed'
  | 'admin_no_winner'
  | 'admin_new_registration'
  | 'admin_new_user'
  | 'admin_wallet_adjustment'

export type NotificationType = CustomerNotificationType | AdminNotificationType

// ── Input types ──────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: { en: string; ar: string }
  body: { en: string; ar: string }
  data?: Record<string, unknown>
}

export interface NotificationListParams {
  userId: string
  isRead?: boolean
  type?: string
  page?: number
  pageSize?: number
}

// ── Service ──────────────────────────────────────────────

export const notificationService = {
  /**
   * Create a single notification and push it in real-time via WebSocket.
   */
  async create(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    })

    // Push real-time via WebSocket
    broadcastNotificationEvent(input.userId, {
      id: notification.id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    })

    // Push via FCM (fire-and-forget)
    pushToUser(input.userId, { title: input.title, body: input.body, data: input.data as Record<string, string> | undefined }).catch(
      (e) => console.error('[FCM] push error:', e),
    )

    return notification
  },

  /**
   * Create notifications for multiple users (e.g. all admins, all bidders on a lot).
   * Uses Prisma createMany for safe parameterized queries.
   */
  async createBulk(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return

    await prisma.notification.createMany({
      data: inputs.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: (n.data ?? {}) as Prisma.InputJsonValue,
      })),
    })

    // Push each via WebSocket
    for (const input of inputs) {
      broadcastNotificationEvent(input.userId, {
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        isRead: false,
        createdAt: new Date().toISOString(),
      })
    }
  },

  /**
   * Notify all admin/super_admin users.
   */
  async notifyAdmins(
    type: AdminNotificationType,
    title: { en: string; ar: string },
    body: { en: string; ar: string },
    data?: Record<string, unknown>,
  ) {
    const admins = await query<{ id: string }>(
      `SELECT id FROM profiles WHERE role IN ('admin', 'super_admin') AND status = 'active'`,
    )
    if (admins.length === 0) return

    const inputs: CreateNotificationInput[] = admins.map((admin) => ({
      userId: admin.id,
      type,
      title,
      body,
      data,
    }))

    await this.createBulk(inputs)
  },

  /**
   * List notifications for a user with pagination.
   */
  async list(params: NotificationListParams) {
    const { userId, isRead, type, page = 1, pageSize = 20 } = params
    const offset = (page - 1) * pageSize

    const conditions = ['user_id = $1']
    const values: unknown[] = [userId]
    let paramIdx = 2

    if (isRead !== undefined) {
      conditions.push(`is_read = $${paramIdx}`)
      values.push(isRead)
      paramIdx++
    }

    if (type) {
      conditions.push(`type = $${paramIdx}`)
      values.push(type)
      paramIdx++
    }

    const where = conditions.join(' AND ')

    const [rows, countResult] = await Promise.all([
      query<{
        id: string
        type: string
        title: Record<string, string>
        body: Record<string, string>
        data: Record<string, unknown>
        is_read: boolean
        created_at: Date
      }>(
        `SELECT id, type, title, body, data, is_read, created_at
         FROM notifications
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...values, pageSize, offset],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM notifications WHERE ${where}`,
        values,
      ),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        data: r.data,
        isRead: r.is_read,
        createdAt: r.created_at,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId],
    )
    return parseInt(result?.count ?? '0', 10)
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })
    return result.count > 0
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return result.count
  },

  /**
   * Delete a notification (user can only delete their own).
   */
  async delete(notificationId: string, userId: string) {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    })
    return result.count > 0
  },

  /**
   * Delete all read notifications older than N days.
   * Intended for cleanup cron jobs.
   */
  async cleanup(daysOld = 90) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)

    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoff },
      },
    })
    return result.count
  },
}

// ── Notification Factory Helpers ─────────────────────────
// Centralized message templates for consistency.

export const notify = {
  // ── Customer Notifications ──────────────────────────────

  async outbid(userId: string, productName: { en: string; ar: string }, productId: string, currentBid: string) {
    return notificationService.create({
      userId,
      type: 'outbid',
      title: { en: 'You have been outbid!', ar: 'تم تجاوز مزايدتك!' },
      body: {
        en: `Someone placed a higher bid of ${currentBid} OMR on "${productName.en}".`,
        ar: `قام شخص ما بتقديم مزايدة أعلى بقيمة ${currentBid} ر.ع. على "${productName.ar}".`,
      },
      data: { productId, currentBid },
    })
  },

  async auctionWon(userId: string, productName: { en: string; ar: string }, productId: string, amount: string, orderNumber: string) {
    return notificationService.create({
      userId,
      type: 'auction_won',
      title: { en: 'Congratulations! You won the auction!', ar: 'تهانينا! لقد فزت بالمزاد!' },
      body: {
        en: `You won "${productName.en}" with a bid of ${amount} OMR. Order: ${orderNumber}.`,
        ar: `لقد فزت بـ "${productName.ar}" بمزايدة ${amount} ر.ع. الطلب: ${orderNumber}.`,
      },
      data: { productId, amount, orderNumber },
    })
  },

  async auctionLost(userId: string, productName: { en: string; ar: string }, productId: string) {
    return notificationService.create({
      userId,
      type: 'auction_lost',
      title: { en: 'Auction ended', ar: 'انتهى المزاد' },
      body: {
        en: `The auction for "${productName.en}" has ended. Unfortunately, you did not win.`,
        ar: `انتهى المزاد على "${productName.ar}". للأسف، لم تفز.`,
      },
      data: { productId },
    })
  },

  async auctionStart(userId: string, productName: { en: string; ar: string }, productId: string, groupId?: string) {
    return notificationService.create({
      userId,
      type: 'auction_start',
      title: { en: 'Auction is now live!', ar: 'المزاد مباشر الآن!' },
      body: {
        en: `"${productName.en}" is now open for bidding.`,
        ar: `"${productName.ar}" مفتوح الآن للمزايدة.`,
      },
      data: { productId, groupId },
    })
  },

  async auctionEnd(userId: string, productName: { en: string; ar: string }, productId: string) {
    return notificationService.create({
      userId,
      type: 'auction_end',
      title: { en: 'Auction has ended', ar: 'انتهى المزاد' },
      body: {
        en: `The auction for "${productName.en}" has closed.`,
        ar: `تم إغلاق المزاد على "${productName.ar}".`,
      },
      data: { productId },
    })
  },

  async auctionExtended(userId: string, productName: { en: string; ar: string }, productId: string, newEndDate: string) {
    return notificationService.create({
      userId,
      type: 'auction_extended',
      title: { en: 'Auction time extended', ar: 'تم تمديد وقت المزاد' },
      body: {
        en: `"${productName.en}" has been extended due to a last-minute bid.`,
        ar: `تم تمديد "${productName.ar}" بسبب مزايدة في اللحظة الأخيرة.`,
      },
      data: { productId, newEndDate },
    })
  },

  async inspectionStart(userId: string, groupName: { en: string; ar: string }, groupId: string) {
    return notificationService.create({
      userId,
      type: 'inspection_start',
      title: { en: 'Inspection period started', ar: 'بدأت فترة المعاينة' },
      body: {
        en: `Inspection period for "${groupName.en}" has started. Visit the location to inspect the lots.`,
        ar: `بدأت فترة المعاينة لـ "${groupName.ar}". قم بزيارة الموقع لمعاينة القطع.`,
      },
      data: { groupId },
    })
  },

  async inspectionEnd(userId: string, groupName: { en: string; ar: string }, groupId: string) {
    return notificationService.create({
      userId,
      type: 'inspection_end',
      title: { en: 'Inspection period ended', ar: 'انتهت فترة المعاينة' },
      body: {
        en: `Inspection period for "${groupName.en}" has ended.`,
        ar: `انتهت فترة المعاينة لـ "${groupName.ar}".`,
      },
      data: { groupId },
    })
  },

  async walletDepositApproved(userId: string, amount: string, refNumber: string) {
    return notificationService.create({
      userId,
      type: 'wallet_deposit_approved',
      title: { en: 'Deposit approved', ar: 'تمت الموافقة على الإيداع' },
      body: {
        en: `Your deposit of ${amount} OMR (Ref: ${refNumber}) has been approved and credited to your wallet.`,
        ar: `تمت الموافقة على إيداعك بقيمة ${amount} ر.ع. (المرجع: ${refNumber}) وتم إضافته إلى محفظتك.`,
      },
      data: { amount, refNumber },
    })
  },

  async walletDepositRejected(userId: string, amount: string, refNumber: string, reason?: string) {
    return notificationService.create({
      userId,
      type: 'wallet_deposit_rejected',
      title: { en: 'Deposit rejected', ar: 'تم رفض الإيداع' },
      body: {
        en: `Your deposit of ${amount} OMR (Ref: ${refNumber}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        ar: `تم رفض إيداعك بقيمة ${amount} ر.ع. (المرجع: ${refNumber}).${reason ? ` السبب: ${reason}` : ''}`,
      },
      data: { amount, refNumber, reason },
    })
  },

  async walletCredited(userId: string, amount: string, description: string) {
    return notificationService.create({
      userId,
      type: 'wallet_credited',
      title: { en: 'Wallet credited', ar: 'تم شحن المحفظة' },
      body: {
        en: `${amount} OMR has been credited to your wallet. ${description}`,
        ar: `تم إضافة ${amount} ر.ع. إلى محفظتك. ${description}`,
      },
      data: { amount, description },
    })
  },

  async walletDebited(userId: string, amount: string, description: string) {
    return notificationService.create({
      userId,
      type: 'wallet_debited',
      title: { en: 'Wallet debited', ar: 'تم خصم من المحفظة' },
      body: {
        en: `${amount} OMR has been debited from your wallet. ${description}`,
        ar: `تم خصم ${amount} ر.ع. من محفظتك. ${description}`,
      },
      data: { amount, description },
    })
  },

  async depositRefund(userId: string, amount: string, groupName: { en: string; ar: string }, groupId: string) {
    return notificationService.create({
      userId,
      type: 'deposit_refund',
      title: { en: 'Deposit refunded', ar: 'تم استرداد التأمين' },
      body: {
        en: `Your deposit of ${amount} OMR for "${groupName.en}" has been refunded to your wallet.`,
        ar: `تم استرداد تأمينك بقيمة ${amount} ر.ع. لـ "${groupName.ar}" إلى محفظتك.`,
      },
      data: { amount, groupId },
    })
  },

  async registrationConfirmed(userId: string, groupName: { en: string; ar: string }, groupId: string, orderNumber: string) {
    return notificationService.create({
      userId,
      type: 'registration_confirmed',
      title: { en: 'Registration confirmed', ar: 'تم تأكيد التسجيل' },
      body: {
        en: `You are now registered for "${groupName.en}". Registration: ${orderNumber}.`,
        ar: `تم تسجيلك في "${groupName.ar}". رقم التسجيل: ${orderNumber}.`,
      },
      data: { groupId, orderNumber },
    })
  },

  async paymentReminder(userId: string, productName: { en: string; ar: string }, productId: string, orderNumber: string, daysLeft: number) {
    return notificationService.create({
      userId,
      type: 'payment_reminder',
      title: { en: 'Payment reminder', ar: 'تذكير بالدفع' },
      body: {
        en: `You have ${daysLeft} day(s) left to complete payment for "${productName.en}" (Order: ${orderNumber}).`,
        ar: `لديك ${daysLeft} يوم/أيام متبقية لإكمال الدفع لـ "${productName.ar}" (الطلب: ${orderNumber}).`,
      },
      data: { productId, orderNumber, daysLeft },
    })
  },

  async reserveNotMet(userId: string, productName: { en: string; ar: string }, productId: string) {
    return notificationService.create({
      userId,
      type: 'reserve_not_met',
      title: { en: 'Reserve price not met', ar: 'لم يتم الوصول إلى السعر الاحتياطي' },
      body: {
        en: `The reserve price for "${productName.en}" was not met. The auction has closed without a winner.`,
        ar: `لم يتم الوصول إلى السعر الاحتياطي لـ "${productName.ar}". تم إغلاق المزاد بدون فائز.`,
      },
      data: { productId },
    })
  },

  // ── Admin Notifications ─────────────────────────────────

  async adminWalletDepositRequest(userName: string, amount: string, refNumber: string, userId: string) {
    return notificationService.notifyAdmins(
      'admin_wallet_deposit_request',
      { en: 'New deposit request', ar: 'طلب إيداع جديد' },
      {
        en: `${userName} submitted a bank deposit of ${amount} OMR (Ref: ${refNumber}).`,
        ar: `قدم ${userName} إيداعًا مصرفيًا بقيمة ${amount} ر.ع. (المرجع: ${refNumber}).`,
      },
      { userId, amount, refNumber },
    )
  },

  async adminNewBid(userName: string, productName: string, amount: string, productId: string) {
    return notificationService.notifyAdmins(
      'admin_new_bid',
      { en: 'New bid placed', ar: 'مزايدة جديدة' },
      {
        en: `${userName} placed a bid of ${amount} OMR on "${productName}".`,
        ar: `قدم ${userName} مزايدة بقيمة ${amount} ر.ع. على "${productName}".`,
      },
      { productId, amount, userName },
    )
  },

  async adminAuctionEnded(productName: string, productId: string, bidCount: number) {
    return notificationService.notifyAdmins(
      'admin_auction_ended',
      { en: 'Auction ended', ar: 'انتهى المزاد' },
      {
        en: `Auction "${productName}" has ended with ${bidCount} bid(s).`,
        ar: `انتهى المزاد "${productName}" بعدد ${bidCount} مزايدة/مزايدات.`,
      },
      { productId, bidCount },
    )
  },

  async adminWinnerProcessed(winnerName: string, productName: string, amount: string, productId: string, orderNumber: string) {
    return notificationService.notifyAdmins(
      'admin_winner_processed',
      { en: 'Winner determined', ar: 'تم تحديد الفائز' },
      {
        en: `${winnerName} won "${productName}" with ${amount} OMR. Order: ${orderNumber}.`,
        ar: `فاز ${winnerName} بـ "${productName}" بمبلغ ${amount} ر.ع. الطلب: ${orderNumber}.`,
      },
      { productId, amount, orderNumber, winnerName },
    )
  },

  async adminNoWinner(productName: string, productId: string, reason: string) {
    return notificationService.notifyAdmins(
      'admin_no_winner',
      { en: 'Auction closed — no winner', ar: 'المزاد مغلق — لا فائز' },
      {
        en: `"${productName}" closed without a winner. Reason: ${reason}.`,
        ar: `تم إغلاق "${productName}" بدون فائز. السبب: ${reason}.`,
      },
      { productId, reason },
    )
  },

  async adminNewRegistration(userName: string, groupName: string, amount: string, groupId: string) {
    return notificationService.notifyAdmins(
      'admin_new_registration',
      { en: 'New auction registration', ar: 'تسجيل مزاد جديد' },
      {
        en: `${userName} registered for "${groupName}" with a deposit of ${amount} OMR.`,
        ar: `سجل ${userName} في "${groupName}" بتأمين بقيمة ${amount} ر.ع.`,
      },
      { groupId, amount, userName },
    )
  },

  async adminWalletAdjustment(adminName: string, userName: string, amount: string, isCredit: boolean, userId: string) {
    return notificationService.notifyAdmins(
      'admin_wallet_adjustment',
      { en: 'Wallet adjustment', ar: 'تعديل المحفظة' },
      {
        en: `${adminName} ${isCredit ? 'credited' : 'debited'} ${amount} OMR ${isCredit ? 'to' : 'from'} ${userName}'s wallet.`,
        ar: `قام ${adminName} ${isCredit ? 'بإضافة' : 'بخصم'} ${amount} ر.ع. ${isCredit ? 'إلى' : 'من'} محفظة ${userName}.`,
      },
      { userId, amount, isCredit, adminName },
    )
  },
}
