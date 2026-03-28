'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@mzadat/db'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getSignedImageUrl, getSignedImageUrls } from '@/lib/actions/images'
import { toMuscatDateTimeLocal, parseMuscatDateTime } from '@/lib/timezone'

// ── Row type (listing) ──────────────────────────────────────────

export interface GroupRow {
  id: string
  nameEn: string
  nameOm: string
  image: string | null
  imageUrl: string | null
  storeId: string | null
  storeName: string | null
  merchantId: string
  merchantName: string
  startDate: Date
  endDate: Date
  inspectionStartDate: Date | null
  inspectionEndDate: Date | null
  minDeposit: number
  lotsCount: number
  status: string
  createdAt: Date
}

// ── Detail type (edit form) ─────────────────────────────────────

export interface GroupDetail {
  id: string
  nameEn: string
  nameOm: string
  image: string | null
  imageUrl: string | null
  storeId: string | null
  merchantId: string
  startDate: string
  endDate: string
  inspectionStartDate: string | null
  inspectionEndDate: string | null
  minDeposit: number
  status: 'upcoming' | 'active' | 'closed' | 'cancelled'
}

// ── Form data (create/update) ───────────────────────────────────

export interface GroupFormData {
  nameEn: string
  nameOm: string
  image?: string
  storeId?: string
  merchantId: string
  startDate: string
  endDate: string
  inspectionStartDate?: string
  inspectionEndDate?: string
  minDeposit: number
  status: 'upcoming' | 'active' | 'closed' | 'cancelled'
}

// ── Dropdown option types ───────────────────────────────────────

export interface StoreOption {
  id: string
  nameEn: string
  ownerId: string
}

export interface MerchantOption {
  id: string
  name: string
  email: string
}

// ── Filters & Pagination types ──────────────────────────────────

export interface GroupFilters {
  search?: string
  status?: string
  merchantId?: string
  storeId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  perPage?: number
}

export interface GroupListResult {
  rows: GroupRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface GroupStats {
  total: number
  upcoming: number
  active: number
  closed: number
  totalLots: number
}

/**
 * Derive the effective group status from dates, not just the stored DB status.
 * The DB status may be stale if BullMQ workers haven't run yet.
 */
function deriveGroupStatus(dbStatus: string, startDate: Date, endDate: Date): string {
  // If explicitly cancelled or closed in DB, trust it
  if (dbStatus === 'cancelled' || dbStatus === 'closed') return dbStatus

  const now = new Date()
  if (now < startDate) return 'upcoming'
  if (now > endDate) return 'closed'
  return 'active'
}

// ── Combined page data loader (single auth check) ──────────────

export async function getGroupsPageData() {
  const [, data, stats, dropdowns] = await Promise.all([
    requireAdmin(),
    getGroupsInternal({ page: 1, perPage: 20 }),
    getGroupStatsInternal(),
    getGroupDropdownsInternal(),
  ])
  return { data, stats, dropdowns }
}

// ── Lookups for dropdowns ───────────────────────────────────────

export async function getGroupDropdowns() {
  const [, result] = await Promise.all([
    requireAdmin(),
    getGroupDropdownsInternal(),
  ])
  return result
}

async function getGroupDropdownsInternal() {
  const sb = await createSupabaseServiceClient()

  const [storeRes, merchantRes] = await Promise.all([
    sb
      .from('stores')
      .select('id, name, owner_id')
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    sb
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('role', ['merchant', 'admin', 'super_admin'])
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
  ])

  const stores = (storeRes.data ?? []) as Array<{ id: string; name: Record<string, string>; owner_id: string }>
  const merchants = (merchantRes.data ?? []) as Array<{ id: string; first_name: string; last_name: string; email: string }>

  return {
    stores: stores.map((s) => ({
      id: s.id,
      nameEn: (s.name as Record<string, string>)?.en ?? '',
      ownerId: s.owner_id,
    })) as StoreOption[],
    merchants: merchants.map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      email: m.email,
    })) as MerchantOption[],
  }
}

// ── Stats ────────────────────────────────────────────────────────

export async function getGroupStats(): Promise<GroupStats> {
  const [, result] = await Promise.all([
    requireAdmin(),
    getGroupStatsInternal(),
  ])
  return result
}

async function getGroupStatsInternal(): Promise<GroupStats> {
  const sb = await createSupabaseServiceClient()

  const [totalRes, upcomingRes, activeRes, closedRes, lotsRes] = await Promise.all([
    sb.from('groups').select('id', { count: 'exact', head: true }),
    sb.from('groups').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
    sb.from('groups').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    sb.from('groups').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
    sb.from('products').select('id', { count: 'exact', head: true }).not('group_id', 'is', null).is('deleted_at', null),
  ])

  return {
    total: totalRes.count ?? 0,
    upcoming: upcomingRes.count ?? 0,
    active: activeRes.count ?? 0,
    closed: closedRes.count ?? 0,
    totalLots: lotsRes.count ?? 0,
  }
}

// ── List (with filters & pagination) ─────────────────────────────

export async function getGroups(filters: GroupFilters = {}): Promise<GroupListResult> {
  const [, result] = await Promise.all([
    requireAdmin(),
    getGroupsInternal(filters),
  ])
  return result
}

async function getGroupsInternal(filters: GroupFilters = {}): Promise<GroupListResult> {
  const {
    search,
    status,
    merchantId,
    storeId,
    dateFrom,
    dateTo,
    page = 1,
    perPage = 20,
  } = filters

  const sb = await createSupabaseServiceClient()

  let query = sb
    .from('groups')
    .select(`
      id, name, image, store_id, merchant_id,
      start_date, end_date, inspection_start_date, inspection_end_date,
      min_deposit, status, created_at,
      stores!left(name),
      profiles!groups_merchant_id_fkey(first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (merchantId && merchantId !== 'all') query = query.eq('merchant_id', merchantId)
  if (storeId && storeId !== 'all') query = query.eq('store_id', storeId)
  if (dateFrom) query = query.gte('start_date', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte('end_date', end.toISOString())
  }

  if (search?.trim()) {
    const s = search.trim()
    query = query.or(`name->en.ilike.%${s}%,name->ar.ilike.%${s}%`)
  }

  const { data: rows, count, error } = await query

  if (error) {
    console.error('[getGroups] Supabase error:', error)
    return { rows: [], total: 0, page, perPage, totalPages: 0 }
  }

  const total = count ?? 0
  const typedRows = (rows ?? []) as Array<{
    id: string
    name: Record<string, string>
    image: string | null
    store_id: string | null
    merchant_id: string
    start_date: string
    end_date: string
    inspection_start_date: string | null
    inspection_end_date: string | null
    min_deposit: number
    status: string
    created_at: string
    stores: { name: Record<string, string> } | null
    profiles: { first_name: string; last_name: string } | null
  }>

  // Count products per group and sign image URLs
  const groupIds = typedRows.map((r) => r.id)
  const pathsToSign = typedRows
    .map((r) => r.image)
    .filter((p): p is string => !!p && !p.startsWith('/'))

  const [productCountRes, signedUrls] = await Promise.all([
    groupIds.length > 0
      ? sb
          .from('products')
          .select('group_id')
          .in('group_id', groupIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as { group_id: string }[] }),
    pathsToSign.length > 0
      ? getSignedImageUrls(pathsToSign)
      : Promise.resolve([]),
  ])

  const lotCountMap = new Map<string, number>()
  for (const p of (productCountRes.data ?? []) as { group_id: string }[]) {
    lotCountMap.set(p.group_id, (lotCountMap.get(p.group_id) ?? 0) + 1)
  }

  const urlMap = new Map(pathsToSign.map((p, i) => [p, signedUrls[i] ?? '']))

  return {
    rows: typedRows.map((r) => ({
      id: r.id,
      nameEn: r.name?.en ?? '',
      nameOm: r.name?.ar ?? '',
      image: r.image,
      imageUrl: r.image
        ? r.image.startsWith('/') ? r.image : (urlMap.get(r.image) ?? null)
        : null,
      storeId: r.store_id,
      storeName: r.stores ? (r.stores.name as Record<string, string>)?.en ?? null : null,
      merchantId: r.merchant_id,
      merchantName: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '',
      startDate: new Date(r.start_date),
      endDate: new Date(r.end_date),
      inspectionStartDate: r.inspection_start_date ? new Date(r.inspection_start_date) : null,
      inspectionEndDate: r.inspection_end_date ? new Date(r.inspection_end_date) : null,
      minDeposit: Number(r.min_deposit),
      lotsCount: lotCountMap.get(r.id) ?? 0,
      status: deriveGroupStatus(r.status, new Date(r.start_date), new Date(r.end_date)),
      createdAt: new Date(r.created_at),
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

// ── Get single group for editing ────────────────────────────────

export async function getGroup(id: string): Promise<GroupDetail | null> {
  await requireAdmin()

  const sb = await createSupabaseServiceClient()
  const { data, error } = await sb
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  const name = r.name as Record<string, string>

  let imageUrl: string | null = null
  if (r.image && !r.image.startsWith('/')) {
    imageUrl = await getSignedImageUrl(r.image)
  } else if (r.image) {
    imageUrl = r.image
  }

  return {
    id: r.id,
    nameEn: name?.en ?? '',
    nameOm: name?.ar ?? '',
    image: r.image,
    imageUrl,
    storeId: r.store_id,
    merchantId: r.merchant_id,
    startDate: toMuscatDateTimeLocal(r.start_date),
    endDate: toMuscatDateTimeLocal(r.end_date),
    inspectionStartDate: r.inspection_start_date
      ? toMuscatDateTimeLocal(r.inspection_start_date)
      : null,
    inspectionEndDate: r.inspection_end_date
      ? toMuscatDateTimeLocal(r.inspection_end_date)
      : null,
    minDeposit: Number(r.min_deposit),
    status: r.status as GroupDetail['status'],
  }
}

// ── Create ──────────────────────────────────────────────────────

export async function createGroup(data: GroupFormData): Promise<{ error?: string; id?: string }> {
  await requireAdmin()

  if (!data.nameEn?.trim()) return { error: 'English name is required.' }
  if (!data.merchantId) return { error: 'Merchant is required.' }
  if (!data.startDate) return { error: 'Start date is required.' }
  if (!data.endDate) return { error: 'End date is required.' }

  try {
    const group = await prisma.group.create({
      data: {
        merchantId: data.merchantId,
        storeId: data.storeId || null,
        name: { en: data.nameEn.trim(), ar: data.nameOm?.trim() ?? '' },
        image: data.image?.trim() || null,
        startDate: parseMuscatDateTime(data.startDate),
        endDate: parseMuscatDateTime(data.endDate),
        inspectionStartDate: data.inspectionStartDate ? parseMuscatDateTime(data.inspectionStartDate) : null,
        inspectionEndDate: data.inspectionEndDate ? parseMuscatDateTime(data.inspectionEndDate) : null,
        minDeposit: data.minDeposit ?? 0,
        status: data.status ?? 'upcoming',
      },
    })

    return { id: group.id }
  } catch (err: any) {
    console.error('[createGroup]', err)
    return { error: 'Failed to create group.' }
  }
}

// ── Update ──────────────────────────────────────────────────────

export async function updateGroup(
  id: string,
  data: GroupFormData,
): Promise<{ error?: string }> {
  await requireAdmin()

  if (!data.nameEn?.trim()) return { error: 'English name is required.' }
  if (!data.merchantId) return { error: 'Merchant is required.' }
  if (!data.startDate) return { error: 'Start date is required.' }
  if (!data.endDate) return { error: 'End date is required.' }

  try {
    // Fetch old group dates to detect changes (for anti-snipe guard)
    const oldGroup = await prisma.group.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    })

    const newStartDate = parseMuscatDateTime(data.startDate)
    const newEndDate = parseMuscatDateTime(data.endDate)

    await prisma.group.update({
      where: { id },
      data: {
        merchantId: data.merchantId,
        storeId: data.storeId || null,
        name: { en: data.nameEn.trim(), ar: data.nameOm?.trim() ?? '' },
        image: data.image?.trim() || null,
        startDate: newStartDate,
        endDate: newEndDate,
        inspectionStartDate: data.inspectionStartDate ? parseMuscatDateTime(data.inspectionStartDate) : null,
        inspectionEndDate: data.inspectionEndDate ? parseMuscatDateTime(data.inspectionEndDate) : null,
        minDeposit: data.minDeposit ?? 0,
        status: data.status,
        updatedAt: new Date(),
      },
    })

    // ── Propagate dates to child lots ──────────────────────────
    // Only update lots whose endDate hasn't been extended past the
    // old group endDate (anti-sniping guard: don't roll back extensions)
    const datesChanged = !oldGroup ||
      oldGroup.startDate.getTime() !== newStartDate.getTime() ||
      oldGroup.endDate.getTime() !== newEndDate.getTime()

    if (datesChanged) {
      const whereClause: Record<string, unknown> = {
        groupId: id,
        deletedAt: null,
      }
      // Guard: only update lots that haven't been anti-snipe-extended
      if (oldGroup) {
        whereClause.endDate = { lte: oldGroup.endDate }
      }

      await prisma.product.updateMany({
        where: whereClause as any,
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
          originalEndDate: newEndDate,
          updatedAt: new Date(),
        },
      })
    }

    revalidatePath('/products')
    return {}
  } catch (err: any) {
    console.error('[updateGroup]', err)
    return { error: 'Failed to update group.' }
  }
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteGroup(id: string): Promise<{ error?: string }> {
  await requireAdmin()

  const sb = await createSupabaseServiceClient()

  const [groupRes, productsRes] = await Promise.all([
    sb.from('groups').select('id, name').eq('id', id).single(),
    sb.from('products').select('id', { count: 'exact', head: true }).eq('group_id', id).is('deleted_at', null),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = groupRes.data as any
  if (!target) return { error: 'Group not found.' }

  const groupName = (target.name as Record<string, string>)?.en ?? 'this group'
  const productCount = productsRes.count ?? 0

  if (productCount > 0) {
    return {
      error: `Cannot delete "${groupName}" — it has ${productCount} lot${productCount === 1 ? '' : 's'}. Remove or reassign them first.`,
    }
  }

  try {
    await prisma.group.delete({ where: { id } })
  } catch (err) {
    console.error('[deleteGroup]', err)
    return { error: 'Failed to delete group.' }
  }

  return {}
}

// ── Live auction stats per group ────────────────────────────────

export interface GroupLiveInfo {
  groupId: string
  liveLots: number
  endedLots: number
  upcomingLots: number
  totalBids: number
  highestBid: string | null
}

export async function getGroupLiveStats(): Promise<GroupLiveInfo[]> {
  await requireAdmin()
  const now = new Date()

  const activeGroups = await prisma.group.findMany({
    where: {
      OR: [
        { status: 'active' },
        { status: 'upcoming', startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    include: {
      products: {
        where: { deletedAt: null, saleType: 'auction' },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          currentBid: true,
        },
      },
    },
  })

  // Count unique bidders per product (one query for all products)
  const allProductIds = activeGroups.flatMap((g) => g.products.map((p) => p.id))
  let uniqueBidderMap = new Map<string, number>()
  if (allProductIds.length > 0) {
    const rows = await prisma.bidHistory.groupBy({
      by: ['productId', 'userId'],
      where: { productId: { in: allProductIds }, deletedAt: null },
    })
    for (const row of rows) {
      uniqueBidderMap.set(row.productId, (uniqueBidderMap.get(row.productId) ?? 0) + 1)
    }
  }

  return activeGroups.map((g) => {
    const liveLots = g.products.filter(
      (p) => p.status === 'published' && p.startDate && p.startDate <= now && p.endDate && p.endDate >= now,
    ).length
    const endedLots = g.products.filter(
      (p) => p.status === 'closed' || (p.endDate && p.endDate < now),
    ).length
    const totalBids = g.products.reduce((sum, p) => sum + (uniqueBidderMap.get(p.id) ?? 0), 0)
    const highestBid = g.products.reduce((max, p) => {
      const val = Number(p.currentBid)
      return val > max ? val : max
    }, 0)

    return {
      groupId: g.id,
      liveLots,
      endedLots,
      upcomingLots: g.products.length - liveLots - endedLots,
      totalBids,
      highestBid: highestBid > 0 ? highestBid.toFixed(3) : null,
    }
  })
}

// ── Force-close group ───────────────────────────────────────────

export interface ForceClosePreview {
  groupStatus: string
  activeLots: number
  closedLots: number
  totalLots: number
  activeRegistrations: number
}

export interface ForceCloseResult {
  closedLots: number
  alreadyClosed: number
}

/**
 * Preview the impact of force-closing a group.
 * Returns lot counts and registration counts to show in a confirmation dialog.
 */
export async function getForceClosePreview(groupId: string): Promise<{ data?: ForceClosePreview; error?: string }> {
  await requireAdmin()

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, status: true },
    })
    if (!group) return { error: 'Group not found' }

    const [activeLots, closedLots, activeRegistrations] = await Promise.all([
      prisma.product.count({
        where: { groupId, status: { in: ['published', 'pending'] }, deletedAt: null },
      }),
      prisma.product.count({
        where: { groupId, status: 'closed', deletedAt: null },
      }),
      prisma.auctionRegistration.count({
        where: { groupId, status: 'active' },
      }),
    ])

    return {
      data: {
        groupStatus: group.status,
        activeLots,
        closedLots,
        totalLots: activeLots + closedLots,
        activeRegistrations,
      },
    }
  } catch (err) {
    console.error('[getForceClosePreview]', err)
    return { error: 'Failed to load preview' }
  }
}

/**
 * Force-close a group: set endDate of all active lots to NOW so the
 * auction-scanner worker (every 30s) picks them up and runs the full
 * close → winner-processing → refund → notify pipeline automatically.
 *
 * This avoids duplicating the complex winner/refund logic and ensures
 * emails, notifications, and deposit refunds all happen through the
 * same battle-tested code path.
 */
export async function forceCloseGroup(groupId: string): Promise<{ data?: ForceCloseResult; error?: string }> {
  await requireAdmin()

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, status: true },
    })
    if (!group) return { error: 'Group not found' }
    if (group.status === 'closed') return { error: 'Group is already closed' }

    const now = new Date()

    // Count lots that are already closed
    const alreadyClosed = await prisma.product.count({
      where: { groupId, status: 'closed', deletedAt: null },
    })

    // Set endDate to NOW for all active/upcoming lots — the scanner will
    // detect them as past-due and trigger closeAuction → processWinner
    const result = await prisma.product.updateMany({
      where: {
        groupId,
        status: { in: ['published', 'pending'] },
        deletedAt: null,
      },
      data: { endDate: now },
    })

    // Set group endDate to now so the scanner closes it once all lots are done
    await prisma.group.update({
      where: { id: groupId },
      data: { endDate: now },
    })

    revalidatePath('/groups')
    return { data: { closedLots: result.count, alreadyClosed } }
  } catch (err) {
    console.error('[forceCloseGroup]', err)
    return { error: 'Failed to close group' }
  }
}
