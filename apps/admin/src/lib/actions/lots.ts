'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@mzadat/db'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getSignedImageUrl, getSignedImageUrls } from '@/lib/actions/images'
import { toMuscatDateTimeLocal, parseMuscatDateTime } from '@/lib/timezone'
// ── Row type (listing) ──────────────────────────────────────────

export interface LotRow {
  id: string
  slug: string
  nameEn: string
  nameAr: string
  featureImage: string | null
  /** Signed display URL for the feature image */
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
  /** Signed display URL for the feature image */
  featureImageUrl: string | null
  galleryImages: string[]
  /** Signed display URLs for gallery images */
  galleryDisplayUrls: string[]
  categoryId: string | null
  groupId: string | null
  merchantId: string
  quantity: number
  location: string
  inspectionNotes: string
  saleType: 'auction' | 'direct'
  scheduleType: 'default' | 'scheduled'
  // Auction fields
  minDeposit: number
  minDepositType: 'fixed' | 'percentage'
  minBidPrice: number
  reservePrice: number | null
  bidIncrement1: number
  bidIncrement2: number | null
  bidIncrement3: number | null
  bidIncrement4: number | null
  // Direct sale fields
  price: number
  salePrice: number | null
  // Schedule
  startDate: string | null
  endDate: string | null
  // Status
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'closed'
  // Specifications
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
  quantity: number
  location: string
  inspectionNotes?: string
  saleType: 'auction' | 'direct'
  scheduleType: 'default' | 'scheduled'
  // Auction — kept as strings to avoid JS float precision loss on Decimal(12,3)
  minDeposit: string
  minDepositType: 'fixed' | 'percentage'
  minBidPrice: string
  reservePrice?: string
  bidIncrement1: string
  bidIncrement2?: string
  bidIncrement3?: string
  bidIncrement4?: string
  // Direct sale
  price: string
  salePrice?: string
  // Schedule
  startDate?: string
  endDate?: string
  // Status
  status: 'draft' | 'pending' | 'published' | 'inactive' | 'closed'
  // Specifications
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

export interface GroupOption {
  id: string
  nameEn: string
  minDeposit: number
  startDate: string
  endDate: string
}

// ── Combined page data loader (single auth check) ──────────────

export async function getLotsPageData() {
  // Run auth in parallel with data queries — middleware already gates access,
  // so this is a redundant check. If auth fails, redirect() throws and
  // aborts the whole Promise.all (data never reaches the client).
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
  const sb = await createSupabaseServiceClient()

  const [catRes, merchantRes, groupRes] = await Promise.all([
    sb
      .from('categories')
      .select('id, name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('role', ['merchant', 'admin', 'super_admin'])
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    sb
      .from('groups')
      .select('id, name, min_deposit, start_date, end_date')
      .in('status', ['upcoming', 'active'])
      .order('created_at', { ascending: false }),
  ])

  const categories = (catRes.data ?? []) as Array<{ id: string; name: Record<string, string> }>
  const merchants = (merchantRes.data ?? []) as Array<{ id: string; first_name: string; last_name: string; email: string }>
  const groups = (groupRes.data ?? []) as Array<{ id: string; name: Record<string, string>; min_deposit: number; start_date: string; end_date: string }>

  return {
    categories: categories.map((c) => ({
      id: c.id,
      nameEn: (c.name as Record<string, string>)?.en ?? '',
    })) as DropdownOption[],
    merchants: merchants.map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      email: m.email,
    })) as MerchantOption[],
    groups: groups.map((g) => ({
      id: g.id,
      nameEn: (g.name as Record<string, string>)?.en ?? '',
      minDeposit: Number(g.min_deposit),
      startDate: g.start_date ? toMuscatDateTimeLocal(g.start_date) : '',
      endDate: g.end_date ? toMuscatDateTimeLocal(g.end_date) : '',
    })) as GroupOption[],
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
  const sb = await createSupabaseServiceClient()

  // All counts in parallel — each is a single HTTP call (no BEGIN/COMMIT overhead)
  const [totalRes, publishedRes, auctionRes, directRes, draftRes, bidRes, orderRes, revenueRes] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    sb.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
    sb.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('sale_type', 'auction'),
    sb.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('sale_type', 'direct'),
    sb.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'draft'),
    sb.from('bid_history').select('id', { count: 'exact', head: true }),
    sb.from('orders').select('id', { count: 'exact', head: true }),
    sb.from('products').select('price').is('deleted_at', null) as unknown as Promise<{ data: { price: number }[] | null }>,
  ])

  const totalRevenue = ((revenueRes as { data: { price: number }[] | null }).data ?? []).reduce((sum: number, r: { price: number }) => sum + Number(r.price ?? 0), 0)

  return {
    total: totalRes.count ?? 0,
    published: publishedRes.count ?? 0,
    auction: auctionRes.count ?? 0,
    direct: directRes.count ?? 0,
    draft: draftRes.count ?? 0,
    totalBids: bidRes.count ?? 0,
    totalOrders: orderRes.count ?? 0,
    totalRevenue,
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

  const sb = await createSupabaseServiceClient()

  // Build the products query with all filters
  let query = sb
    .from('products')
    .select(`
      id, slug, name, feature_image, category_id, merchant_id,
      sale_type, status, price, min_bid_price, quantity,
      start_date, end_date, bid_count, created_at,
      categories!left(name),
      profiles!products_merchant_id_fkey(first_name, last_name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (saleType && saleType !== 'all') query = query.eq('sale_type', saleType)
  if (merchantId && merchantId !== 'all') query = query.eq('merchant_id', merchantId)
  if (categoryId && categoryId !== 'all') query = query.eq('category_id', categoryId)
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte('created_at', end.toISOString())
  }

  if (search?.trim()) {
    const s = search.trim()
    // PostgREST OR filter for search across slug, name JSON, and merchant name
    query = query.or(
      `slug.ilike.%${s}%,name->en.cs.${s},name->ar.cs.${s}`
    )
  }

  const { data: rows, count, error } = await query

  if (error) {
    console.error('[getLots] Supabase error:', error)
    return { rows: [], total: 0, page, perPage, totalPages: 0 }
  }

  const total = count ?? 0
  const typedRows = (rows ?? []) as Array<{
    id: string
    slug: string
    name: Record<string, string>
    feature_image: string | null
    category_id: string | null
    merchant_id: string
    sale_type: string
    status: string
    price: number
    min_bid_price: number
    quantity: number
    start_date: string | null
    end_date: string | null
    bid_count: number
    created_at: string
    categories: { name: Record<string, string> } | null
    profiles: { first_name: string; last_name: string } | null
  }>

  // Get order counts for these product IDs in parallel with signed URLs
  const productIds = typedRows.map((r) => r.id)
  const pathsToSign = typedRows
    .map((r) => r.feature_image)
    .filter((p): p is string => !!p && !p.startsWith('/'))

  const [orderCountRes, signedUrls] = await Promise.all([
    productIds.length > 0
      ? sb
          .from('orders')
          .select('product_id')
          .in('product_id', productIds)
      : Promise.resolve({ data: [] as { product_id: string }[] }),
    pathsToSign.length > 0
      ? getSignedImageUrls(pathsToSign)
      : Promise.resolve([]),
  ])

  // Count orders per product
  const orderCountMap = new Map<string, number>()
  for (const o of (orderCountRes.data ?? []) as { product_id: string }[]) {
    orderCountMap.set(o.product_id, (orderCountMap.get(o.product_id) ?? 0) + 1)
  }

  const urlMap = new Map(pathsToSign.map((p, i) => [p, signedUrls[i] ?? '']))

  return {
    rows: typedRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameEn: r.name?.en ?? '',
      nameAr: r.name?.ar ?? '',
      featureImage: r.feature_image,
      featureImageUrl: r.feature_image
        ? r.feature_image.startsWith('/') ? r.feature_image : (urlMap.get(r.feature_image) ?? null)
        : null,
      categoryId: r.category_id,
      categoryNameEn: (r.categories?.name as Record<string, string>)?.en ?? null,
      merchantId: r.merchant_id,
      merchantName: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '',
      saleType: r.sale_type,
      status: r.status,
      price: Number(r.price),
      minBidPrice: Number(r.min_bid_price),
      quantity: r.quantity,
      startDate: r.start_date ? new Date(r.start_date) : null,
      endDate: r.end_date ? new Date(r.end_date) : null,
      ordersCount: orderCountMap.get(r.id) ?? 0,
      bidsCount: r.bid_count,
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
  const sb = await createSupabaseServiceClient()

  const [, productRes, galleryRes, specsRes] = await Promise.all([
    requireAdmin(),
    sb
      .from('products')
      .select('*')
      .eq('id', id)
      .single(),
    sb
      .from('product_galleries')
      .select('image')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
    sb
      .from('product_specifications')
      .select('id, label, value, sort_order')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = productRes.data as any
  if (!r) return null

  const name = r.name as Record<string, string>
  const desc = (r.description ?? {}) as Record<string, string>
  const shortDesc = (r.short_description ?? {}) as Record<string, string>

  // Generate signed URLs for all images (feature + gallery) in one batch
  const galleryPaths = (galleryRes.data ?? []).map((g: { image: string }) => g.image)
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
    p.startsWith('/') ? p : (urlMap.get(p) ?? '')
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
    specifications: (specsRes.data ?? []).map((s: { id: string; label: Record<string, string>; value: Record<string, string>; sort_order: number }) => ({
      id: s.id,
      labelEn: s.label?.en ?? '',
      labelAr: s.label?.ar ?? '',
      valueEn: s.value?.en ?? '',
      valueAr: s.value?.ar ?? '',
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

  // ── Resolve effective dates ────────────────────────────────────
  // Grouped lots: group dates are the source of truth (defense-in-depth)
  // Standalone lots: use submitted dates with validation
  let effectiveStartDate: Date | null = data.startDate ? parseMuscatDateTime(data.startDate) : null
  let effectiveEndDate: Date | null = data.endDate ? parseMuscatDateTime(data.endDate) : null
  let effectiveScheduleType = data.scheduleType

  if (data.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      select: { startDate: true, endDate: true },
    })
    if (!group) return { error: 'Selected group not found.' }
    effectiveStartDate = group.startDate
    effectiveEndDate = group.endDate
    effectiveScheduleType = 'scheduled'
  } else if (data.scheduleType === 'scheduled') {
    // Standalone lot validation
    if (!data.startDate || !data.endDate) {
      return { error: 'Start date and end date are required for scheduled lots.' }
    }
    if (effectiveEndDate && effectiveStartDate && effectiveEndDate <= effectiveStartDate) {
      return { error: 'End date must be after start date.' }
    }
  }

  const NO_IMAGE_PATH = '/Image_not_available.png'
  let featureImageUrl = data.featureImage?.trim() || null
  if (data.useNoImage) featureImageUrl = NO_IMAGE_PATH

  try {
    const product = await prisma.product.create({
      data: {
        merchantId,
        slug: data.slug.trim().toLowerCase(),
        name: { en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' },
        description: { en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' },
        shortDescription: { en: data.shortDescriptionEn?.trim() ?? '', ar: data.shortDescriptionAr?.trim() ?? '' },
        featureImage: featureImageUrl,
        categoryId: data.categoryId || null,
        groupId: data.groupId || null,
        quantity: data.quantity ?? 1,
        location: data.location.trim(),
        inspectionNotes: data.inspectionNotes?.trim() || null,
        saleType: data.saleType,
        scheduleType: effectiveScheduleType,
        minDeposit: data.minDeposit || '0',
        minDepositType: data.minDepositType ?? 'fixed',
        minBidPrice: data.minBidPrice || '0',
        reservePrice: data.reservePrice || null,
        bidIncrement1: data.bidIncrement1 || '1',
        bidIncrement2: data.bidIncrement2 || null,
        bidIncrement3: data.bidIncrement3 || null,
        bidIncrement4: data.bidIncrement4 || null,
        price: data.price || '0',
        salePrice: data.salePrice || null,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        originalEndDate: effectiveEndDate,
        status: data.status,
      },
    })

    if (data.galleryImages?.length) {
      await prisma.productGallery.createMany({
        data: data.galleryImages.map((url, idx) => ({
          productId: product.id, image: url, sortOrder: idx,
        })),
      })
    }

    if (data.specifications?.length) {
      await prisma.productSpecification.createMany({
        data: data.specifications.map((s, idx) => ({
          productId: product.id,
          label: { en: s.labelEn.trim(), ar: s.labelAr.trim() },
          value: { en: s.valueEn.trim(), ar: s.valueAr.trim() },
          sortOrder: idx,
        })),
      })
    }

    revalidatePath('/products')
    return { id: product.id }
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[createLot]', err)
    return { error: 'Failed to create lot.' }
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

  // ── Resolve effective dates ────────────────────────────────────
  let effectiveStartDate: Date | null = data.startDate ? parseMuscatDateTime(data.startDate) : null
  let effectiveEndDate: Date | null = data.endDate ? parseMuscatDateTime(data.endDate) : null
  let effectiveScheduleType = data.scheduleType

  if (data.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      select: { startDate: true, endDate: true },
    })
    if (!group) return { error: 'Selected group not found.' }
    effectiveStartDate = group.startDate
    effectiveEndDate = group.endDate
    effectiveScheduleType = 'scheduled'
  } else if (data.scheduleType === 'scheduled') {
    if (!data.startDate || !data.endDate) {
      return { error: 'Start date and end date are required for scheduled lots.' }
    }
    if (effectiveEndDate && effectiveStartDate && effectiveEndDate <= effectiveStartDate) {
      return { error: 'End date must be after start date.' }
    }
  }

  const NO_IMAGE_PATH = '/Image_not_available.png'
  let featureImageUrl = data.featureImage?.trim() || null
  if (data.useNoImage) featureImageUrl = NO_IMAGE_PATH

  try {
    await prisma.product.update({
      where: { id },
      data: {
        merchantId,
        slug: data.slug.trim().toLowerCase(),
        name: { en: data.nameEn.trim(), ar: data.nameAr?.trim() ?? '' },
        description: { en: data.descriptionEn?.trim() ?? '', ar: data.descriptionAr?.trim() ?? '' },
        shortDescription: { en: data.shortDescriptionEn?.trim() ?? '', ar: data.shortDescriptionAr?.trim() ?? '' },
        featureImage: featureImageUrl,
        categoryId: data.categoryId || null,
        groupId: data.groupId || null,
        quantity: data.quantity ?? 1,
        location: data.location.trim(),
        inspectionNotes: data.inspectionNotes?.trim() || null,
        saleType: data.saleType,
        scheduleType: effectiveScheduleType,
        minDeposit: data.minDeposit || '0',
        minDepositType: data.minDepositType ?? 'fixed',
        minBidPrice: data.minBidPrice || '0',
        reservePrice: data.reservePrice || null,
        bidIncrement1: data.bidIncrement1 || '1',
        bidIncrement2: data.bidIncrement2 || null,
        bidIncrement3: data.bidIncrement3 || null,
        bidIncrement4: data.bidIncrement4 || null,
        price: data.price || '0',
        salePrice: data.salePrice || null,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        originalEndDate: effectiveEndDate,
        status: data.status,
        updatedAt: new Date(),
      },
    })

    if (data.galleryImages !== undefined) {
      await prisma.productGallery.deleteMany({ where: { productId: id } })
      if (data.galleryImages.length > 0) {
        await prisma.productGallery.createMany({
          data: data.galleryImages.map((url, idx) => ({
            productId: id, image: url, sortOrder: idx,
          })),
        })
      }
    }

    if (data.specifications !== undefined) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } })
      if (data.specifications.length > 0) {
        await prisma.productSpecification.createMany({
          data: data.specifications.map((s, idx) => ({
            productId: id,
            label: { en: s.labelEn.trim(), ar: s.labelAr.trim() },
            value: { en: s.valueEn.trim(), ar: s.valueAr.trim() },
            sortOrder: idx,
          })),
        })
      }
    }

    revalidatePath('/products')
    return {}
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: `Slug "${data.slug}" is already taken.` }
    console.error('[updateLot]', err)
    return { error: 'Failed to update lot.' }
  }
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteLot(id: string): Promise<{ error?: string }> {
  await requireAdmin()

  const sb = await createSupabaseServiceClient()

  const [productRes2, ordersRes, bidsRes] = await Promise.all([
    sb.from('products').select('id, name').eq('id', id).single(),
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('product_id', id),
    sb.from('bid_history').select('id', { count: 'exact', head: true }).eq('product_id', id),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = productRes2.data as any
  if (!target) return { error: 'Lot not found.' }

  const lotName = (target.name as Record<string, string>)?.en ?? 'this lot'
  const orderCount = ordersRes.count ?? 0
  const bidCount = bidsRes.count ?? 0

  if (orderCount > 0) {
    return { error: `Cannot delete "${lotName}" — it has ${orderCount} order${orderCount === 1 ? '' : 's'}.` }
  }
  if (bidCount > 0) {
    return { error: `Cannot delete "${lotName}" — it has ${bidCount} bid${bidCount === 1 ? '' : 's'}.` }
  }

  try {
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } })
  } catch (err) {
    console.error('[deleteLot]', err)
    return { error: 'Failed to delete lot.' }
  }

  revalidatePath('/products')
  return {}
}
