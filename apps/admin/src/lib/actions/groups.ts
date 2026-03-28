'use server'

import { revalidatePath } from 'next/cache'
import { query, queryOne } from '@mzadat/db'
import { requireAdmin } from '@/lib/auth'
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
  const [storeRows, merchantRows] = await Promise.all([
    query<{ id: string; name: Record<string, string>; owner_id: string }>(`
      SELECT id, name, owner_id FROM stores WHERE status = 'active' ORDER BY created_at ASC
    `),
    query<{ id: string; first_name: string; last_name: string; email: string }>(`
      SELECT id, first_name, last_name, email FROM profiles
      WHERE role IN ('merchant', 'admin', 'super_admin') AND status = 'active'
      ORDER BY created_at ASC
    `),
  ])

  return {
    stores: storeRows.map((s) => ({
      id: s.id,
      nameEn: (s.name as Record<string, string>)?.en ?? '',
      ownerId: s.owner_id,
    })) as StoreOption[],
    merchants: merchantRows.map((m) => ({
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
  const row = await queryOne<{
    total: string
    upcoming: string
    active: string
    closed: string
    total_lots: string
  }>(`
    SELECT
      (SELECT count(*) FROM groups)::text AS total,
      (SELECT count(*) FROM groups WHERE status = 'upcoming')::text AS upcoming,
      (SELECT count(*) FROM groups WHERE status = 'active')::text AS active,
      (SELECT count(*) FROM groups WHERE status = 'closed')::text AS closed,
      (SELECT count(*) FROM products WHERE group_id IS NOT NULL AND deleted_at IS NULL)::text AS total_lots
  `)

  return {
    total: Number(row?.total ?? 0),
    upcoming: Number(row?.upcoming ?? 0),
    active: Number(row?.active ?? 0),
    closed: Number(row?.closed ?? 0),
    totalLots: Number(row?.total_lots ?? 0),
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

  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (status && status !== 'all') {
    conditions.push(`g.status = $${idx++}`)
    params.push(status)
  }
  if (merchantId && merchantId !== 'all') {
    conditions.push(`g.merchant_id = $${idx++}`)
    params.push(merchantId)
  }
  if (storeId && storeId !== 'all') {
    conditions.push(`g.store_id = $${idx++}`)
    params.push(storeId)
  }
  if (dateFrom) {
    conditions.push(`g.start_date >= $${idx++}`)
    params.push(new Date(dateFrom).toISOString())
  }
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    conditions.push(`g.end_date <= $${idx++}`)
    params.push(end.toISOString())
  }
  if (search?.trim()) {
    const s = `%${search.trim()}%`
    conditions.push(`(g.name->>'en' ILIKE $${idx} OR g.name->>'ar' ILIKE $${idx})`)
    params.push(s)
    idx++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * perPage

  // Count + data in parallel
  const [countRow, rows] = await Promise.all([
    queryOne<{ total: string }>(`SELECT count(*)::text AS total FROM groups g ${where}`, params),
    query<{
      id: string; name: Record<string, string>; image: string | null
      store_id: string | null; merchant_id: string
      start_date: string; end_date: string
      inspection_start_date: string | null; inspection_end_date: string | null
      min_deposit: string; status: string; created_at: string
      store_name: Record<string, string> | null
      merchant_first: string | null; merchant_last: string | null
      lots_count: string
    }>(`
      SELECT
        g.id, g.name, g.image, g.store_id, g.merchant_id,
        g.start_date, g.end_date, g.inspection_start_date, g.inspection_end_date,
        g.min_deposit::text, g.status, g.created_at,
        s.name AS store_name,
        p.first_name AS merchant_first, p.last_name AS merchant_last,
        (SELECT count(*) FROM products pr WHERE pr.group_id = g.id AND pr.deleted_at IS NULL)::text AS lots_count
      FROM groups g
      LEFT JOIN stores s ON s.id = g.store_id
      LEFT JOIN profiles p ON p.id = g.merchant_id
      ${where}
      ORDER BY g.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, perPage, offset]),
  ])

  const total = Number(countRow?.total ?? 0)

  // Sign image URLs
  const pathsToSign = rows
    .map((r) => r.image)
    .filter((p): p is string => !!p && !p.startsWith('/'))

  const signedUrls = pathsToSign.length > 0
    ? await getSignedImageUrls(pathsToSign)
    : []

  const urlMap = new Map(pathsToSign.map((p, i) => [p, signedUrls[i] ?? '']))

  return {
    rows: rows.map((r) => ({
      id: r.id,
      nameEn: (r.name as Record<string, string>)?.en ?? '',
      nameOm: (r.name as Record<string, string>)?.ar ?? '',
      image: r.image,
      imageUrl: r.image
        ? r.image.startsWith('/') ? r.image : (urlMap.get(r.image) ?? null)
        : null,
      storeId: r.store_id,
      storeName: r.store_name ? (r.store_name as Record<string, string>)?.en ?? null : null,
      merchantId: r.merchant_id,
      merchantName: r.merchant_first ? `${r.merchant_first} ${r.merchant_last}` : '',
      startDate: new Date(r.start_date),
      endDate: new Date(r.end_date),
      inspectionStartDate: r.inspection_start_date ? new Date(r.inspection_start_date) : null,
      inspectionEndDate: r.inspection_end_date ? new Date(r.inspection_end_date) : null,
      minDeposit: Number(r.min_deposit),
      lotsCount: Number(r.lots_count),
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

  const r = await queryOne<{
    id: string; name: Record<string, string>; image: string | null
    store_id: string | null; merchant_id: string
    start_date: string; end_date: string
    inspection_start_date: string | null; inspection_end_date: string | null
    min_deposit: string; status: string
  }>(`SELECT * FROM groups WHERE id = $1`, [id])

  if (!r) return null

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
    const row = await queryOne<{ id: string }>(`
      INSERT INTO groups (merchant_id, store_id, name, image, start_date, end_date,
        inspection_start_date, inspection_end_date, min_deposit, status)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      data.merchantId,
      data.storeId || null,
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameOm?.trim() ?? '' }),
      data.image?.trim() || null,
      parseMuscatDateTime(data.startDate),
      parseMuscatDateTime(data.endDate),
      data.inspectionStartDate ? parseMuscatDateTime(data.inspectionStartDate) : null,
      data.inspectionEndDate ? parseMuscatDateTime(data.inspectionEndDate) : null,
      data.minDeposit ?? 0,
      data.status ?? 'upcoming',
    ])

    return { id: row!.id }
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
    const oldGroup = await queryOne<{ start_date: string; end_date: string }>(
      `SELECT start_date, end_date FROM groups WHERE id = $1`, [id],
    )

    const newStartDate = parseMuscatDateTime(data.startDate)
    const newEndDate = parseMuscatDateTime(data.endDate)

    await query(`
      UPDATE groups SET
        merchant_id = $1, store_id = $2, name = $3::jsonb, image = $4,
        start_date = $5, end_date = $6,
        inspection_start_date = $7, inspection_end_date = $8,
        min_deposit = $9, status = $10, updated_at = NOW()
      WHERE id = $11
    `, [
      data.merchantId,
      data.storeId || null,
      JSON.stringify({ en: data.nameEn.trim(), ar: data.nameOm?.trim() ?? '' }),
      data.image?.trim() || null,
      newStartDate,
      newEndDate,
      data.inspectionStartDate ? parseMuscatDateTime(data.inspectionStartDate) : null,
      data.inspectionEndDate ? parseMuscatDateTime(data.inspectionEndDate) : null,
      data.minDeposit ?? 0,
      data.status,
      id,
    ])

    // ── Propagate dates to child lots ──────────────────────────
    const datesChanged = !oldGroup ||
      new Date(oldGroup.start_date).getTime() !== newStartDate.getTime() ||
      new Date(oldGroup.end_date).getTime() !== newEndDate.getTime()

    if (datesChanged) {
      if (oldGroup) {
        // Guard: only update lots that haven't been anti-snipe-extended
        await query(`
          UPDATE products SET start_date = $1, end_date = $2, original_end_date = $2, updated_at = NOW()
          WHERE group_id = $3 AND deleted_at IS NULL AND end_date <= $4
        `, [newStartDate, newEndDate, id, new Date(oldGroup.end_date)])
      } else {
        await query(`
          UPDATE products SET start_date = $1, end_date = $2, original_end_date = $2, updated_at = NOW()
          WHERE group_id = $3 AND deleted_at IS NULL
        `, [newStartDate, newEndDate, id])
      }
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

  const [groupRow, countRow] = await Promise.all([
    queryOne<{ id: string; name: Record<string, string> }>(
      `SELECT id, name FROM groups WHERE id = $1`, [id],
    ),
    queryOne<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM products WHERE group_id = $1 AND deleted_at IS NULL`, [id],
    ),
  ])

  if (!groupRow) return { error: 'Group not found.' }

  const groupName = (groupRow.name as Record<string, string>)?.en ?? 'this group'
  const productCount = Number(countRow?.cnt ?? 0)

  if (productCount > 0) {
    return {
      error: `Cannot delete "${groupName}" — it has ${productCount} lot${productCount === 1 ? '' : 's'}. Remove or reassign them first.`,
    }
  }

  try {
    await query(`DELETE FROM groups WHERE id = $1`, [id])
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

  const rows = await query<{
    group_id: string
    live_lots: string
    ended_lots: string
    upcoming_lots: string
    total_bids: string
    highest_bid: string | null
  }>(`
    SELECT
      g.id AS group_id,
      count(*) FILTER (
        WHERE pr.status = 'published' AND pr.start_date <= NOW() AND pr.end_date >= NOW()
      )::text AS live_lots,
      count(*) FILTER (
        WHERE pr.status = 'closed' OR pr.end_date < NOW()
      )::text AS ended_lots,
      count(*) FILTER (
        WHERE pr.start_date > NOW()
      )::text AS upcoming_lots,
      (SELECT count(DISTINCT bh.user_id) FROM bid_history bh
        WHERE bh.product_id = ANY(array_agg(pr.id)) AND bh.deleted_at IS NULL
      )::text AS total_bids,
      CASE WHEN max(pr.current_bid) > 0 THEN max(pr.current_bid)::text ELSE NULL END AS highest_bid
    FROM groups g
    LEFT JOIN products pr ON pr.group_id = g.id AND pr.deleted_at IS NULL AND pr.sale_type = 'auction'
    WHERE g.status IN ('active', 'upcoming')
      AND g.start_date <= NOW() AND g.end_date >= NOW()
    GROUP BY g.id
  `)

  return rows.map((r) => ({
    groupId: r.group_id,
    liveLots: Number(r.live_lots),
    endedLots: Number(r.ended_lots),
    upcomingLots: Number(r.upcoming_lots),
    totalBids: Number(r.total_bids),
    highestBid: r.highest_bid ? Number(r.highest_bid).toFixed(3) : null,
  }))
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

export async function getForceClosePreview(groupId: string): Promise<{ data?: ForceClosePreview; error?: string }> {
  await requireAdmin()

  try {
    const row = await queryOne<{
      status: string
      active_lots: string
      closed_lots: string
      active_registrations: string
    }>(`
      SELECT
        g.status,
        (SELECT count(*) FROM products WHERE group_id = $1 AND status IN ('published','pending') AND deleted_at IS NULL)::text AS active_lots,
        (SELECT count(*) FROM products WHERE group_id = $1 AND status = 'closed' AND deleted_at IS NULL)::text AS closed_lots,
        (SELECT count(*) FROM auction_registrations WHERE group_id = $1 AND status = 'active')::text AS active_registrations
      FROM groups g WHERE g.id = $1
    `, [groupId])

    if (!row) return { error: 'Group not found' }

    const activeLots = Number(row.active_lots)
    const closedLots = Number(row.closed_lots)

    return {
      data: {
        groupStatus: row.status,
        activeLots,
        closedLots,
        totalLots: activeLots + closedLots,
        activeRegistrations: Number(row.active_registrations),
      },
    }
  } catch (err) {
    console.error('[getForceClosePreview]', err)
    return { error: 'Failed to load preview' }
  }
}

export async function forceCloseGroup(groupId: string): Promise<{ data?: ForceCloseResult; error?: string }> {
  await requireAdmin()

  try {
    const group = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM groups WHERE id = $1`, [groupId],
    )
    if (!group) return { error: 'Group not found' }
    if (group.status === 'closed') return { error: 'Group is already closed' }

    const now = new Date()

    const [alreadyRow, updateRows] = await Promise.all([
      queryOne<{ cnt: string }>(
        `SELECT count(*)::text AS cnt FROM products WHERE group_id = $1 AND status = 'closed' AND deleted_at IS NULL`,
        [groupId],
      ),
      query<{ id: string }>(`
        UPDATE products SET end_date = $1
        WHERE group_id = $2 AND status IN ('published','pending') AND deleted_at IS NULL
        RETURNING id
      `, [now, groupId]),
    ])

    await query(`UPDATE groups SET end_date = $1 WHERE id = $2`, [now, groupId])

    revalidatePath('/groups')
    return {
      data: {
        closedLots: updateRows.length,
        alreadyClosed: Number(alreadyRow?.cnt ?? 0),
      },
    }
  } catch (err) {
    console.error('[forceCloseGroup]', err)
    return { error: 'Failed to close group' }
  }
}