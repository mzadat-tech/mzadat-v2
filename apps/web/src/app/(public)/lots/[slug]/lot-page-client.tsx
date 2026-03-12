'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Heart, Share2, MapPin, Eye, Gavel, Store, ArrowUpRight,
  Info, Shield, FileText, ChevronDown, ExternalLink, Copy, Check,
  Tag, Calendar, ClipboardList
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@mzadat/ui/components/tabs'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { toast } from 'sonner'

import type { ProductDetail } from '@/lib/data'
import { LotGallery } from '@/components/lot/lot-gallery'
import { ImageLightbox } from '@/components/lot/image-lightbox'
import { LotLocationMap } from '@/components/lot/lot-location-map'
import { BidEngine } from '@/components/lot/bid-engine'
import { BidHistoryTable } from '@/components/lot/bid-history-table'
import { useAuctionWs, type BidPayload } from '@/hooks/use-auction-ws'
import { checkRegistration } from '@/lib/registration-api'
import { placeBid } from '@/lib/bid-api'

interface LotPageClientProps {
  product: ProductDetail
  locale: string
  direction: 'rtl' | 'ltr'
  currentUserId: string | null
  isAdmin: boolean
}

export function LotPageClient({
  product,
  locale,
  direction,
  currentUserId,
  isAdmin,
}: LotPageClientProps) {
  const router = useRouter()
  const isAr = locale === 'ar'
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isShareCopied, setIsShareCopied] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  // ── Real-time state ────────────────────────────────
  const [liveBid, setLiveBid] = useState(product.currentBid)
  const [liveBidCount, setLiveBidCount] = useState(product.bidCount)
  const [liveBids, setLiveBids] = useState(product.recentBids)
  const [liveEndDate, setLiveEndDate] = useState(product.endDate)
  const [liveTotalExtensions, setLiveTotalExtensions] = useState(product.totalExtensions)
  const [liveStatus, setLiveStatus] = useState(product.status)

  // Deduplicates WS events: client subscribes to both auction+group rooms so each
  // bid event fires twice. Track seen bid IDs to ignore the duplicate.
  // Cap the dedup set to prevent unbounded memory growth on long auctions
  const seenBidIds = useRef(new Set<string>())
  const MAX_SEEN_BIDS = 500

  // ── Registration check ─────────────────────────────
  const isAuthenticated = !!currentUserId
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationLoaded, setRegistrationLoaded] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !product.groupId) return
    checkRegistration(product.groupId)
      .then((res) => setIsRegistered(res.registered))
      .catch(() => {})
      .finally(() => setRegistrationLoaded(true))
  }, [isAuthenticated, product.groupId])

  // ── WebSocket: real-time bid updates ───────────────
  const wsRooms = useMemo(() => {
    const r: string[] = [`auction:${product.id}`]
    if (product.groupId) r.push(`group:${product.groupId}`)
    return r
  }, [product.id, product.groupId])

  const handleWsBid = useCallback(
    (payload: BidPayload) => {
      if (payload.productId !== product.id) return
      // Guard against duplicate events (client subscribes to both auction + group rooms)
      if (seenBidIds.current.has(payload.bid.id)) return
      seenBidIds.current.add(payload.bid.id)
      if (seenBidIds.current.size > MAX_SEEN_BIDS) {
        const entries = [...seenBidIds.current]
        seenBidIds.current = new Set(entries.slice(-250))
      }

      const amount = Number(payload.bid.amount)
      setLiveBid(amount)
      setLiveBidCount((c) => c + 1)

      // Anti-snipe: update timer immediately without a page reload
      if (payload.isExtended && payload.newEndDate) {
        setLiveEndDate(new Date(payload.newEndDate))
        setLiveTotalExtensions((n) => n + 1)
      }

      setLiveBids((prev) => [
        {
          id: payload.bid.id,
          amount,
          isWinning: true,
          createdAt: payload.bid.createdAt,
          user: {
            id: payload.bid.userId,
            name: payload.bid.userName,
            customId: payload.bid.userCustomId,
          },
        },
        ...prev.map((b) => ({ ...b, isWinning: false })).slice(0, 19),
      ])
    },
    [product.id],
  )

  useAuctionWs({
    rooms: wsRooms,
    onBid: handleWsBid,
    onAuctionEnded: (p) => {
      if (p.productId === product.id) setLiveStatus('ended')
    },
    onAuctionExtended: (p) => {
      if (p.productId === product.id && 'newEndDate' in p) {
        setLiveEndDate(new Date(p.newEndDate as string))
      }
    },
    enabled: liveStatus === 'live',
  })

  const images = product.images.length > 0 ? product.images : product.image ? [product.image] : []

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard.writeText(url)
      setIsShareCopied(true)
      toast.success(isAr ? 'تم نسخ الرابط!' : 'Link copied!')
      setTimeout(() => setIsShareCopied(false), 2000)
    } catch {
      toast.error(isAr ? 'فشل نسخ الرابط' : 'Failed to copy link')
    }
  }

  async function handlePlaceBid(amount: number) {
    try {
      const result = await placeBid(product.id, amount)
      toast.success(
        result.isExtended
          ? (isAr ? 'تم تقديم المزايدة! تم تمديد المزاد.' : 'Bid placed! Auction extended due to last-minute bidding.')
          : (isAr ? `تم تقديم مزايدة بمبلغ ${formatOMR(amount)}` : `Bid of ${formatOMR(amount)} placed!`)
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bid failed'
      toast.error(isAr ? `فشل تقديم المزايدة: ${message}` : message)
    }
  }

  function handlePayDeposit() {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    router.push(`/checkout/${product.groupId}`)
  }

  function handleLogin() {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Breadcrumb ─── */}
      <div>
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="transition-colors hover:text-slate-600">
              {isAr ? 'الرئيسية' : 'Home'}
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/auctions" className="transition-colors hover:text-slate-600">
              {isAr ? 'المزادات' : 'Auctions'}
            </Link>
            {product.groupName && (
              <>
                <span className="text-slate-300">/</span>
                <Link
                  href={`/auctions/groups/${product.groupSlug || product.groupId}`}
                  className="transition-colors hover:text-slate-600"
                >
                  {product.groupName}
                </Link>
              </>
            )}
            <span className="text-slate-300">/</span>
            <span className="max-w-[200px] truncate text-slate-600">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ═══════════════════════════════════════════
              LEFT COLUMN — Gallery + Map + Details
              ═══════════════════════════════════════════ */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Gallery */}
              <LotGallery
                images={images}
                name={product.name}
                status={product.status}
                direction={direction}
                isAr={isAr}
                onImageClick={handleImageClick}
              />

              {/* Location Map — positioned below gallery with faded aesthetic */}
              {/* {product.location && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <LotLocationMap location={product.location} isAr={isAr} />
                </motion.div>
              )} */}

              {/* ─── Details Tabs (Desktop) ─── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden lg:block"
              >
                <DetailsTabs product={product} isAr={isAr} />
              </motion.div>
            </motion.div>
          </div>

          {/* ═══════════════════════════════════════════
              RIGHT COLUMN — Sticky Bid Engine + Info
              ═══════════════════════════════════════════ */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="space-y-3"
              >
                {/* ─── Category & Actions ─── */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {product.categoryName && (
                      <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-600">
                        <Tag className="me-1 h-3 w-3" />
                        {product.categoryName}
                      </Badge>
                    )}
                    {product.saleType === 'direct' && (
                      <Badge className="rounded-full border-0 bg-primary-100 px-3 text-xs font-semibold text-primary-700">
                        {isAr ? 'بيع مباشر' : 'Direct Sale'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-9 w-9 rounded-full', isLiked && 'text-accent-500')}
                      onClick={() => setIsLiked(!isLiked)}
                    >
                      <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={handleShare}>
                      {isShareCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* ─── Title ─── */}
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                    {product.name}
                  </h1>
                  {product.groupName && (
                    <Link
                      href={`/auctions/groups/${product.groupSlug || product.groupId}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                      {product.groupName}
                    </Link>
                  )}
                  {product.shortDescription && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                      {product.shortDescription}
                    </p>
                  )}
                </div>

                {/* ─── Meta Info ─── */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-400">
                  {product.storeName && (
                    <Link
                      href={`/shops/${product.storeSlug}`}
                      className="flex items-center gap-1 font-medium text-primary-600 transition-colors hover:text-primary-700"
                    >
                      <Store className="h-3.5 w-3.5" />
                      {product.storeName}
                    </Link>
                  )}
                  {product.location && (
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(product.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-600 transition-colors hover:text-primary-700"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {isAr ? 'عرض الموقع' : 'View Location'}
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {product.viewCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gavel className="h-3.5 w-3.5" />
                    {liveBidCount} {isAr ? 'مزايدة' : 'bids'}
                  </span>
                </div>

                <Separator className="bg-slate-100" />

                {/* ─── Bid Engine ─── */}
                <BidEngine
                  currentBid={liveBid}
                  startingPrice={product.startingPrice}
                  bidIncrements={product.bidIncrements}
                  depositAmount={product.depositAmount}
                  depositType={product.depositType}
                  status={liveStatus}
                  startDate={product.startDate}
                  endDate={liveEndDate}
                  totalExtensions={liveTotalExtensions}
                  isRegistered={isRegistered}
                  isAuthenticated={isAuthenticated}
                  isAr={isAr}
                  onPlaceBid={handlePlaceBid}
                  onPayDeposit={handlePayDeposit}
                  onLogin={handleLogin}
                />

                {/* ─── Bid History ─── */}
                <BidHistoryTable
                  bids={liveBids}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isAr={isAr}
                  bidCount={liveBidCount}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ─── Details Tabs (Mobile) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 lg:hidden"
        >
          <DetailsTabs product={product} isAr={isAr} />
        </motion.div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}

/* ─── Shared Details Tabs Component ─── */
function DetailsTabs({ product, isAr }: { product: ProductDetail; isAr: boolean }) {
  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList className="w-full justify-start rounded-xl bg-slate-100/80 p-1">
        <TabsTrigger
          value="description"
          className="rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <FileText className="me-1.5 h-3.5 w-3.5" />
          {isAr ? 'الوصف' : 'Description'}
        </TabsTrigger>
        <TabsTrigger
          value="specifications"
          className="rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <ClipboardList className="me-1.5 h-3.5 w-3.5" />
          {isAr ? 'المواصفات' : 'Specifications'}
        </TabsTrigger>
        <TabsTrigger
          value="terms"
          className="rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <Shield className="me-1.5 h-3.5 w-3.5" />
          {isAr ? 'الشروط' : 'Terms'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-5">
        <div className="prose prose-sm prose-slate max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-600">
            {product.description || (isAr ? 'لا يوجد وصف متاح' : 'No description available')}
          </p>
          {product.inspectionNotes && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                <Calendar className="h-3.5 w-3.5" />
                {isAr ? 'ملاحظات المعاينة' : 'Inspection Notes'}
              </p>
              <p className="mt-2 text-sm text-blue-800">{product.inspectionNotes}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="specifications" className="mt-5">
        {product.specifications.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {product.specifications.map((spec, i) => (
              <div
                key={i}
                className={cn(
                  'grid grid-cols-3 gap-4 px-4 py-3 text-sm',
                  i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white',
                )}
              >
                <span className="font-medium text-slate-600">{spec.key}</span>
                <span className="col-span-2 text-slate-800">{spec.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            {isAr ? 'لا توجد مواصفات متاحة' : 'No specifications available'}
          </p>
        )}
      </TabsContent>

      <TabsContent value="terms" className="mt-5">
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isAr ? 'شروط المزايدة' : 'Bidding Terms'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {isAr
                  ? 'يجب إيداع التأمين المطلوب قبل المشاركة في المزاد. المزايدة ملزمة وغير قابلة للإلغاء.'
                  : 'Required deposit must be submitted before participating. Bids are binding and non-reversible.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isAr ? 'ضمان الشفافية' : 'Transparency Guarantee'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {isAr
                  ? 'جميع المزايدات شفافة ويتم تسجيلها. يفوز صاحب أعلى مزايدة عند انتهاء المزاد.'
                  : 'All bids are transparent and recorded. The highest bidder wins when the auction ends.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isAr ? 'سياسة مكافحة القنص' : 'Anti-Sniping Policy'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {isAr
                  ? 'المزايدات في اللحظات الأخيرة قد تمدد المزاد تلقائياً لضمان تكافؤ الفرص.'
                  : 'Last-second bids may automatically extend the auction to ensure fair bidding opportunity.'}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
