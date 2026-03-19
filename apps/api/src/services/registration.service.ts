/**
 * Registration Service
 *
 * Handles auction group registration (deposit payment).
 * Registering for a GROUP unlocks bidding on ALL lots in that group.
 *
 * Race-condition protection:
 *  - SELECT … FOR UPDATE on profile row (wallet balance)
 *  - SELECT … FOR UPDATE on existing registration check (idempotent)
 *  - Entire flow runs in a single pg transaction
 *
 * VIP users: 100% discount, no wallet deduction, still creates record.
 */

import { pool, query, queryOne } from '@mzadat/db'
import { generateOrderNumber } from '../utils/custom-id.js'
import { generateWalletTxRef } from '../utils/custom-id.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'
import { publicUrl } from '../utils/storage.js'
import { notify } from './notification.service.js'
import { emailService } from './email.service.js'

// ── Types ────────────────────────────────────────────

export interface RegisterInput {
  userId: string
  groupId: string
  paymentMethod: 'wallet'
}

export interface RegistrationResult {
  id: string
  orderNumber: string
  depositAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  isVipFree: boolean
  paymentStatus: string
  status: string
  createdAt: string
}

export interface RegistrationDetail {
  id: string
  orderNumber: string
  userId: string
  groupId: string
  groupName: unknown
  merchantId: string
  merchantName: string
  depositAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  paymentMethod: string
  paymentStatus: string
  isVipFree: boolean
  billingName: string | null
  billingEmail: string | null
  billingPhone: string | null
  walletTxRef: string | null
  status: string
  lotCount: number
  lots: Array<{ id: string; name: unknown; slug: string; featureImage: string | null }>
  createdAt: string
}

export class RegistrationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'RegistrationError'
  }
}

// ── Helpers ──────────────────────────────────────────

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return key
}

async function nextOrderNumber(client: any): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `MZD-${year}-`

  // Check both orders AND registrations for the latest number
  const result = await client.query(
    `(SELECT order_number FROM orders WHERE order_number LIKE $1 || '%' ORDER BY order_number DESC LIMIT 1)
     UNION ALL
     (SELECT order_number FROM auction_registrations WHERE order_number LIKE $1 || '%' ORDER BY order_number DESC LIMIT 1)
     ORDER BY order_number DESC LIMIT 1`,
    [prefix],
  )

  const seq = result.rows[0]
    ? parseInt(result.rows[0].order_number.split('-').pop() || '0', 10) + 1
    : 1

  return generateOrderNumber(year, seq)
}

async function nextWalletTxRef(client: any): Promise<string> {
  const result = await client.query(
    `SELECT nextval('wallet_tx_ref_seq')`,
  )
  const year = new Date().getFullYear()
  return generateWalletTxRef(year, parseInt(result.rows[0].nextval, 10))
}

// ── Service ──────────────────────────────────────────

export const registrationService = {
  /**
   * Register a user for an auction group.
   *
   * Entire flow is atomic:
   *  1. Lock profile row → check VIP, check balance
   *  2. Lock registration check → idempotent guard
   *  3. Load group → validate active/upcoming
   *  4. Deduct wallet (skip for VIP)
   *  5. Create wallet transaction (skip for VIP)
   *  6. Create registration record
   *  7. Audit log
   */
  async register(input: RegisterInput): Promise<RegistrationResult> {
    const { userId, groupId, paymentMethod } = input
    const encKey = getEncryptionKey()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 1. Lock profile row — prevents concurrent balance modifications
      const profileResult = await client.query<{
        id: string
        first_name: string
        last_name: string
        email: string
        phone: string | null
        address: string | null
        is_vip: boolean
        wallet_balance: string
        custom_id: string
      }>(
        `SELECT id, first_name, last_name, email, phone, address, is_vip, wallet_balance::text, custom_id
         FROM profiles WHERE id = $1 FOR UPDATE`,
        [userId],
      )

      const profile = profileResult.rows[0]
      if (!profile) throw new RegistrationError('Profile not found', 404)

      // 2. Idempotent check — prevent duplicate registration (with lock)
      const existingResult = await client.query<{ id: string; order_number: string; status: string }>(
        `SELECT id, order_number, status FROM auction_registrations
         WHERE user_id = $1 AND group_id = $2 FOR UPDATE`,
        [userId, groupId],
      )

      if (existingResult.rows[0]) {
        const existing = existingResult.rows[0]
        if (existing.status === 'active') {
          // Already registered — return existing (idempotent)
          await client.query('COMMIT')
          const full = await this.getById(existing.id)
          return {
            id: existing.id,
            orderNumber: existing.order_number,
            depositAmount: full?.depositAmount || '0',
            discountAmount: full?.discountAmount || '0',
            taxAmount: full?.taxAmount || '0',
            totalAmount: full?.totalAmount || '0',
            isVipFree: full?.isVipFree || false,
            paymentStatus: full?.paymentStatus || 'paid',
            status: 'active',
            createdAt: full?.createdAt || new Date().toISOString(),
          }
        }
        // If cancelled/refunded, allow re-registration by deleting old record
        await client.query(`DELETE FROM auction_registrations WHERE id = $1`, [existing.id])
      }

      // 3. Load group — validate it's registrable
      const groupResult = await client.query<{
        id: string
        merchant_id: string
        name: unknown
        min_deposit: string
        status: string
        start_date: string
        end_date: string
      }>(
        `SELECT id, merchant_id, name, min_deposit::text, status, start_date, end_date
         FROM groups WHERE id = $1`,
        [groupId],
      )

      const group = groupResult.rows[0]
      if (!group) throw new RegistrationError('Group not found', 404)
      if (group.status === 'closed' || group.status === 'cancelled') {
        throw new RegistrationError('This auction group is no longer accepting registrations', 400)
      }

      // 4. Calculate amounts (tax is included in the deposit, not added on top)
      const depositAmount = parseFloat(group.min_deposit)
      const isVip = profile.is_vip
      const discountAmount = isVip ? depositAmount : 0
      const chargeAmount = depositAmount - discountAmount // 0 for VIP
      const taxAmount = parseFloat((chargeAmount - chargeAmount / 1.05).toFixed(3))
      const totalAmount = chargeAmount

      // 5. Check wallet balance (skip for VIP)
      if (!isVip) {
        const balance = parseFloat(profile.wallet_balance)
        if (balance < totalAmount) {
          throw new RegistrationError(
            `Insufficient wallet balance. Required: ${totalAmount.toFixed(3)} OMR, Available: ${balance.toFixed(3)} OMR`,
            400,
          )
        }
      }

      // 6. Generate order number
      const orderNumber = await nextOrderNumber(client)

      // 7. Wallet deduction + transaction (skip for VIP)
      let walletTxId: string | null = null

      if (!isVip && totalAmount > 0) {
        const txRef = await nextWalletTxRef(client)

        // Insert wallet transaction
        const txResult = await client.query<{ id: string }>(
          `INSERT INTO wallet_transactions (
            reference_number, user_id, type, status, amount, total_amount,
            payment_method, currency, description, amount_encrypted
          ) VALUES (
            $1, $2, 'hold'::"WalletTxType", 'completed'::"WalletTxStatus", $3::numeric, $4::numeric,
            $5, 'OMR', $6,
            pgp_sym_encrypt($3::text, $7)
          ) RETURNING id`,
          [
            txRef, userId, chargeAmount, totalAmount, paymentMethod,
            `Auction registration deposit for group: ${orderNumber}`,
            encKey,
          ],
        )
        walletTxId = txResult.rows[0].id

        // Deduct wallet balance
        await client.query(
          `UPDATE profiles
           SET wallet_balance = wallet_balance - $1,
               wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance - $1)::text, $3),
               updated_at = NOW()
           WHERE id = $2`,
          [totalAmount, userId, encKey],
        )
      }

      // 8. Create registration record
      const regResult = await client.query<{
        id: string
        order_number: string
        created_at: string
      }>(
        `INSERT INTO auction_registrations (
          order_number, user_id, group_id, merchant_id,
          deposit_amount, discount_amount, tax_amount, total_amount,
          payment_method, payment_status, is_vip_free,
          billing_name, billing_email, billing_phone, billing_address,
          wallet_tx_id, status
        ) VALUES (
          $1, $2, $3, $4,
          $5::numeric, $6::numeric, $7::numeric, $8::numeric,
          $9, $10, $11,
          $12, $13, $14, $15,
          $16, 'active'
        ) RETURNING id, order_number, created_at`,
        [
          orderNumber, userId, groupId, group.merchant_id,
          depositAmount, discountAmount, taxAmount, totalAmount,
          paymentMethod, isVip ? 'free' : 'paid', isVip,
          `${profile.first_name} ${profile.last_name}`, profile.email, profile.phone, profile.address,
          walletTxId,
        ],
      )

      const registration = regResult.rows[0]

      // 9. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'create', 'auction_registration', $2, $3)`,
        [
          userId,
          registration.id,
          JSON.stringify({
            orderNumber, groupId, depositAmount, discountAmount, taxAmount, totalAmount,
            isVip, paymentMethod, walletTxId,
          }),
        ],
      )

      await client.query('COMMIT')

      // 10. Post-commit: broadcast registration event
      broadcastAuctionEvent('group:started' as any, {
        type: 'registration:completed',
        groupId,
        userId,
        userCustomId: profile.custom_id,
        orderNumber,
      })

      // 11. Notifications
      const gName = group.name as Record<string, string> | null
      notify.registrationConfirmed(
        userId,
        { en: gName?.en ?? '', ar: gName?.ar ?? '' },
        groupId,
        orderNumber,
      ).catch((e) => console.error('Notification error (registration):', e))

      // Email: registration confirmed
      query<{ id: string }>(
        `SELECT id FROM products WHERE group_id = $1 AND deleted_at IS NULL`, [groupId],
      ).then((lots) => {
        emailService.sendRegistrationConfirmed({
          to: profile.email,
          locale: 'en',
          firstName: profile.first_name,
          groupName: { en: gName?.en ?? '', ar: gName?.ar ?? '' },
          orderNumber,
          depositAmount: depositAmount.toFixed(3),
          taxAmount: taxAmount.toFixed(3),
          totalAmount: totalAmount.toFixed(3),
          isVipFree: isVip,
          lotCount: lots.length,
          groupId,
        })
      }).catch((e) => console.error('Email error (registration):', e))

      notify.adminNewRegistration(
        `${profile.first_name} ${profile.last_name}`,
        gName?.en ?? '',
        totalAmount.toFixed(3),
        groupId,
      ).catch((e) => console.error('Notification error (admin registration):', e))

      return {
        id: registration.id,
        orderNumber: registration.order_number,
        depositAmount: depositAmount.toFixed(3),
        discountAmount: discountAmount.toFixed(3),
        taxAmount: taxAmount.toFixed(3),
        totalAmount: totalAmount.toFixed(3),
        isVipFree: isVip,
        paymentStatus: isVip ? 'free' : 'paid',
        status: 'active',
        createdAt: registration.created_at,
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  /** Check if a user is registered for a specific group */
  async isRegistered(userId: string, groupId: string): Promise<{
    registered: boolean
    registration?: { id: string; orderNumber: string; status: string }
  }> {
    const row = await queryOne<{ id: string; order_number: string; status: string }>(
      `SELECT id, order_number, status FROM auction_registrations
       WHERE user_id = $1 AND group_id = $2 AND status = 'active'`,
      [userId, groupId],
    )

    if (!row) return { registered: false }
    return {
      registered: true,
      registration: { id: row.id, orderNumber: row.order_number, status: row.status },
    }
  },

  /** Get a single registration by ID */
  async getById(registrationId: string): Promise<RegistrationDetail | null> {
    const row = await queryOne<any>(
      `SELECT
        ar.id, ar.order_number AS "orderNumber",
        ar.user_id AS "userId", ar.group_id AS "groupId",
        ar.merchant_id AS "merchantId",
        ar.deposit_amount::text AS "depositAmount",
        ar.discount_amount::text AS "discountAmount",
        ar.tax_amount::text AS "taxAmount",
        ar.total_amount::text AS "totalAmount",
        ar.payment_method AS "paymentMethod",
        ar.payment_status AS "paymentStatus",
        ar.is_vip_free AS "isVipFree",
        ar.billing_name AS "billingName",
        ar.billing_email AS "billingEmail",
        ar.billing_phone AS "billingPhone",
        ar.wallet_tx_id AS "walletTxId",
        ar.status,
        ar.created_at AS "createdAt",
        g.name AS "groupName",
        p.first_name || ' ' || p.last_name AS "merchantName",
        wt.reference_number AS "walletTxRef"
       FROM auction_registrations ar
       JOIN groups g ON g.id = ar.group_id
       JOIN profiles p ON p.id = ar.merchant_id
       LEFT JOIN wallet_transactions wt ON wt.id = ar.wallet_tx_id
       WHERE ar.id = $1`,
      [registrationId],
    )

    if (!row) return null

    // Get lots in this group
    const lots = await query<{
      id: string; name: unknown; slug: string; feature_image: string | null
    }>(
      `SELECT id, name, slug, feature_image
       FROM products WHERE group_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [row.groupId],
    )

    return {
      ...row,
      lotCount: lots.length,
      lots: lots.map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        featureImage: l.feature_image,
      })),
    }
  },

  /** List user's registrations */
  async listByUser(userId: string, page = 1, pageSize = 20): Promise<{
    data: any[]
    total: number
    page: number
    pageSize: number
  }> {
    const offset = (Math.max(1, page) - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM auction_registrations WHERE user_id = $1`,
        [userId],
      ),
      query<any>(
        `SELECT
          ar.id, ar.order_number AS "orderNumber",
          ar.group_id AS "groupId",
          ar.deposit_amount::text AS "depositAmount",
          ar.discount_amount::text AS "discountAmount",
          ar.tax_amount::text AS "taxAmount",
          ar.total_amount::text AS "totalAmount",
          ar.payment_method AS "paymentMethod",
          ar.payment_status AS "paymentStatus",
          ar.is_vip_free AS "isVipFree",
          ar.status,
          ar.created_at AS "createdAt",
          g.name AS "groupName",
          g.status AS "groupStatus",
          g.start_date AS "groupStartDate",
          g.end_date AS "groupEndDate",
          g.image AS "groupImage",
          (SELECT COUNT(*) FROM products WHERE group_id = ar.group_id AND deleted_at IS NULL)::int AS "lotCount"
         FROM auction_registrations ar
         JOIN groups g ON g.id = ar.group_id
         WHERE ar.user_id = $1
         ORDER BY ar.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageSize, offset],
      ),
    ])

    return {
      data: dataResult.map((r: any) => ({ ...r, groupImage: publicUrl(r.groupImage) })),
      total: parseInt(countResult?.count || '0', 10),
      page,
      pageSize,
    }
  },

  /** Get checkout data for a group (pre-registration info) */
  async getCheckoutData(groupId: string, userId: string): Promise<{
    group: {
      id: string
      name: unknown
      description: unknown
      image: string | null
      merchantId: string
      merchantName: string
      merchantCustomId: string
      minDeposit: string
      status: string
      startDate: string
      endDate: string
    }
    lots: Array<{ id: string; name: unknown; slug: string; featureImage: string | null; minBidPrice: string }>
    user: {
      id: string
      name: string
      email: string
      phone: string | null
      isVip: boolean
      walletBalance: string
      customId: string
    }
    isAlreadyRegistered: boolean
    existingRegistration: { id: string; orderNumber: string } | null
  } | null> {
    // Fetch group
    const group = await queryOne<any>(
      `SELECT g.id, g.name, g.description, g.image, g.merchant_id AS "merchantId",
              g.min_deposit::text AS "minDeposit", g.status,
              g.start_date AS "startDate", g.end_date AS "endDate",
              p.first_name || ' ' || p.last_name AS "merchantName",
              p.custom_id AS "merchantCustomId"
       FROM groups g
       JOIN profiles p ON p.id = g.merchant_id
       WHERE g.id = $1`,
      [groupId],
    )

    if (!group) return null

    // Fetch lots
    const lots = await query<any>(
      `SELECT id, name, slug, feature_image AS "featureImage", min_bid_price::text AS "minBidPrice"
       FROM products WHERE group_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [groupId],
    )

    // Fetch user
    const user = await queryOne<any>(
      `SELECT id, first_name || ' ' || last_name AS name, email, phone,
              is_vip AS "isVip", wallet_balance::text AS "walletBalance", custom_id AS "customId"
       FROM profiles WHERE id = $1`,
      [userId],
    )

    if (!user) return null

    // Check existing registration
    const existing = await queryOne<{ id: string; order_number: string }>(
      `SELECT id, order_number FROM auction_registrations
       WHERE user_id = $1 AND group_id = $2 AND status = 'active'`,
      [userId, groupId],
    )

    return {
      group: { ...group, image: publicUrl(group.image) },
      lots: lots.map((l: any) => ({ ...l, featureImage: publicUrl(l.featureImage) })),
      user,
      isAlreadyRegistered: !!existing,
      existingRegistration: existing
        ? { id: existing.id, orderNumber: existing.order_number }
        : null,
    }
  },

  // ── Admin Read Operations ──────────────────────────────────
  async adminList(
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const offset = (page - 1) * pageSize

    let whereClause = '1=1'
    const params: unknown[] = [pageSize, offset]
    let paramIndex = 3

    if (search) {
      whereClause += ` AND (
        ar.order_number ILIKE $${paramIndex}
        OR up.first_name ILIKE $${paramIndex}
        OR up.last_name ILIKE $${paramIndex}
        OR up.email ILIKE $${paramIndex}
        OR g.name->>'en' ILIKE $${paramIndex}
        OR g.name->>'ar' ILIKE $${paramIndex}
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM auction_registrations ar
      LEFT JOIN profiles up ON ar.user_id = up.id
      LEFT JOIN groups g ON ar.group_id = g.id
      WHERE ${whereClause}
    `
    const { total } = (await queryOne<{ total: number }>(countQuery, params.slice(2))) || { total: 0 }

    const dataQuery = `
      SELECT 
        ar.id,
        ar.order_number as "orderNumber",
        ar.user_id as "userId",
        ar.group_id as "groupId",
        ar.deposit_amount as "depositAmount",
        ar.total_amount as "totalAmount",
        ar.payment_method as "paymentMethod",
        ar.payment_status as "paymentStatus",
        ar.is_vip_free as "isVipFree",
        ar.created_at as "createdAt",
        up.first_name as "userFirstName",
        up.last_name as "userLastName",
        up.email as "userEmail",
        g.name as "groupTitle",
        (
          SELECT COUNT(*) 
          FROM notifications n 
          WHERE n.type = 'admin_new_registration' 
            AND n.data->>'registrationId' = ar.id::text
            AND n.is_read = false
        )::int as "unreadNotificationCount"
      FROM auction_registrations ar
      LEFT JOIN profiles up ON ar.user_id = up.id
      LEFT JOIN groups g ON ar.group_id = g.id
      WHERE ${whereClause}
      ORDER BY ar.created_at DESC
      LIMIT $1 OFFSET $2
    `
    
    const items = await query(dataQuery, params)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  async adminGetById(id: string): Promise<any | null> {
    const dataQuery = `
      SELECT 
        ar.id,
        ar.order_number as "orderNumber",
        ar.user_id as "userId",
        ar.group_id as "groupId",
        ar.merchant_id as "merchantId",
        ar.deposit_amount as "depositAmount",
        ar.discount_amount as "discountAmount",
        ar.tax_amount as "taxAmount",
        ar.total_amount as "totalAmount",
        ar.payment_method as "paymentMethod",
        ar.payment_status as "paymentStatus",
        ar.is_vip_free as "isVipFree",
        ar.billing_name as "billingName",
        ar.billing_email as "billingEmail",
        ar.created_at as "createdAt",
        up.first_name as "userFirstName",
        up.last_name as "userLastName",
        up.email as "userEmail",
        up.phone as "userPhone",
        g.name as "groupTitle",
        s.name as "merchantName"
      FROM auction_registrations ar
      LEFT JOIN profiles up ON ar.user_id = up.id
      LEFT JOIN groups g ON ar.group_id = g.id
      LEFT JOIN stores s ON ar.merchant_id = s.id
      WHERE ar.id = $1
    `
    const registration = await queryOne(dataQuery, [id])
    if (!registration) return null

    // Get related notifications for admin
    const notificationsQuery = `
      SELECT id, type, title, body, is_read as "isRead", created_at as "createdAt"
      FROM notifications
      WHERE type = 'admin_new_registration' 
        AND data->>'registrationId' = $1
      ORDER BY created_at DESC
    `
    const notifications = await query<{
      id: string
      type: string
      title: unknown
      body: unknown
      isRead: boolean
      createdAt: string
    }>(notificationsQuery, [id])
    
    // Auto-mark notifications as read when viewed by admin
    if (notifications.some(n => !n.isRead)) {
      const updateQuery = `
        UPDATE notifications 
        SET is_read = true 
        WHERE type = 'admin_new_registration' 
          AND data->>'registrationId' = $1 
          AND is_read = false
      `
      await pool.query(updateQuery, [id]).catch(err => {
        console.error('Failed to mark admin registration notification as read', err)
      })
    }

    return {
      ...registration,
      notifications
    }
  }
}
