'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { pool, query, queryOne } from '@mzadat/db'

export interface OrderRow {
  id: string
  orderNumber: string
  userId: string
  groupId: string
  depositAmount: number
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  status: string
  isVipFree: boolean
  createdAt: string
  userFirstName: string | null
  userLastName: string | null
  userEmail: string | null
  groupTitle: string | null
  unreadNotificationCount: number
  [key: string]: unknown
}

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  search?: string
}

export interface OrderStats {
  total: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  refundedAmount: number
}

export async function getOrderStats(): Promise<OrderStats> {
  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorized')

  const statsQuery = `
    SELECT 
      COUNT(*)::int as total,
      COALESCE(SUM(total_amount), 0)::float as "totalAmount",
      COALESCE(SUM(CASE WHEN payment_status = 'paid' AND status != 'refunded' THEN total_amount ELSE 0 END), 0)::float as "paidAmount",
      COALESCE(SUM(CASE WHEN payment_status != 'paid' AND status != 'refunded' THEN total_amount ELSE 0 END), 0)::float as "unpaidAmount",
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END), 0)::float as "refundedAmount"
    FROM auction_registrations
  `
  const stats = await queryOne<OrderStats>(statsQuery)
  return stats || { total: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, refundedAmount: 0 }
}

export async function getOrders(params: GetOrdersParams) {
  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorized')

  const { page = 1, pageSize = 20, search } = params
  const offset = (page - 1) * pageSize

  let whereClause = '1=1'
  const queryParams: unknown[] = [pageSize, offset]
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
    queryParams.push(`%${search}%`)
    paramIndex++
  }

  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM auction_registrations ar
    LEFT JOIN profiles up ON ar.user_id = up.id
    LEFT JOIN groups g ON ar.group_id = g.id
    WHERE ${whereClause}
  `
  const { total } = (await queryOne<{ total: number }>(countQuery, queryParams.slice(2))) || { total: 0 }

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
      ar.status as "status",
      ar.is_vip_free as "isVipFree",
      ar.created_at as "createdAt",
      up.first_name as "userFirstName",
      up.last_name as "userLastName",
      up.email as "userEmail",
      g.name->>'en' as "groupTitle",
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
  
  const items = await query<OrderRow>(dataQuery, queryParams)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getOrderDetails(id: string) {
  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorized')

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
      ar.status as "status",
      ar.is_vip_free as "isVipFree",
      ar.billing_name as "billingName",
      ar.billing_email as "billingEmail",
      ar.created_at as "createdAt",
      up.first_name as "userFirstName",
      up.last_name as "userLastName",
      up.email as "userEmail",
      up.phone as "userPhone",
      g.name->>'en' as "groupTitle",
      s.name->>'en' as "merchantName"
    FROM auction_registrations ar
    LEFT JOIN profiles up ON ar.user_id = up.id
    LEFT JOIN groups g ON ar.group_id = g.id
    LEFT JOIN stores s ON ar.merchant_id = s.id
    WHERE ar.id = $1
  `
  const order = await queryOne<{
    id: string
    orderNumber: string
    [key: string]: any
  }>(dataQuery, [id])
  if (!order) return null

  const notificationsQuery = `
    SELECT id, type, title->>'en' as title, body->>'en' as body, is_read as "isRead", created_at as "createdAt"
    FROM notifications
    WHERE type = 'admin_new_registration' 
      AND data->>'registrationId' = $1
    ORDER BY created_at DESC
  `
  const notifications = await query<{
    id: string
    type: string
    title: string
    body: string
    isRead: boolean
    createdAt: string
  }>(notificationsQuery, [id])
  
  if (notifications.some(n => !n.isRead)) {
    const updateQuery = `
      UPDATE notifications 
      SET is_read = true 
      WHERE type = 'admin_new_registration' 
        AND data->>'registrationId' = $1 
        AND is_read = false
    `
    await pool.query(updateQuery, [id]).catch(console.error)
  }

  return {
    ...order,
    notifications
  }
}

export async function updateOrderPaymentStatus(id: string, status: string) {
  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorized')

  if (status === 'refunded') {
    const updateQuery = `
      UPDATE auction_registrations 
      SET payment_status = $1, status = 'refunded'
      WHERE id = $2 
      RETURNING id
    `
    await queryOne(updateQuery, [status, id])
  } else {
    const updateQuery = `
      UPDATE auction_registrations 
      SET payment_status = $1 
      WHERE id = $2 
      RETURNING id
    `
    await queryOne(updateQuery, [status, id])
  }
  
  revalidatePath('/orders')
  return { success: true }
}
