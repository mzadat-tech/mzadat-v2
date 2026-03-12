import type { Locale } from '@/lib/i18n'

// ─── API base URL (internal server-side fetch) ───
const API_BASE = process.env.API_URL || 'http://localhost:8080/api'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 30 },
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  const json = await res.json()
  return json as T
}

// ─── Types ───
export interface AuctionGroup {
  id: string
  name: string
  slug: string
  description: string
  image: string | null
  startDate: Date | null
  endDate: Date | null
  inspectionStartDate: Date | null
  inspectionEndDate: Date | null
  inspectionLocation: string
  minDeposit: number
  status: string
  isLive: boolean
  productCount: number
  storeSlug: string | null
  merchant: {
    id: string
    name: string
    customId: string
  }
}

export interface ProductCard {
  id: string
  name: string
  slug: string
  description: string
  image: string | null
  images: string[]
  categoryName: string
  categorySlug: string
  storeName: string
  storeSlug: string
  location: string
  saleType: string
  startingPrice: number
  currentBid: number
  bidCount: number
  startDate: Date | null
  endDate: Date | null
  status: string
  groupId: string | null
  groupName: string | null
  groupSlug: string | null
}

export interface ProductDetail extends ProductCard {
  shortDescription: string
  specifications: Array<{ key: string; value: string }>
  bidIncrements: number[]
  depositAmount: number
  depositType: string
  seoTitle: string
  seoDescription: string
  viewCount: number
  watchlistCount: number
  inspectionNotes: string | null
  groupStatus: string | null
  merchant: { id: string; name: string; customId: string; image: string | null }
  recentBids: Array<{
    id: string
    amount: number
    isWinning: boolean
    createdAt: string
    user: { id: string; name: string; customId: string }
  }>
  originalEndDate: Date | null
  totalExtensions: number
}

// ─── API response types ───
interface ApiAuctionItem {
  id: string
  slug: string
  name: string
  featureImage: string | null
  currentBid: string
  minBidPrice: string
  price: string
  bidCount: number
  startDate: string | null
  endDate: string | null
  originalEndDate?: string | null
  totalExtensions?: number
  status: string
  saleType?: string
  location?: string
  categoryName?: string
  categorySlug?: string
  storeName?: string
  storeSlug?: string
  group: { id: string; name: string } | null
  merchant?: { id: string; name: string; customId: string }
}

interface ApiAuctionDetail {
  id: string
  slug: string
  name: string
  description: string
  featureImage: string | null
  gallery: Array<{ id: string; image: string; sortOrder: number }>
  specifications: Array<{ id: string; label: string; value: string }>
  saleType: string
  price: string
  minBidPrice: string
  reservePrice: string | null
  currentBid: string
  bidIncrement1: string
  bidIncrement2: string | null
  bidIncrement3: string | null
  bidIncrement4: string | null
  minDeposit: string
  minDepositType: string
  startDate: string | null
  endDate: string | null
  originalEndDate?: string | null
  totalExtensions: number
  bidCount: number
  viewCount: number
  watchlistCount: number
  location: string | null
  inspectionNotes: string | null
  status: string
  productStatus: string
  group: { id: string; name: string; status: string } | null
  shortDescription?: string
  merchant: { id: string; name: string; customId: string; image: string | null }
  recentBids: Array<{
    id: string; amount: string; isWinning: boolean; createdAt: string
    user: { id: string; name: string; customId: string }
  }>
}

interface ApiGroupItem {
  id: string
  name: string
  description: string
  image: string | null
  startDate: string
  endDate: string
  inspectionStartDate: string | null
  inspectionEndDate: string | null
  minDeposit: string
  status: string
  isLive: boolean
  lotCount: number
  storeSlug: string | null
  merchant: { id: string; name: string; customId: string }
}

interface ApiStoreItem {
  id: string
  slug: string
  name: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  location: string
  status: string
  isFeatured: boolean
  createdAt: string
  productCount: number
}

// ─── Helpers to convert API response to our types ───

function toProductCard(item: ApiAuctionItem): ProductCard {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: '',
    image: item.featureImage,
    images: item.featureImage ? [item.featureImage] : [],
    categoryName: item.categoryName || '',
    categorySlug: item.categorySlug || '',
    storeName: item.storeName || item.merchant?.name || '',
    storeSlug: item.storeSlug || '',
    location: item.location || '',
    saleType: item.saleType || 'auction',
    startingPrice: Number(item.minBidPrice) || Number(item.price) || 0,
    currentBid: Number(item.currentBid || 0),
    bidCount: item.bidCount,
    startDate: item.startDate ? new Date(item.startDate) : null,
    endDate: item.endDate ? new Date(item.endDate) : null,
    status: item.status,
    groupId: item.group?.id || null,
    groupName: item.group?.name || null,
    groupSlug: null,
  }
}

function toProductDetail(item: ApiAuctionDetail): ProductDetail {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    shortDescription: item.shortDescription || '',
    image: item.featureImage || item.gallery[0]?.image,
    images: [
      ...(item.featureImage ? [item.featureImage] : []),
      ...item.gallery.map((g) => g.image).filter((img) => img !== item.featureImage),
    ],
    categoryName: '',
    categorySlug: '',
    storeName: item.merchant?.name || '',
    storeSlug: '',
    location: item.location || '',
    saleType: item.saleType,
    startingPrice: Number(item.minBidPrice) || Number(item.price) || 0,
    currentBid: Number(item.currentBid || 0),
    bidCount: item.bidCount,
    startDate: item.startDate ? new Date(item.startDate) : null,
    endDate: item.endDate ? new Date(item.endDate) : null,
    originalEndDate: item.originalEndDate ? new Date(item.originalEndDate) : null,
    totalExtensions: item.totalExtensions,
    status: item.status,
    groupId: item.group?.id || null,
    groupName: item.group?.name || null,
    groupSlug: null,
    groupStatus: item.group?.status || null,
    specifications: item.specifications.map((s) => ({
      key: s.label,
      value: s.value,
    })),
    bidIncrements: [
      Number(item.bidIncrement1 || 1),
      Number(item.bidIncrement2 || 5),
      Number(item.bidIncrement3 || 10),
      Number(item.bidIncrement4 || 50),
    ],
    depositAmount: Number(item.minDeposit || 0),
    depositType: item.minDepositType || 'fixed',
    seoTitle: item.name,
    seoDescription: item.description,
    viewCount: item.viewCount,
    watchlistCount: item.watchlistCount,
    inspectionNotes: item.inspectionNotes || null,
    merchant: item.merchant,
    recentBids: item.recentBids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      isWinning: b.isWinning,
      createdAt: b.createdAt,
      user: b.user,
    })),
  }
}

// ─── Queries (API-based) ───

export async function getLiveAuctions(locale: Locale, limit = 12): Promise<ProductCard[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiAuctionItem[]; total: number }>(
      `/auctions/live?locale=${locale}&limit=${limit}`
    )
    return res.data.map(toProductCard)
  } catch {
    return []
  }
}

export async function getUpcomingAuctions(locale: Locale, limit = 12): Promise<ProductCard[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiAuctionItem[]; total: number }>(
      `/auctions/upcoming?locale=${locale}&limit=${limit}`
    )
    return res.data.map(toProductCard)
  } catch {
    return []
  }
}

export async function getProductBySlug(slug: string, locale: Locale): Promise<ProductDetail | null> {
  try {
    // Never cache lot detail — it contains live bid data (current bid, recent bids).
    const res = await apiFetch<{ success: boolean; data: ApiAuctionDetail }>(
      `/auctions/by-slug/${encodeURIComponent(slug)}?locale=${locale}`,
      { cache: 'no-store' },
    )
    return toProductDetail(res.data)
  } catch {
    return null
  }
}

export async function getAuctionGroups(locale: Locale, status?: string, limit = 50): Promise<AuctionGroup[]> {
  try {
    const statusParam = status ? `&status=${status}` : ''
    const res = await apiFetch<{ success: boolean; data: ApiGroupItem[]; total: number }>(
      `/groups?locale=${locale}${statusParam}&limit=${limit}`
    )
    return res.data.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.id,
      description: g.description,
      image: g.image,
      startDate: g.startDate ? new Date(g.startDate) : null,
      endDate: g.endDate ? new Date(g.endDate) : null,
      inspectionStartDate: g.inspectionStartDate ? new Date(g.inspectionStartDate) : null,
      inspectionEndDate: g.inspectionEndDate ? new Date(g.inspectionEndDate) : null,
      inspectionLocation: '',
      minDeposit: Number(g.minDeposit),
      status: g.status,
      isLive: g.isLive,
      productCount: g.lotCount,
      storeSlug: g.storeSlug || null,
      merchant: g.merchant,
    }))
  } catch {
    return []
  }
}

export async function searchProducts(
  queryStr: string,
  locale: Locale,
  limit = 20,
  page = 1,
) {
  try {
    const offset = (page - 1) * limit
    const res = await apiFetch<{ success: boolean; data: ApiAuctionItem[]; total: number }>(
      `/auctions/search?q=${encodeURIComponent(queryStr)}&locale=${locale}&limit=${limit}&offset=${offset}`
    )
    return {
      products: res.data.map(toProductCard),
      total: res.total,
      totalPages: Math.ceil(res.total / limit),
      page,
    }
  } catch {
    return { products: [], total: 0, totalPages: 0, page }
  }
}

export async function getFeaturedStores(locale: Locale = 'ar', limit = 6) {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiStoreItem[]; total: number }>(
      `/stores?locale=${locale}&limit=${limit}&featured=true`
    )
    return res.data.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logo: s.logoUrl,
      logoUrl: s.logoUrl,
      banner: s.bannerUrl,
      location: s.location,
      productCount: s.productCount,
    }))
  } catch {
    return []
  }
}

export async function getEndedAuctions(locale: Locale, limit = 12): Promise<ProductCard[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiAuctionItem[]; total: number }>(
      `/auctions/ended?locale=${locale}&limit=${limit}`
    )
    return res.data.map(toProductCard)
  } catch {
    return []
  }
}

export async function getDirectSaleProducts(locale: Locale, limit = 12): Promise<ProductCard[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiAuctionItem[]; total: number }>(
      `/auctions/direct?locale=${locale}&limit=${limit}`
    )
    return res.data.map(toProductCard)
  } catch {
    return []
  }
}

// ─── Categories ───

export interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string
  image: string | null
  icon: string | null
  parentId: string | null
  productCount: number
  children?: CategoryItem[]
}

interface ApiCategoryItem {
  id: string
  name: string
  slug: string
  description: string
  image: string | null
  icon: string | null
  parentId: string | null
  productCount: number
  children?: ApiCategoryItem[]
}

export async function getCategories(locale: Locale, rootOnly = true, limit = 20): Promise<CategoryItem[]> {
  try {
    const res = await apiFetch<{ success: boolean; data: ApiCategoryItem[]; total: number }>(
      `/categories?locale=${locale}&rootOnly=${rootOnly ? '1' : '0'}&limit=${limit}`
    )
    return res.data.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      icon: c.icon,
      parentId: c.parentId,
      productCount: c.productCount,
    }))
  } catch {
    return []
  }
}

// ─── Featured Stores with lots ───

export interface FeaturedStore {
  id: string
  name: string
  slug: string
  description: string
  logo: string | null
  logoUrl: string | null
  banner: string | null
  location: string
  productCount: number
}

export async function getStats() {
  try {
    const res = await apiFetch<{
      success: boolean
      data: { totalAuctions: number; totalBids: number; totalUsers: number }
    }>('/auctions/stats')
    return res.data
  } catch {
    return { totalAuctions: 0, totalBids: 0, totalUsers: 0 }
  }
}

// ─── Store Detail ───

export interface StoreLot {
  id: string
  slug: string
  name: string
  featureImage: string | null
  price: string
  currentBid: string
  minBidPrice: string
  minDeposit: string
  minDepositType: string
  saleType: string
  bidCount: number
  startDate: string | null
  endDate: string | null
  originalEndDate: string | null
  totalExtensions: number
  status: 'live' | 'upcoming' | 'ended'
  productStatus: string
  location: string | null
  groupId: string | null
  groupName: string | null
  merchantName: string
  merchantCustomId: string
  categoryName: string | null
}

export interface StoreGroup {
  id: string
  name: string
  description: string
  image: string | null
  startDate: string
  endDate: string
  inspectionStartDate: string | null
  inspectionEndDate: string | null
  minDeposit: string
  status: string
  isLive: boolean
  lotCount: number
}

export interface StoreDetail {
  id: string
  slug: string
  name: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  location: string
  phone: string | null
  email: string | null
  status: string
  createdAt: string
  auctionCount: number
  owner: {
    id: string
    name: string
    customId: string
    image: string | null
  }
  groups: StoreGroup[]
  lots: StoreLot[]
}

export async function getStoreBySlug(
  slug: string,
  locale: Locale = 'en',
  tab: 'live' | 'past' = 'live',
  groupId?: string,
): Promise<StoreDetail | null> {
  try {
    let path = `/stores/by-slug/${encodeURIComponent(slug)}?locale=${locale}&tab=${tab}`
    if (groupId) path += `&group=${encodeURIComponent(groupId)}`
    const res = await apiFetch<{ success: boolean; data: StoreDetail }>(path)
    return res.data
  } catch {
    return null
  }
}
