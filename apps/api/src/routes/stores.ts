/**
 * Store Routes
 *
 * GET  /api/stores              — List featured / active stores
 * GET  /api/stores/by-slug/:slug — Store by slug with groups & lots
 * GET  /api/stores/:id          — Single store with recent products
 */
import { Router } from 'express'
import { query, queryOne } from '@mzadat/db'
import { validateUUID } from '../middleware/validate-uuid.js'
import { resolveImageFields } from '../utils/storage.js'

const router: Router = Router()

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

/** List stores (featured first, then active) */
router.get('/', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const featured = req.query.featured === 'true'

    const rows = await query<{
      id: string; slug: string; name: unknown; description: unknown
      logo: string | null; cover_image: string | null
      address: string | null; status: string
      created_at: string; product_count: string; total: string
    }>(`
      SELECT
        s.id, s.slug, s.name, s.description,
        s.logo, s.cover_image, s.address,
        s.status, s.created_at,
        (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) AS product_count,
        COUNT(*) OVER() AS total
      FROM stores s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0

    const data = rows.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: pickLocale(s.name, locale),
        description: pickLocale(s.description, locale),
        logoUrl: s.logo,
        bannerUrl: s.cover_image,
        location: s.address ?? '',
        status: s.status,
        isFeatured: false,
        createdAt: s.created_at,
        productCount: parseInt(s.product_count),
      }))
    resolveImageFields(data, ['logoUrl', 'bannerUrl'])
    res.json({ success: true, data, total })
  } catch (err) {
    next(err)
  }
})

/** Store by slug — full detail with groups & lots */
router.get('/by-slug/:slug', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const groupId = (req.query.group as string) || null
    const tab = (req.query.tab as string) || 'live' // 'live' | 'past'

    const store = await queryOne<{
      id: string; slug: string; name: unknown; description: unknown
      logo: string | null; cover_image: string | null
      address: string | null; status: string; phone: string | null; email: string | null
      created_at: string
      owner_id: string; first_name: string; last_name: string; first_name_ar: string | null
      last_name_ar: string | null; custom_id: string; owner_image: string | null
      product_count: string
    }>(`
      SELECT
        s.id, s.slug, s.name, s.description,
        s.logo, s.cover_image, s.address, s.status, s.phone, s.email,
        s.created_at,
        m.id AS owner_id, m.first_name, m.last_name,
        m.first_name_ar, m.last_name_ar, m.custom_id,
        m.image AS owner_image,
        (SELECT COUNT(DISTINCT p.id) FROM products p
         LEFT JOIN groups grp ON grp.id = p.group_id
         WHERE (p.store_id = s.id OR grp.store_id = s.id) AND p.deleted_at IS NULL) AS product_count
      FROM stores s
      INNER JOIN profiles m ON m.id = s.owner_id
      WHERE s.slug = $1 AND s.status = 'active'
    `, [req.params.slug])

    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' })
      return
    }

    // Fetch groups belonging to this store
    const groups = await query<{
      id: string; name: unknown; description: unknown; image: string | null
      start_date: string; end_date: string
      inspection_start_date: string | null; inspection_end_date: string | null
      min_deposit: string; status: string; lot_count: string
    }>(`
      SELECT g.id, g.name, g.description, g.image,
             g.start_date, g.end_date, g.inspection_start_date, g.inspection_end_date,
             g.min_deposit, g.status,
             (SELECT COUNT(*) FROM products p WHERE p.group_id = g.id AND p.deleted_at IS NULL) AS lot_count
      FROM groups g
      WHERE g.store_id = $1
      ORDER BY g.start_date DESC
    `, [store.id])

    const now = new Date()

    // Determine lot filter conditions based on DB status values
    // DB ProductStatus: draft | pending | published | inactive | closed
    // 'live' tab = published products not yet ended
    // 'past' tab = closed products or products whose end_date has passed
    const isLiveTab = tab === 'live'
    const lotFilter = isLiveTab
      ? `AND p.status = 'published' AND p.end_date >= NOW()`
      : `AND (p.status = 'closed' OR (p.end_date IS NOT NULL AND p.end_date < NOW()))`

    // Build the lots query with optional group filter
    const lotsParams: (string | number)[] = [store.id]
    let groupFilter = ''
    if (groupId) {
      groupFilter = `AND p.group_id = $2`
      lotsParams.push(groupId)
    }

    const lots = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      price: string; current_bid: string; min_bid_price: string; min_deposit: string
      min_deposit_type: string; sale_type: string
      bid_count: number; start_date: string | null; end_date: string | null
      original_end_date: string | null; total_extensions: number; status: string
      location: string | null
      group_id: string | null; group_name: unknown | null
      merchant_name: string; merchant_custom_id: string
      category_name: unknown | null
      gallery_image: string | null
    }>(`
      SELECT p.id, p.slug, p.name, p.feature_image,
             p.price, p.current_bid, p.min_bid_price,
             p.min_deposit, p.min_deposit_type, p.sale_type,
             p.bid_count, p.start_date, p.end_date,
             p.original_end_date, p.total_extensions, p.status,
             p.location,
             p.group_id, g.name AS group_name,
             CONCAT(m.first_name, ' ', m.last_name) AS merchant_name,
             m.custom_id AS merchant_custom_id,
             c.name AS category_name,
             (SELECT pg.image FROM product_galleries pg WHERE pg.product_id = p.id ORDER BY pg.sort_order LIMIT 1) AS gallery_image
      FROM products p
      INNER JOIN profiles m ON m.id = p.merchant_id
      LEFT JOIN groups g ON g.id = p.group_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE (p.store_id = $1 OR p.group_id IN (SELECT g2.id FROM groups g2 WHERE g2.store_id = $1))
        AND p.deleted_at IS NULL
        ${groupFilter}
        ${lotFilter}
      ORDER BY p.start_date DESC NULLS LAST
    `, lotsParams)

    // Process response
    const storeData = {
      id: store.id,
      slug: store.slug,
      name: pickLocale(store.name, locale),
      description: pickLocale(store.description, locale),
      logoUrl: store.logo,
      bannerUrl: store.cover_image,
      location: store.address ?? '',
      phone: store.phone,
      email: store.email,
      status: store.status,
      createdAt: store.created_at,
      auctionCount: parseInt(store.product_count),
      owner: {
        id: store.owner_id,
        name: locale === 'ar' && store.first_name_ar
          ? `${store.first_name_ar} ${store.last_name_ar || ''}`
          : `${store.first_name} ${store.last_name}`,
        customId: store.custom_id,
        image: store.owner_image,
      },
      groups: groups.map((g) => {
        const start = new Date(g.start_date)
        const end = new Date(g.end_date)
        const isLive = g.status === 'active' || (now >= start && now <= end)
        return {
          id: g.id,
          name: pickLocale(g.name, locale),
          description: pickLocale(g.description, locale),
          image: g.image,
          startDate: g.start_date,
          endDate: g.end_date,
          inspectionStartDate: g.inspection_start_date,
          inspectionEndDate: g.inspection_end_date,
          minDeposit: g.min_deposit,
          status: g.status,
          isLive,
          lotCount: parseInt(g.lot_count),
        }
      }),
      lots: lots.map((p) => {
        const auctionStatus = getAuctionStatus(p)
        return {
          id: p.id,
          slug: p.slug,
          name: pickLocale(p.name, locale),
          featureImage: p.feature_image || p.gallery_image,
          price: p.price,
          currentBid: p.current_bid,
          minBidPrice: p.min_bid_price,
          minDeposit: p.min_deposit,
          minDepositType: p.min_deposit_type,
          saleType: p.sale_type,
          bidCount: p.bid_count,
          startDate: p.start_date,
          endDate: p.end_date,
          originalEndDate: p.original_end_date,
          totalExtensions: p.total_extensions,
          status: auctionStatus,
          productStatus: p.status,
          location: p.location,
          groupId: p.group_id,
          groupName: p.group_name ? pickLocale(p.group_name, locale) : null,
          merchantName: p.merchant_name,
          merchantCustomId: p.merchant_custom_id,
          categoryName: p.category_name ? pickLocale(p.category_name, locale) : null,
        }
      }),
    }

    resolveImageFields(storeData, ['logoUrl', 'bannerUrl'])
    resolveImageFields([storeData.owner], ['image'])
    resolveImageFields(storeData.lots, ['featureImage'])
    resolveImageFields(storeData.groups, ['image'])

    res.json({ success: true, data: storeData })
  } catch (err) {
    next(err)
  }
})

function getAuctionStatus(row: { start_date?: string | null; end_date?: string | null; status: string }): 'upcoming' | 'live' | 'ended' {
  const now = new Date()
  if (row.status === 'closed') return 'ended'
  const start = row.start_date ? new Date(row.start_date) : null
  const end = row.end_date ? new Date(row.end_date) : null
  if (start && now < start) return 'upcoming'
  if (end && now > end) return 'ended'
  return 'live'
}

/** Single store with recent products */
router.get('/:id', validateUUID(), async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'

    const store = await queryOne<{
      id: string; slug: string; name: unknown; description: unknown
      logo: string | null; cover_image: string | null
      address: string | null; status: string
      created_at: string; product_count: string
    }>(`
      SELECT
        s.id, s.slug, s.name, s.description,
        s.logo, s.cover_image, s.address,
        s.status, s.created_at,
        (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) AS product_count
      FROM stores s
      WHERE s.id = $1
    `, [req.params.id])

    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' })
      return
    }

    // Get recent products for this store
    const products = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      current_bid: string; price: string; bid_count: number
      start_date: string | null; end_date: string | null; status: string
      created_at: string
    }>(`
      SELECT p.id, p.slug, p.name, p.feature_image,
             p.current_bid, p.price, p.bid_count,
             p.start_date, p.end_date, p.status, p.created_at
      FROM products p
      WHERE p.store_id = $1 AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT 12
    `, [req.params.id])

    const storeData = {
        id: store.id,
        slug: store.slug,
        name: pickLocale(store.name, locale),
        description: pickLocale(store.description, locale),
        logoUrl: store.logo,
        bannerUrl: store.cover_image,
        location: store.address ?? '',
        status: store.status,
        isFeatured: false,
        createdAt: store.created_at,
        productCount: parseInt(store.product_count),
        products: products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: pickLocale(p.name, locale),
          featureImage: p.feature_image,
          currentBid: p.current_bid,
          price: p.price,
          bidCount: p.bid_count,
          startDate: p.start_date,
          endDate: p.end_date,
          status: p.status,
          createdAt: p.created_at,
        })),
      }
    resolveImageFields(storeData, ['logoUrl', 'bannerUrl'])
    resolveImageFields(storeData.products, ['featureImage'])
    res.json({ success: true, data: storeData })
  } catch (err) {
    next(err)
  }
})

export { router as storeRoutes }
