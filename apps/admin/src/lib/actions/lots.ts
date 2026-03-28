'use server'

import { revalidatePath } from 'next/cache'
import { query, queryOne, pool } from '@mzadat/db'
import { requireAdmin } from '@/lib/auth'
import { getSignedImageUrls } from '@/lib/actions/images'
import { toMuscatDateTimeLocal, parseMuscatDateTime } from '@/lib/timezone'

// ── Row type (listing) ──────────────────────────────────────────

export interface LotRow {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  featureImage: string | null
  featureImageUrl: string | null
  categoryId: string | null
  categoryNameEn: string | null
  merchantId: string
  merchantName: string
  saleType: string
  status: string
  price: number
  minBidPrice: number
  quantity: number
  startDate: Date | null
  endDate: Date | null
  ordersCount: number
  bidsCount: number
  createdAt: Date
}

// ── Detail type (edit form) ─────────────────────────────────────

export interface LotDetail {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  shortDescriptionEn: string
  shortDescriptionAr: string
  featureImage: string | null
  featureImageUrl: string | null
  galleryImages: string[]
  galleryDisplayUrls: string[]
  categoryId: string | null
  groupId: string | null
  merchantId: string
  storeId: string | null
  quantity: number
  location: string
  inspectionNotes: string
  saleType: 'auction' | 'direct'
  scheduleType: 'default' | 'scheduled'
  minDeposit: number
  minDepositType: 'fixed' | 'percentage'
  minBidPrice: number
  reservePrice: number | null
  bidIncrement1: number
  bidIncrement2: number | null
  bidIncrement3: number | null
  bidIncrement4: number | null
  price: number
  salePrice: number | null
  startDate: string | null
  endDate: string | null
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'closed'
  specifications: SpecificationRow[]
}

export interface SpecificationRow {
  id?: string
  labelEn: string
  labelAr: string
  valueEn: string
  valueAr: string
  sortOrder: number
}

// ── Form data (create/update) ───────────────────────────────────

export interface LotFormData {
  slug: string
  nameEn: string
  nameAr: string
  descriptionEn?: string
  descriptionAr?: string
  shortDescriptionEn?: string
  shortDescriptionAr?: string
  featureImage?: string
  useNoImage?: boolean
  galleryImages?: string[]
  categoryId?: string
  groupId?: string
  storeId?: string
  quantity: number
  location: string
  inspectionNotes?: string
  saleType: 'auction' | 'direct'
  scheduleType: 'default' | 'scheduled'
  minDeposit: string
  minDepositType: 'fixed' | 'percentage'
  minBidPrice: string
  reservePrice?: string
  bidIncrement1: string
  bidIncrement2?: string
  bidIncrement3?: string
  bidIncrement4?: string
  price: string
  salePrice?: string
  startDate?: string
  endDate?: string
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'closed'
  specifications?: SpecificationRow[]
}

// ── Dropdown option types ───────────────────────────────────────

export interface DropdownOption {
  id: string
  nameEn: string
}

export interface MerchantOption {
  id: string
  name: string
  email: string
}

export interface StoreOption {
  id: string
  nameEn: string
  ownerId: string
}

export interface GroupOption {
  id: string
  nameEn: string
  merchantId: string
  storeId: string | null
  minDeposit: number
  startDate: string
  endDate: string
}

// ── Combined page data loader (single auth check) ──────────────

export async function getLotsPageData() {
  const [, data, stats, dropdowns] = await Promise.all([
    requireAdmin(),
    getLotsInternal({ page: 1, perPage: 20 }),
    getLotStatsInternal(),
    getLotDropdownsInternal(),
  ])
  return { data, stats, dropdowns }
}

// ── Lookups for dropdowns ───────────────────────────────────────

export async function getLotDropdowns() {
  const [, result] = await Promise.all([
    requireAdmin(),
    getLotDropdownsInternal(),
  ])
  return result
}

async function getLotDropdownsInternal() {
  const [catRows, merchantRows, groupRows, storeRows] = await Promise.all([
    query<{ id: string; name: Record<string, string> }>(`
      SELECT id, name FROM categories WHERE status = 'active'
      ORDER BY sort_order ASC, created_at ASC
    `),
    query<{ id: string; first_name: string; last_name: string; email: string }>(`
      SELECT id, first_name, last_name, email FROM profiles
      WHERE role IN ('merchant', 'admin', 'super_admin') AND status = 'active'
      ORDER BY created_at ASC
    `),
    query<{ id: string; name: Record<string, string>; merchant_id: string; store_id: string | null; min_deposit: string; start_date: string; end_date: string }>(`
      SELECT id, name, merchant_id, store_id, min_deposit::text, start_date, end_date
      FROM groups WHERE status IN ('upcoming', 'active')
      ORDER BY created_at DESC
    `),
    query<{ id: string; name: Record<string, string>; owner_id: string }>(`
      SELECT id, name, owner_id FROM stores WHERE status = 'active'
      ORDER BY created_at ASC
    `),
  ])

  return {
    categories: catRows.map((c) => ({
      id: c.id,
      nameEn: (c.name as Record<string, string>)?.en ?? '',
    })) as DropdownOption[],
    merchants: merchantRows.map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      email: m.email,
    })) as MerchantOption[],
    groups: groupRows.map((g) => ({
      id: g.id,
      nameEn: (g.name as Record<string, string>)?.en ?? '',
      merchantId: g.merchant_id,
      storeId: g.store_id,
      minDeposit: Number(g.min_deposit),
      startDate: g.start_date ? toMuscatDateTimeLocal(g.start_date) : '',
      endDate: g.end_date ? toMuscatDateTimeLocal(g.end_date) : '',
    })) as GroupOption[],
    stores: storeRows.map((s) => ({
      id: s.id,
      nameEn: (s.name as Record<string, string>)?.en ?? '',
      ownerId: s.owner_id,
    })) as StoreOption[],
  }
}

// ── Filters & Pagination types ──────────────────────────────────

export interface LotFilters {
  search?: string
  status?: string
  saleType?: string
  merchantId?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  perPage?: number
}

export interface LotListResult {
  rows: LotRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface LotStats {
  total: number
  published: number
  auction: number
  direct: number
  totalBids: number
  totalOrders: number
  totalRevenue: number
  draft: number
}

// ── Stats ────────────────────────────────────────────────────────

export async function getLotStats(): Promise<LotStats> {
  const [, result] = await Promise.all([
    requireAdmin(),
    getLotStatsInternal(),
  ])
  return result
}

async function getLotStatsInternal(): Promise<LotStats> {
  const row = await queryOne<{
    total: string
    published: string
    auction: string
    direct: string
    draft: string
    total_orders: string
    total_revenue: string
    total_bids: string
  }>(`
    SELECT
      (SELECT count(*) FROM products WHERE deleted_at IS NULL)::text AS total,
      (SELECT count(*) FROM products WHERE deleted_at IS NULL AND status = 'published')::text AS published,
      (SELECT count(*) FROM products WHERE deleted_at IS NULL AND sale_type = 'auction')::text AS auction,
      (SELECT count(*) FROM products WHERE deleted_at IS NULL AND sale_type = 'direct')::text AS direct,
      (SELECT count(*) FROM products WHERE deleted_at IS NULL AND status = 'draft')::text AS draft,
      (SELECT count(*) FROM orders)::text AS total_orders,
      (SELECT coalesce(sum(price), 0) FROM products WHERE deleted_at IS NULL)::text AS total_revenue,
      (SELECT count(DISTINCT user_id) FROM bid_history WHERE deleted_at IS NULL)::text AS total_bids
  `)

  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    auction: Number(row?.auction ?? 0),
    direct: Number(row?.direct ?? 0),
    draft: Number(row?.draft ?? 0),
    totalBids: Number(row?.total_bids ?? 0),
    totalOrders: Number(row?.total_orders ?? 0),
    totalRevenue: Number(row?.total_revenue ?? 0),
  }
}

// ── List (with filters & pagination) ─────────────────────────────

export async function getLots(filters: LotFilters = {}): Promise<LotListResult> {
  const [, result] = await Promise.all([
    requireAdmin(),
    getLotsInternal(filters),
  ])
  return result
}

async function getLotsInternal(filters: LotFilters = {}): Promise<LotListResult> {
  const {
    search,
    status,
    saleType,
    merchantId,
    categoryId,
    dateFrom,
    dateTo,
    page = 1,
    perPage = 20,
  } = filters

  const conditions: string[] = ['pr.deleted_at IS NULL']
  const params: unknown[] = []
  let idx = 1

  if (status && status !== 'all') {
    conditions.push(`pr.status = $${idx++}`)
    params.push(status)
  }
  if (saleType && saleType !== 'all') {
    conditions.push(`pr.sale_type = $${idx++}`)
    params.push(saleType)
  }
  if (merchantId && merchantId !== 'all') {
    conditions.push(`pr.merchant_id = $${idx++}`)
    params.push(merchantId)
  }
  if (categoryId && categoryId !== 'all') {
    conditions.push(`pr.category_id = $${idx++}`)
    params.push(categoryId)
  }
  if (dateFrom) {
    conditions.push(`pr.created_at >= $${idx++}`)
    params.push(new Date(dateFrom).toISOString())
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    conditions.push(`pr.created_at <= $${idx++}`)
    params.push(end.toISOString())
  }
  if (search?.trim()) {
    const s = `%${search.trim()}%`
    conditions.push(`(pr.slug ILIKE $${idx} OR pr.name->>'en' ILIKE $${idx} OR pr.name->>'ar' ILIKE $${idx})`)
    params.push(s)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * perPage

  const [countRow, rows] = await Promise.all([
    queryOne<{ total: string }>(`SELECT count(*)::text AS total FROM products pr ${where}`, params),
    query<{
      id: string; slug: string; name: Record<string, string>; feature_image: string | null
      category_id: string | null; merchant_id: string
      sale_type: string; status: string; price: string; min_bid_price: string
      quantity: number; start_date: string | null; end_date: string | null
      bid_count: number; created_at: string
      category_name: Record<string, string> | null
      merchant_first: string | null; merchant_last: string | null
      orders_count: string; bids_count: string
    }>(`
      SELECT
        pr.id, pr.slug, pr.name, pr.feature_image, pr.category_id, pr.merchant_id,
        pr.sale_type, pr.status, pr.price::text, pr.min_bid_price::text,
        pr.quantity, pr.start_date, pr.end_date, pr.bid_count, pr.created_at,
        c.name AS category_name,
        p.first_name AS merchant_first, p.last_name AS merchant_last,
        (SELECT count(*) FROM orders o WHERE o.product_id = pr.id)::text AS orders_count,
        (SELECT count(DISTINCT bh.user_id) FROM bid_history bh WHERE bh.product_id = pr.id AND bh.deleted_at IS NULL)::text AS bids_count
      FROM products pr
      LEFT JOIN categories c ON c.id = pr.category_id
      LEFT JOIN profiles p ON p.id = pr.merchant_id
      ${where}
      ORDER BY pr.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, perPage, offset]),
  ])

  const total = Number(countRow?.total ?? 0)

  // Sign image URLs
  const pathsToSign = rows
    .map((r) => r.feature_image)
    .filter((p): p is string => !!p && !p.startsWith('/'))

  const signedUrls = pathsToSign.length > 0
    ? await getSignedImageUrls(pathsToSign)
    : []

  const urlMap = new Map(pathsToSign.map((p, i) => [p, signedUrls[i] ?? '']))

  return {
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameEn: (r.name as Record<string, string>)?.en ?? '',
      nameAr: (r.name as Record<string, string>)?.ar ?? '',
      featureImage: r.feature_image,
      featureImageUrl: r.feature_image
        ? r.feature_image.startsWith('/') ? r.feature_image : (urlMap.get(r.feature_image) ?? null)
        : null,
      categoryId: r.category_id,
      categoryNameEn: r.category_name ? (r.category_name as Record<string, string>)?.en ?? null : null,
      merchantId: r.merchant_id,
      merchantName: r.merchant_first ? `${r.merchant_first} ${r.merchant_last}` : '',
      saleType: r.sale_type,
      status: r.status,
      price: Number(r.price),
      minBidPrice: Number(r.min_bid_price),
      quantity: r.quantity,
      startDate: r.start_date ? new Date(r.start_date) : null,
      endDate: r.end_date ? new Date(r.end_date) : null,
      ordersCount: Number(r.orders_count),
      bidsCount: Number(r.bids_count),
      createdAt: new Date(r.created_at),
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

// ── Get single lot for editing ──────────────────────────────────

export async function getLot(id: string): Promise<LotDetail | null> {
  await requireAdmin()

  const [r, galleryRows, specRows] = await Promise.all([
    queryOne<Record<string, any>>(`SELECT * FROM products WHERE id = $1`, [id]),
    query<{ image: string }>(`
      SELECT image FROM product_galleries WHERE product_id = $1 ORDER BY sort_order ASC
    `, [id]),
    query<{ id: string; label: Record<string, string>; value: Record<string, string>; sort_order: number }>(`
      SELECT id, label, value, sort_order FROM product_specifications
      WHERE product_id = $1 ORDER BY sort_order ASC
    `, [id]),
  ])

  if (!r) return null

  const name = (r.name ?? {}) as Record<string, string>
  const desc = (r.description ?? {}) as Record<string, string>
  const shortDesc = (r.short_description ?? {}) as Record<string, string>

  const galleryPaths = galleryRows.map((g) => g.image)
  const allPaths: string[] = []
  const featureIsPath = r.feature_image && !r.feature_image.startsWith('/')
  if (featureIsPath) allPaths.push(r.feature_image!)
  allPaths.push(...galleryPaths.filter((p: string) => !p.startsWith('/')))

  const signedUrls = allPaths.length > 0 ? await getSignedImageUrls(allPaths) : []
  const urlMap = new Map(allPaths.map((p, i) => [p, signedUrls[i] ?? '']))

  const featureImageUrl = r.feature_image
    ? r.feature_image.startsWith('/') ? r.feature_image : (urlMap.get(r.feature_image) ?? null)
    : null

  const galleryDisplayUrls = galleryPaths.map((p: string) =>
    p.startsWith('/') ? p : (urlMap.get(p) ?? ''),
  )

  return {
    id: r.id,
    slug: r.slug,
    nameEn: name?.en ?? '',
    nameAr: name?.ar ?? '',
    descriptionEn: desc?.en ?? '',
    descriptionAr: desc?.ar ?? '',
    shortDescriptionEn: shortDesc?.en ?? '',
    shortDescriptionAr: shortDesc?.ar ?? '',
    featureImage: r.feature_image,
    featureImageUrl,
    galleryImages: galleryPaths,
    galleryDisplayUrls,
    categoryId: r.category_id,
    groupId: r.group_id,
    merchantId: r.merchant_id,
    storeId: r.store_id ?? null,
    quantity: r.quantity,
    location: r.location ?? '',
    inspectionNotes: r.inspection_notes ?? '',
    saleType: r.sale_type as 'auction' | 'direct',
    scheduleType: r.schedule_type as 'default' | 'scheduled',
    minDeposit: Number(r.min_deposit),
    minDepositType: r.min_deposit_type as 'fixed' | 'percentage',
    minBidPrice: Number(r.min_bid_price),
    reservePrice: r.reserve_price ? Number(r.reserve_price) : null,
    bidIncrement1: Number(r.bid_increment_1),
    bidIncrement2: r.bid_increment_2 ? Number(r.bid_increment_2) : null,
    bidIncrement3: r.bid_increment_3 ? Number(r.bid_increment_3) : null,
    bidIncrement4: r.bid_increment_4 ? Number(r.bid_increment_4) : null,
    price: Number(r.price),
    salePrice: r.sale_price ? Number(r.sale_price) : null,
    startDate: r.start_date ? toMuscatDateTimeLocal(r.start_date) : null,
    endDate: r.end_date ? toMuscatDateTimeLocal(r.end_date) : null,
    status: r.status as LotDetail['status'],
    specifications: specRows.map((s) => ({
      id: s.id,
      labelEn: (s.label as Record<string, string>)?.en ?? '',
      labelAr: (s.label as Record<string, string>)?.ar ?? '',
      valueEn: (s.value as Record<string, string>)?.en ?? '',
      valueAr: (s.value as Record<string, string>)?.ar ?? '',
      sortOrder: s.sort_order,
    })),
  }
}

// ── Create ──────────────────────────────────────────────────────

export async function createLot(
  merchantId: string,
  data: LotFormData,
): Promise<{ error?: string; id?: string }> {
  await requireAdmin()

  if (!data.slug || !data.nameEn) return { error: 'Slug and English name are required.' }
  if (!merchantId) return { error: 'Merchant is required.' }
  if (!data.location?.trim()) return { error: 'Location is required.' }

  // ── Resolve effective dates + merchant + store from group ──────
  let effectiveStartDate: Date | null = data.startDate ? parseMuscatDateTime(data.startDate) : null
  let effectiveEndDate: Date | null = data.endDate ? parseMuscatDateTime(data.endDate) : null
  let effectiveScheduleType = data.scheduleType
  let effectiveMerchantId = merchantId
  let effectiveStoreId: string | null = data.storeId || null

  if (data.groupId) {
    const group = await queryOne<{ start_date: string; end_date: string; merchant_id: string; store_id: string | null }>(
      `SELECT start_date, end_date, merchant_id, store_id FROM groups WHERE id = $1`, [data.groupId],
    )
    if (!group) return { error: 'Selected group not found.' }
    effectiveStartDate = new Date(group.start_date)
    effectiveEndDate = new Date(group.end_date)
    effectiveScheduleType = 'scheduled'
    effectiveMerchantId = group.merchant_id
    effectiveStoreId = group.store_id
  } else if (data.scheduleType === 'scheduled') {
    if (!data.startDate || !data.endDate) {
      return { error: 'Start date and end date are required for scheduled lots.' }
    }
    if (effectiveEndDate && effectiveStartDate && effectiveEndDate <= effectiveStartDate) {
      return { error: 'End date must be after start date.' }
    }
  }

  if (!effectiveStoreId) return { error: 'Store is required.' }

  const NO_IMAGE_PATH = '/Image_not_available.png'
  let featureImageUrl = data.featureImage?.trim() || null
  if (data.useNoImage) featureImageUrl = NO_IMAGE_PATH

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: [product] } = await client.query<{ id: string }>(`
      INSERT INTO products (
        merchant_id, store_id, slug, name, description, short_description,
        feature_image, category_id, group_id, quantity, location, inspection_notes,
        sale_type, schedule_type, min_deposit, min_deposit_type,
        min_bid_price, reserve_price, bid_increment_1, bid_increment_2,
        bid_increment_3, bid_increment_4, price, sale_price,
        start_date, end_date, original_end_date, status
      ) VALUES (
        $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, $26, $26, $27
      ) RETURNING id
    `, [
      effectiveMerchantId,
      effectiveStoreId,
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      JSON.stringify({ en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' }),
      JSON.stringify({ en: data.shortDescriptionEn?.trim() ?? '', ar: data.shortDescriptionAr?.trim() ?? '' }),
      featureImageUrl,
      data.categoryId || null,
      data.groupId || null,
      data.quantity ?? 1,
      data.location.trim(),
      data.inspectionNotes?.trim() || null,
      data.saleType,
      effectiveScheduleType,
      data.minDeposit || '0',
      data.minDepositType ?? 'fixed',
      data.minBidPrice || '0',
      data.reservePrice || null,
      data.bidIncrement1 || '1',
      data.bidIncrement2 || null,
      data.bidIncrement3 || null,
      data.bidIncrement4 || null,
      data.price || '0',
      data.salePrice || null,
      effectiveStartDate,
      effectiveEndDate,
      data.status,
    ])

    if (data.galleryImages?.length) {
      const values: string[] = []
      const galleryParams: unknown[] = []
      let gIdx = 1
      for (let i = 0; i < data.galleryImages.length; i++) {
        values.push(`($${gIdx++}, $${gIdx++}, $${gIdx++})`)
        galleryParams.push(product.id, data.galleryImages[i], i)
      }
      await client.query(
        `INSERT INTO product_galleries (product_id, image, sort_order) VALUES ${values.join(', ')}`,
        galleryParams,
      )
    }

    if (data.specifications?.length) {
      const specs = data.specifications.filter((s) => s.labelEn.trim() || s.valueEn.trim())
      if (specs.length) {
        const values: string[] = []
        const specParams: unknown[] = []
        let sIdx = 1
        for (let i = 0; i < specs.length; i++) {
          values.push(`($${sIdx++}, $${sIdx++}::jsonb, $${sIdx++}::jsonb, $${sIdx++})`)
          specParams.push(
            product.id,
            JSON.stringify({ en: specs[i].labelEn.trim(), ar: specs[i].labelAr.trim() }),
            JSON.stringify({ en: specs[i].valueEn.trim(), ar: specs[i].valueAr.trim() }),
            i,
          )
        }
        await client.query(
          `INSERT INTO product_specifications (product_id, label, value, sort_order) VALUES ${values.join(', ')}`,
          specParams,
        )
      }
    }

    await client.query('COMMIT')
    revalidatePath('/products')
    return { id: product.id }
  } catch (err: any) {
    await client.query('ROLLBACK')
    if (err?.code === '23505' && err?.constraint?.includes('slug')) {
      return { error: `Slug "${data.slug}" is already taken.` }
    }
    console.error('[createLot]', err)
    return { error: 'Failed to create lot.' }
  } finally {
    client.release()
  }
}

// ── Update ──────────────────────────────────────────────────────

export async function updateLot(
  id: string,
  merchantId: string,
  data: LotFormData,
): Promise<{ error?: string }> {
  await requireAdmin()

  if (!data.slug || !data.nameEn) return { error: 'Slug and English name are required.' }
  if (!data.location?.trim()) return { error: 'Location is required.' }

  // ── Resolve effective dates + merchant + store ────────────────
  let effectiveStartDate: Date | null = data.startDate ? parseMuscatDateTime(data.startDate) : null
  let effectiveEndDate: Date | null = data.endDate ? parseMuscatDateTime(data.endDate) : null
  let effectiveScheduleType = data.scheduleType
  let effectiveMerchantId = merchantId
  let effectiveStoreId: string | null = data.storeId || null

  if (data.groupId) {
    const group = await queryOne<{ start_date: string; end_date: string; merchant_id: string; store_id: string | null }>(
      `SELECT start_date, end_date, merchant_id, store_id FROM groups WHERE id = $1`, [data.groupId],
    )
    if (!group) return { error: 'Selected group not found.' }
    effectiveStartDate = new Date(group.start_date)
    effectiveEndDate = new Date(group.end_date)
    effectiveScheduleType = 'scheduled'
    effectiveMerchantId = group.merchant_id
    effectiveStoreId = group.store_id
  } else if (data.scheduleType === 'scheduled') {
    if (!data.startDate || !data.endDate) {
      return { error: 'Start date and end date are required for scheduled lots.' }
    }
    if (effectiveEndDate && effectiveStartDate && effectiveEndDate <= effectiveStartDate) {
      return { error: 'End date must be after start date.' }
    }
  }

  if (!effectiveStoreId) return { error: 'Store is required.' }

  const NO_IMAGE_PATH = '/Image_not_available.png'
  let featureImageUrl = data.featureImage?.trim() || null
  if (data.useNoImage) featureImageUrl = NO_IMAGE_PATH

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      UPDATE products SET
        merchant_id = $1, store_id = $2, slug = $3, name = $4::jsonb,
        description = $5::jsonb, short_description = $6::jsonb,
        feature_image = $7, category_id = $8, group_id = $9,
        quantity = $10, location = $11, inspection_notes = $12,
        sale_type = $13, schedule_type = $14,
        min_deposit = $15, min_deposit_type = $16,
        min_bid_price = $17, reserve_price = $18,
        bid_increment_1 = $19, bid_increment_2 = $20,
        bid_increment_3 = $21, bid_increment_4 = $22,
        price = $23, sale_price = $24,
        start_date = $25, end_date = $26, original_end_date = $26,
        status = $27, updated_at = NOW()
      WHERE id = $28
    `, [
      effectiveMerchantId,
      effectiveStoreId,
      data.slug.trim().toLowerCase(),
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' }),
      JSON.stringify({ en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' }),
      JSON.stringify({ en: data.shortDescriptionEn?.trim() ?? '', ar: data.shortDescriptionAr?.trim() ?? '' }),
      featureImageUrl,
      data.categoryId || null,
      data.groupId || null,
      data.quantity ?? 1,
      data.location.trim(),
      data.inspectionNotes?.trim() || null,
      data.saleType,
      effectiveScheduleType,
      data.minDeposit || '0',
      data.minDepositType ?? 'fixed',
      data.minBidPrice || '0',
      data.reservePrice || null,
      data.bidIncrement1 || '1',
      data.bidIncrement2 || null,
      data.bidIncrement3 || null,
      data.bidIncrement4 || null,
      data.price || '0',
      data.salePrice || null,
      effectiveStartDate,
      effectiveEndDate,
      data.status,
      id,
    ])

    if (data.galleryImages !== undefined) {
      await client.query(`DELETE FROM product_galleries WHERE product_id = $1`, [id])
      if (data.galleryImages.length > 0) {
        const values: string[] = []
        const galleryParams: unknown[] = []
        let gIdx = 1
        for (let i = 0; i < data.galleryImages.length; i++) {
          values.push(`($${gIdx++}, $${gIdx++}, $${gIdx++})`)
          galleryParams.push(id, data.galleryImages[i], i)
        }
        await client.query(
          `INSERT INTO product_galleries (product_id, image, sort_order) VALUES ${values.join(', ')}`,
          galleryParams,
        )
      }
    }

    if (data.specifications !== undefined) {
      await client.query(`DELETE FROM product_specifications WHERE product_id = $1`, [id])
      if (data.specifications.length > 0) {
        const specs = data.specifications
        const values: string[] = []
        const specParams: unknown[] = []
        let sIdx = 1
        for (let i = 0; i < specs.length; i++) {
          values.push(`($${sIdx++}, $${sIdx++}::jsonb, $${sIdx++}::jsonb, $${sIdx++})`)
          specParams.push(
            id,
            JSON.stringify({ en: specs[i].labelEn.trim(), ar: specs[i].labelAr.trim() }),
            JSON.stringify({ en: specs[i].valueEn.trim(), ar: specs[i].valueAr.trim() }),
            i,
          )
        }
        await client.query(
          `INSERT INTO product_specifications (product_id, label, value, sort_order) VALUES ${values.join(', ')}`,
          specParams,
        )
      }
    }

    await client.query('COMMIT')
    revalidatePath('/products')
    return {}
  } catch (err: any) {
    await client.query('ROLLBACK')
    if (err?.code === '23505' && err?.constraint?.includes('slug')) {
      return { error: `Slug "${data.slug}" is already taken.` }
    }
    console.error('[updateLot]', err)
    return { error: 'Failed to update lot.' }
  } finally {
    client.release()
  }
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteLot(id: string): Promise<{ error?: string }> {
  await requireAdmin()

  const [productRow, countRow] = await Promise.all([
    queryOne<{ id: string; name: Record<string, string> }>(
      `SELECT id, name FROM products WHERE id = $1`, [id],
    ),
    queryOne<{ orders: string; bids: string }>(`
      SELECT
        (SELECT count(*) FROM orders WHERE product_id = $1)::text AS orders,
        (SELECT count(*) FROM bid_history WHERE product_id = $1)::text AS bids
    `, [id]),
  ])

  if (!productRow) return { error: 'Lot not found.' }

  const lotName = (productRow.name as Record<string, string>)?.en ?? 'this lot'
  const orderCount = Number(countRow?.orders ?? 0)
  const bidCount = Number(countRow?.bids ?? 0)

  if (orderCount > 0) {
    return { error: `Cannot delete "${lotName}" — it has ${orderCount} order${orderCount === 1 ? '' : 's'}.` }
  }
  if (bidCount > 0) {
    return { error: `Cannot delete "${lotName}" — it has ${bidCount} bid${bidCount === 1 ? '' : 's'}.` }
  }

  try {
    await query(`UPDATE products SET deleted_at = NOW() WHERE id = $1`, [id])
  } catch (err) {
    console.error('[deleteLot]', err)
    return { error: 'Failed to delete lot.' }
  }

  revalidatePath('/products')
  return {}
}