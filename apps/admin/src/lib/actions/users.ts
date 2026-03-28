'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { query, queryOne, pool } from '@mzadat/db'

// ── Types ────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  customId: string
  firstName: string
  lastName: string
  firstNameAr: string | null
  lastNameAr: string | null
  email: string
  phone: string | null
  role: string
  status: string
  registerAs: string
  isVip: boolean
  emailVerified: boolean
  walletBalance: number
  image: string | null
  createdAt: string
  countryName: string | null
  stateName: string | null
  cityName: string | null
  storeName: string | null
  bidCount: number
  orderCount: number
  [key: string]: unknown
}

export interface UserDetail {
  id: string
  customId: string
  firstName: string
  lastName: string
  firstNameAr: string | null
  lastNameAr: string | null
  email: string
  phone: string | null
  role: string
  status: string
  registerAs: string
  isVip: boolean
  emailVerified: boolean
  walletBalance: number
  image: string | null
  individualId: string | null
  companyName: string | null
  companyId: string | null
  address: string | null
  zipCode: string | null
  countryId: string | null
  stateId: string | null
  cityId: string | null
  countryName: string | null
  stateName: string | null
  cityName: string | null
  corporateDomainId: string | null
  corporateDomainName: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface UserBidRow {
  id: string
  productId: string
  productName: string | null
  amount: number
  isWinning: boolean
  createdAt: string
  productStatus: string | null
  [key: string]: unknown
}

export interface UserOrderRow {
  id: string
  orderNumber: string
  productName: string | null
  groupName: string | null
  type: string
  status: string
  paymentStatus: string
  totalAmount: number
  createdAt: string
  [key: string]: unknown
}

export interface UserTransactionRow {
  id: string
  type: string
  amount: number
  balanceAfter: number
  status: string
  description: string | null
  createdAt: string
  [key: string]: unknown
}

export interface UserRegistrationRow {
  id: string
  orderNumber: string
  groupName: string | null
  depositAmount: number
  totalAmount: number
  paymentStatus: string
  status: string
  isVipFree: boolean
  createdAt: string
  [key: string]: unknown
}

export interface UserStats {
  total: number
  active: number
  suspended: number
  vip: number
  merchants: number
  pendingVerification: number
  unverifiedEmail: number
  [key: string]: unknown
}

export interface GetUsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
  isVip?: string
  emailVerified?: string
}

// ── Stats ────────────────────────────────────────────────────────

export async function getUserStats(): Promise<UserStats> {
  await requireAdmin()

  const stats = await queryOne<UserStats>(`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'active')::int as active,
      COUNT(*) FILTER (WHERE status = 'suspended')::int as suspended,
      COUNT(*) FILTER (WHERE is_vip = true)::int as vip,
      COUNT(*) FILTER (WHERE role = 'merchant')::int as merchants,
      COUNT(*) FILTER (WHERE status = 'pending_verification')::int as "pendingVerification",
      COUNT(*) FILTER (WHERE email_verified = false)::int as "unverifiedEmail"
    FROM profiles
    WHERE deleted_at IS NULL
  `)
  return stats || { total: 0, active: 0, suspended: 0, vip: 0, merchants: 0, pendingVerification: 0, unverifiedEmail: 0 }
}

// ── List Users (Paginated) ───────────────────────────────────────

export async function getUsers(params: GetUsersParams) {
  await requireAdmin()

  const { page = 1, pageSize = 25, search, role, status, isVip, emailVerified } = params
  const offset = (page - 1) * pageSize

  const conditions: string[] = ['p.deleted_at IS NULL']
  const queryParams: unknown[] = [pageSize, offset]
  let paramIndex = 3

  if (search) {
    conditions.push(`(
      p.first_name ILIKE $${paramIndex}
      OR p.last_name ILIKE $${paramIndex}
      OR p.email ILIKE $${paramIndex}
      OR p.phone ILIKE $${paramIndex}
      OR p.custom_id ILIKE $${paramIndex}
      OR p.company_name ILIKE $${paramIndex}
    )`)
    queryParams.push(`%${search}%`)
    paramIndex++
  }

  if (role && role !== 'all') {
    conditions.push(`p.role = $${paramIndex}`)
    queryParams.push(role)
    paramIndex++
  }

  if (status && status !== 'all') {
    conditions.push(`p.status = $${paramIndex}`)
    queryParams.push(status)
    paramIndex++
  }

  if (isVip === 'true') {
    conditions.push(`p.is_vip = true`)
  } else if (isVip === 'false') {
    conditions.push(`p.is_vip = false`)
  }

  if (emailVerified === 'true') {
    conditions.push(`p.email_verified = true`)
  } else if (emailVerified === 'false') {
    conditions.push(`p.email_verified = false`)
  }

  const whereClause = conditions.join(' AND ')

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM profiles p WHERE ${whereClause}`,
    queryParams.slice(2),
  )) || { total: 0 }

  const items = await query<UserRow>(
    `SELECT
      p.id,
      p.custom_id as "customId",
      p.first_name as "firstName",
      p.last_name as "lastName",
      p.first_name_ar as "firstNameAr",
      p.last_name_ar as "lastNameAr",
      p.email,
      p.phone,
      p.role,
      p.status,
      p.register_as as "registerAs",
      p.is_vip as "isVip",
      p.email_verified as "emailVerified",
      p.wallet_balance::float as "walletBalance",
      p.image,
      p.created_at as "createdAt",
      co.name->>'en' as "countryName",
      st.name->>'en' as "stateName",
      ci.name->>'en' as "cityName",
      s.name->>'en' as "storeName",
      (SELECT COUNT(*)::int FROM bid_history bh WHERE bh.user_id = p.id AND bh.deleted_at IS NULL) as "bidCount",
      (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = p.id) as "orderCount"
    FROM profiles p
    LEFT JOIN countries co ON p.country_id = co.id
    LEFT JOIN states st ON p.state_id = st.id
    LEFT JOIN cities ci ON p.city_id = ci.id
    LEFT JOIN stores s ON s.owner_id = p.id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2`,
    queryParams,
  )

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ── Get Single User ──────────────────────────────────────────────

export async function getUserById(id: string): Promise<UserDetail | null> {
  await requireAdmin()

  return queryOne<UserDetail>(
    `SELECT
      p.id,
      p.custom_id as "customId",
      p.first_name as "firstName",
      p.last_name as "lastName",
      p.first_name_ar as "firstNameAr",
      p.last_name_ar as "lastNameAr",
      p.email,
      p.phone,
      p.role,
      p.status,
      p.register_as as "registerAs",
      p.is_vip as "isVip",
      p.email_verified as "emailVerified",
      p.wallet_balance::float as "walletBalance",
      p.image,
      p.individual_id as "individualId",
      p.company_name as "companyName",
      p.company_id as "companyId",
      p.address,
      p.zip_code as "zipCode",
      p.country_id as "countryId",
      p.state_id as "stateId",
      p.city_id as "cityId",
      co.name->>'en' as "countryName",
      st.name->>'en' as "stateName",
      ci.name->>'en' as "cityName",
      p.corporate_domain_id as "corporateDomainId",
      cd.company_name as "corporateDomainName",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      p.deleted_at as "deletedAt"
    FROM profiles p
    LEFT JOIN countries co ON p.country_id = co.id
    LEFT JOIN states st ON p.state_id = st.id
    LEFT JOIN cities ci ON p.city_id = ci.id
    LEFT JOIN corporate_domains cd ON p.corporate_domain_id = cd.id
    WHERE p.id = $1`,
    [id],
  )
}

// ── User Bids ────────────────────────────────────────────────────

export async function getUserBids(userId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM bid_history WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId],
  )) || { total: 0 }

  const items = await query<UserBidRow>(
    `SELECT
      bh.id,
      bh.product_id as "productId",
      pr.name->>'en' as "productName",
      bh.amount::float as amount,
      bh.is_winning as "isWinning",
      bh.created_at as "createdAt",
      pr.status as "productStatus"
    FROM bid_history bh
    LEFT JOIN products pr ON bh.product_id = pr.id
    WHERE bh.user_id = $1 AND bh.deleted_at IS NULL
    ORDER BY bh.created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── User Orders ──────────────────────────────────────────────────

export async function getUserOrders(userId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM orders WHERE user_id = $1`,
    [userId],
  )) || { total: 0 }

  const items = await query<UserOrderRow>(
    `SELECT
      o.id,
      o.order_number as "orderNumber",
      pr.name->>'en' as "productName",
      g.name->>'en' as "groupName",
      o.type,
      o.status,
      o.payment_status as "paymentStatus",
      o.total_amount::float as "totalAmount",
      o.created_at as "createdAt"
    FROM orders o
    LEFT JOIN products pr ON o.product_id = pr.id
    LEFT JOIN groups g ON o.group_id = g.id
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── User Transactions ────────────────────────────────────────────

export async function getUserTransactions(userId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM wallet_transactions WHERE user_id = $1`,
    [userId],
  )) || { total: 0 }

  const items = await query<UserTransactionRow>(
    `SELECT
      wt.id,
      wt.type,
      wt.amount::float as amount,
      wt.balance_after::float as "balanceAfter",
      wt.status,
      wt.description,
      wt.created_at as "createdAt"
    FROM wallet_transactions wt
    WHERE wt.user_id = $1
    ORDER BY wt.created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── User Registrations ───────────────────────────────────────────

export async function getUserRegistrations(userId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM auction_registrations WHERE user_id = $1`,
    [userId],
  )) || { total: 0 }

  const items = await query<UserRegistrationRow>(
    `SELECT
      ar.id,
      ar.order_number as "orderNumber",
      g.name->>'en' as "groupName",
      ar.deposit_amount::float as "depositAmount",
      ar.total_amount::float as "totalAmount",
      ar.payment_status as "paymentStatus",
      ar.status,
      ar.is_vip_free as "isVipFree",
      ar.created_at as "createdAt"
    FROM auction_registrations ar
    LEFT JOIN groups g ON ar.group_id = g.id
    WHERE ar.user_id = $1
    ORDER BY ar.created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── Update User ──────────────────────────────────────────────────

export async function updateUser(
  id: string,
  data: {
    firstName?: string
    lastName?: string
    firstNameAr?: string
    lastNameAr?: string
    phone?: string
    role?: string
    status?: string
    isVip?: boolean
    emailVerified?: boolean
    address?: string
    zipCode?: string
    individualId?: string
    companyName?: string
    companyId?: string
  },
) {
  await requireAdmin()

  const sets: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  const fieldMap: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    firstNameAr: 'first_name_ar',
    lastNameAr: 'last_name_ar',
    phone: 'phone',
    role: 'role',
    status: 'status',
    isVip: 'is_vip',
    emailVerified: 'email_verified',
    address: 'address',
    zipCode: 'zip_code',
    individualId: 'individual_id',
    companyName: 'company_name',
    companyId: 'company_id',
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key as keyof typeof data] !== undefined) {
      sets.push(`${col} = $${paramIndex}`)
      params.push(data[key as keyof typeof data])
      paramIndex++
    }
  }

  if (sets.length === 0) return { error: 'No fields to update' }

  sets.push(`updated_at = NOW()`)
  params.push(id)

  await pool.query(
    `UPDATE profiles SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    params,
  )

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
  return {}
}

// ── Toggle VIP ───────────────────────────────────────────────────

export async function toggleUserVip(id: string, isVip: boolean) {
  await requireAdmin()

  await pool.query(`UPDATE profiles SET is_vip = $1, updated_at = NOW() WHERE id = $2`, [isVip, id])

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
  return {}
}

// ── Toggle Email Verified ────────────────────────────────────────

export async function toggleEmailVerified(id: string, verified: boolean) {
  await requireAdmin()

  await pool.query(
    `UPDATE profiles SET email_verified = $1, updated_at = NOW() WHERE id = $2`,
    [verified, id],
  )

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
  return {}
}

// ── Update User Status ───────────────────────────────────────────

export async function updateUserStatus(id: string, status: string) {
  await requireAdmin()

  const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification']
  if (!validStatuses.includes(status)) return { error: 'Invalid status' }

  await pool.query(
    `UPDATE profiles SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id],
  )

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
  return {}
}

// ── Update User Role ─────────────────────────────────────────────

export async function updateUserRole(id: string, role: string) {
  await requireAdmin()

  const validRoles = ['customer', 'merchant', 'admin', 'super_admin']
  if (!validRoles.includes(role)) return { error: 'Invalid role' }

  await pool.query(
    `UPDATE profiles SET role = $1, updated_at = NOW() WHERE id = $2`,
    [role, id],
  )

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
  return {}
}
