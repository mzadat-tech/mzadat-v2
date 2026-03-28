'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { query, queryOne, pool } from '@mzadat/db'

// ── Types ────────────────────────────────────────────────────────

export interface StoreRow {
  id: string
  slug: string
  nameEn: string | null
  nameAr: string | null
  email: string | null
  phone: string | null
  status: string
  commissionRate: number
  vatApplicable: boolean
  vatRate: number
  createdAt: string
  ownerName: string
  ownerEmail: string
  ownerId: string
  ownerCustomId: string
  productCount: number
  groupCount: number
  activeGroupCount: number
  [key: string]: unknown
}

export interface StoreDetail {
  id: string
  slug: string
  nameEn: string | null
  nameAr: string | null
  descriptionEn: string | null
  descriptionAr: string | null
  email: string | null
  phone: string | null
  address: string | null
  logo: string | null
  coverImage: string | null
  socialLinks: Record<string, string> | null
  commissionRate: number
  vatApplicable: boolean
  vatRate: number
  status: string
  createdAt: string
  updatedAt: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  ownerCustomId: string
  ownerRole: string
  ownerIsVip: boolean
  [key: string]: unknown
}

export interface StoreProductRow {
  id: string
  slug: string
  nameEn: string | null
  saleType: string
  status: string
  price: number
  currentBid: number
  bidCount: number
  groupName: string | null
  categoryName: string | null
  createdAt: string
  [key: string]: unknown
}

export interface StoreGroupRow {
  id: string
  nameEn: string | null
  nameAr: string | null
  status: string
  startDate: string
  endDate: string
  minDeposit: number
  productCount: number
  registrationCount: number
  createdAt: string
  [key: string]: unknown
}

export interface StoreOrderRow {
  id: string
  orderNumber: string
  productName: string | null
  buyerName: string
  type: string
  status: string
  paymentStatus: string
  totalAmount: number
  createdAt: string
  [key: string]: unknown
}

export interface StoreStats {
  total: number
  active: number
  inactive: number
  totalProducts: number
  totalGroups: number
  activeGroups: number
  [key: string]: unknown
}

export interface GetStoresParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

// ── Stats ────────────────────────────────────────────────────────

export async function getStoreStats(): Promise<StoreStats> {
  await requireAdmin()

  const stats = await queryOne<StoreStats>(`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE s.status = 'active')::int as active,
      COUNT(*) FILTER (WHERE s.status = 'inactive')::int as inactive,
      COALESCE((SELECT COUNT(*)::int FROM products pr WHERE pr.deleted_at IS NULL AND (pr.store_id IN (SELECT id FROM stores) OR (pr.store_id IS NULL AND pr.merchant_id IN (SELECT owner_id FROM stores)))), 0) as "totalProducts",
      COALESCE((SELECT COUNT(*)::int FROM groups g WHERE g.store_id IN (SELECT id FROM stores) OR (g.store_id IS NULL AND g.merchant_id IN (SELECT owner_id FROM stores))), 0) as "totalGroups",
      COALESCE((SELECT COUNT(*)::int FROM groups g WHERE (g.store_id IN (SELECT id FROM stores) OR (g.store_id IS NULL AND g.merchant_id IN (SELECT owner_id FROM stores))) AND g.status = 'active'), 0) as "activeGroups"
    FROM stores s
  `)
  return stats || { total: 0, active: 0, inactive: 0, totalProducts: 0, totalGroups: 0, activeGroups: 0 }
}

// ── List Stores (Paginated) ──────────────────────────────────────

export async function getStores(params: GetStoresParams) {
  await requireAdmin()

  const { page = 1, pageSize = 25, search, status } = params
  const offset = (page - 1) * pageSize

  const conditions: string[] = []
  const queryParams: unknown[] = [pageSize, offset]
  let paramIndex = 3

  if (search) {
    conditions.push(`(
      s.name->>'en' ILIKE $${paramIndex}
      OR s.name->>'ar' ILIKE $${paramIndex}
      OR s.slug ILIKE $${paramIndex}
      OR s.email ILIKE $${paramIndex}
      OR p.first_name ILIKE $${paramIndex}
      OR p.last_name ILIKE $${paramIndex}
      OR p.email ILIKE $${paramIndex}
      OR p.custom_id ILIKE $${paramIndex}
    )`)
    queryParams.push(`%${search}%`)
    paramIndex++
  }

  if (status && status !== 'all') {
    conditions.push(`s.status = $${paramIndex}`)
    queryParams.push(status)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total
     FROM stores s
     LEFT JOIN profiles p ON s.owner_id = p.id
     ${whereClause}`,
    queryParams.slice(2),
  )) || { total: 0 }

  const items = await query<StoreRow>(
    `SELECT
      s.id,
      s.slug,
      s.name->>'en' as "nameEn",
      s.name->>'ar' as "nameAr",
      s.email,
      s.phone,
      s.status,
      s.commission_rate::float as "commissionRate",
      s.vat_applicable as "vatApplicable",
      s.vat_rate::float as "vatRate",
      s.created_at as "createdAt",
      CONCAT(p.first_name, ' ', p.last_name) as "ownerName",
      p.email as "ownerEmail",
      p.id as "ownerId",
      p.custom_id as "ownerCustomId",
      (SELECT COUNT(*)::int FROM products pr WHERE pr.deleted_at IS NULL AND (pr.store_id = s.id OR (pr.store_id IS NULL AND pr.merchant_id = s.owner_id))) as "productCount",
      (SELECT COUNT(*)::int FROM groups g WHERE g.store_id = s.id OR (g.store_id IS NULL AND g.merchant_id = s.owner_id)) as "groupCount",
      (SELECT COUNT(*)::int FROM groups g WHERE (g.store_id = s.id OR (g.store_id IS NULL AND g.merchant_id = s.owner_id)) AND g.status = 'active') as "activeGroupCount"
    FROM stores s
    LEFT JOIN profiles p ON s.owner_id = p.id
    ${whereClause}
    ORDER BY s.created_at DESC
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

// ── Get Single Store ─────────────────────────────────────────────

export async function getStoreById(id: string): Promise<StoreDetail | null> {
  await requireAdmin()

  return queryOne<StoreDetail>(
    `SELECT
      s.id,
      s.slug,
      s.name->>'en' as "nameEn",
      s.name->>'ar' as "nameAr",
      s.description->>'en' as "descriptionEn",
      s.description->>'ar' as "descriptionAr",
      s.email,
      s.phone,
      s.address,
      s.logo,
      s.cover_image as "coverImage",
      s.social_links as "socialLinks",
      s.commission_rate::float as "commissionRate",
      s.vat_applicable as "vatApplicable",
      s.vat_rate::float as "vatRate",
      s.status,
      s.created_at as "createdAt",
      s.updated_at as "updatedAt",
      p.id as "ownerId",
      CONCAT(p.first_name, ' ', p.last_name) as "ownerName",
      p.email as "ownerEmail",
      p.custom_id as "ownerCustomId",
      p.role as "ownerRole",
      p.is_vip as "ownerIsVip"
    FROM stores s
    LEFT JOIN profiles p ON s.owner_id = p.id
    WHERE s.id = $1`,
    [id],
  )
}

// ── Store Products (Paginated) ───────────────────────────────────

export async function getStoreProducts(storeId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total
     FROM products pr
     JOIN stores st ON st.id = $1
     WHERE pr.deleted_at IS NULL
       AND (pr.store_id = $1 OR (pr.store_id IS NULL AND pr.merchant_id = st.owner_id))`,
    [storeId],
  )) || { total: 0 }

  const items = await query<StoreProductRow>(
    `SELECT
      pr.id,
      pr.slug,
      pr.name->>'en' as "nameEn",
      pr.sale_type as "saleType",
      pr.status,
      pr.price::float,
      pr.current_bid::float as "currentBid",
      pr.bid_count as "bidCount",
      g.name->>'en' as "groupName",
      c.name->>'en' as "categoryName",
      pr.created_at as "createdAt"
    FROM products pr
    JOIN stores st ON st.id = $1
    LEFT JOIN groups g ON pr.group_id = g.id
    LEFT JOIN categories c ON pr.category_id = c.id
    WHERE pr.deleted_at IS NULL
      AND (pr.store_id = $1 OR (pr.store_id IS NULL AND pr.merchant_id = st.owner_id))
    ORDER BY pr.created_at DESC
    LIMIT $2 OFFSET $3`,
    [storeId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── Store Groups (Paginated) ─────────────────────────────────────

export async function getStoreGroups(storeId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total
     FROM groups g
     JOIN stores st ON st.id = $1
     WHERE g.store_id = $1 OR (g.store_id IS NULL AND g.merchant_id = st.owner_id)`,
    [storeId],
  )) || { total: 0 }

  const items = await query<StoreGroupRow>(
    `SELECT
      g.id,
      g.name->>'en' as "nameEn",
      g.name->>'ar' as "nameAr",
      g.status,
      g.start_date as "startDate",
      g.end_date as "endDate",
      g.min_deposit::float as "minDeposit",
      (SELECT COUNT(*)::int FROM products WHERE group_id = g.id AND deleted_at IS NULL) as "productCount",
      (SELECT COUNT(*)::int FROM auction_registrations WHERE group_id = g.id) as "registrationCount",
      g.created_at as "createdAt"
    FROM groups g
    JOIN stores st ON st.id = $1
    WHERE g.store_id = $1 OR (g.store_id IS NULL AND g.merchant_id = st.owner_id)
    ORDER BY g.created_at DESC
    LIMIT $2 OFFSET $3`,
    [storeId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── Store Orders (Paginated) ─────────────────────────────────────

export async function getStoreOrders(storeId: string, page = 1, pageSize = 20) {
  await requireAdmin()

  const offset = (page - 1) * pageSize

  // Get the merchant profile id from the store
  const store = await queryOne<{ ownerId: string }>(
    `SELECT owner_id as "ownerId" FROM stores WHERE id = $1`,
    [storeId],
  )
  if (!store) return { items: [], total: 0, page, pageSize, totalPages: 0 }

  const { total } = (await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int as total FROM orders WHERE merchant_id = $1`,
    [store.ownerId],
  )) || { total: 0 }

  const items = await query<StoreOrderRow>(
    `SELECT
      o.id,
      o.order_number as "orderNumber",
      pr.name->>'en' as "productName",
      CONCAT(up.first_name, ' ', up.last_name) as "buyerName",
      o.type,
      o.status,
      o.payment_status as "paymentStatus",
      o.total_amount::float as "totalAmount",
      o.created_at as "createdAt"
    FROM orders o
    LEFT JOIN products pr ON o.product_id = pr.id
    LEFT JOIN profiles up ON o.user_id = up.id
    WHERE o.merchant_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3`,
    [store.ownerId, pageSize, offset],
  )

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ── Create Store ─────────────────────────────────────────────────

export async function createStore(data: {
  ownerId: string
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn?: string
  descriptionAr?: string
  email?: string
  phone?: string
  address?: string
  commissionRate?: number
  vatApplicable?: boolean
  vatRate?: number
}) {
  await requireAdmin()

  // Validate slug uniqueness
  const existing = await queryOne<{ id: string }>(`SELECT id FROM stores WHERE slug = $1`, [data.slug])
  if (existing) return { error: 'Slug already exists' }

  // Validate owner exists and is a merchant
  const owner = await queryOne<{ role: string }>(`SELECT role FROM profiles WHERE id = $1`, [data.ownerId])
  if (!owner) return { error: 'Owner not found' }

  const name = JSON.stringify({ en: data.nameEn, ar: data.nameAr })
  const description = JSON.stringify({ en: data.descriptionEn || '', ar: data.descriptionAr || '' })

  await pool.query(
    `INSERT INTO stores (owner_id, slug, name, description, email, phone, address, commission_rate, vat_applicable, vat_rate)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
    [
      data.ownerId,
      data.slug,
      name,
      description,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.commissionRate ?? 0,
      data.vatApplicable ?? false,
      data.vatRate ?? 5,
    ],
  )

  // Ensure owner has merchant role
  if (owner.role === 'customer') {
    await pool.query(`UPDATE profiles SET role = 'merchant', updated_at = NOW() WHERE id = $1`, [data.ownerId])
  }

  revalidatePath('/stores')
  return {}
}

// ── Update Store ─────────────────────────────────────────────────

export async function updateStore(
  id: string,
  data: {
    nameEn?: string
    nameAr?: string
    descriptionEn?: string
    descriptionAr?: string
    email?: string
    phone?: string
    address?: string
    commissionRate?: number
    vatApplicable?: boolean
    vatRate?: number
    status?: string
  },
) {
  await requireAdmin()

  const sets: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.nameEn !== undefined || data.nameAr !== undefined) {
    // Get current name
    const current = await queryOne<{ name: { en: string; ar: string } }>(
      `SELECT name FROM stores WHERE id = $1`,
      [id],
    )
    const name = current?.name || { en: '', ar: '' }
    if (data.nameEn !== undefined) name.en = data.nameEn
    if (data.nameAr !== undefined) name.ar = data.nameAr
    sets.push(`name = $${paramIndex}::jsonb`)
    params.push(JSON.stringify(name))
    paramIndex++
  }

  if (data.descriptionEn !== undefined || data.descriptionAr !== undefined) {
    const current = await queryOne<{ description: { en: string; ar: string } }>(
      `SELECT description FROM stores WHERE id = $1`,
      [id],
    )
    const desc = current?.description || { en: '', ar: '' }
    if (data.descriptionEn !== undefined) desc.en = data.descriptionEn
    if (data.descriptionAr !== undefined) desc.ar = data.descriptionAr
    sets.push(`description = $${paramIndex}::jsonb`)
    params.push(JSON.stringify(desc))
    paramIndex++
  }

  const simpleFields: Record<string, string> = {
    email: 'email',
    phone: 'phone',
    address: 'address',
    commissionRate: 'commission_rate',
    vatApplicable: 'vat_applicable',
    vatRate: 'vat_rate',
    status: 'status',
  }

  for (const [key, col] of Object.entries(simpleFields)) {
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
    `UPDATE stores SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    params,
  )

  revalidatePath('/stores')
  revalidatePath(`/stores/${id}`)
  return {}
}

// ── Update Store Status ──────────────────────────────────────────

export async function updateStoreStatus(id: string, status: string) {
  await requireAdmin()

  const validStatuses = ['active', 'inactive']
  if (!validStatuses.includes(status)) return { error: 'Invalid status' }

  await pool.query(
    `UPDATE stores SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id],
  )

  revalidatePath('/stores')
  revalidatePath(`/stores/${id}`)
  return {}
}

// ── Delete Store ─────────────────────────────────────────────────

export async function deleteStore(id: string) {
  await requireAdmin()

  // Check if store has products
  const { count } = (await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int as count FROM products WHERE store_id = $1 AND deleted_at IS NULL`,
    [id],
  )) || { count: 0 }

  if (count > 0) {
    return { error: `Cannot delete store with ${count} active products. Remove products first.` }
  }

  await pool.query(`DELETE FROM stores WHERE id = $1`, [id])

  revalidatePath('/stores')
  return {}
}

// ── Get Merchants for Dropdown ───────────────────────────────────

export async function getMerchantDropdown() {
  await requireAdmin()

  return query<{ id: string; name: string; email: string; customId: string }>(
    `SELECT
      id,
      CONCAT(first_name, ' ', last_name) as name,
      email,
      custom_id as "customId"
    FROM profiles
    WHERE role IN ('merchant', 'admin', 'super_admin')
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY first_name, last_name`,
  )
}
