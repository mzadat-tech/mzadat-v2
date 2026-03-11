'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Gavel,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzadat/ui/components/tabs'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'

type BidStatus = 'winning' | 'outbid' | 'won' | 'lost'

interface Bid {
  id: string
  auctionId: string
  slug: string
  title: string
  image?: string
  bidAmount: number
  currentPrice: number
  myBidTime: string
  endsAt: string
  status: BidStatus
}

const mockBids: Bid[] = [
  {
    id: '1',
    auctionId: 'a1',
    slug: 'toyota-land-cruiser-2022',
    title: 'سيارة تويوتا لاندكروزر 2022',
    bidAmount: 15500,
    currentPrice: 15500,
    myBidTime: '2024-03-15 14:30',
    endsAt: '2024-03-20 18:00',
    status: 'winning',
  },
  {
    id: '2',
    auctionId: 'a2',
    slug: 'residential-land-salalah',
    title: 'أرض سكنية - صلالة',
    bidAmount: 42000,
    currentPrice: 43500,
    myBidTime: '2024-03-14 10:15',
    endsAt: '2024-03-18 20:00',
    status: 'outbid',
  },
  {
    id: '3',
    auctionId: 'a3',
    slug: 'iphone-15-pro-max',
    title: 'هاتف آيفون 15 برو ماكس',
    bidAmount: 380,
    currentPrice: 380,
    myBidTime: '2024-03-13 09:00',
    endsAt: '2024-03-16 12:00',
    status: 'won',
  },
  {
    id: '4',
    auctionId: 'a4',
    slug: 'office-furniture-set',
    title: 'أثاث مكتبي كامل',
    bidAmount: 1200,
    currentPrice: 1350,
    myBidTime: '2024-03-12 16:45',
    endsAt: '2024-03-14 22:00',
    status: 'lost',
  },
  {
    id: '5',
    auctionId: 'a5',
    slug: 'nissan-patrol-2021',
    title: 'نيسان باترول 2021',
    bidAmount: 12000,
    currentPrice: 12000,
    myBidTime: '2024-03-15 11:00',
    endsAt: '2024-03-22 16:00',
    status: 'winning',
  },
]

export default function BidsPage() {
  const isAr = false
  const [filter, setFilter] = useState<'all' | BidStatus>('all')
  const [search, setSearch] = useState('')

  const statusConfig: Record<BidStatus, { label: string; class: string }> = {
    winning: { label: isAr ? 'متصدر' : 'Winning', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    outbid: { label: isAr ? 'تم المزايدة عليك' : 'Outbid', class: 'bg-red-100 text-red-700 border-red-200' },
    won: { label: isAr ? 'فزت' : 'Won', class: 'bg-amber-100 text-amber-700 border-amber-200' },
    lost: { label: isAr ? 'خسرت' : 'Lost', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  }

  const filteredBids = mockBids.filter((bid) => {
    if (filter !== 'all' && bid.status !== filter) return false
    if (search && !bid.title.includes(search)) return false
    return true
  })

  const activeBids = mockBids.filter((b) => b.status === 'winning' || b.status === 'outbid').length
  const wonBids = mockBids.filter((b) => b.status === 'won').length

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'مزايداتي' : 'My Bids'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr ? 'تتبع جميع مزايداتك النشطة والسابقة' : 'Track all your active and past bids'}
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Gavel className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المزايدات' : 'Total Bids'}</p>
              <p className="text-xl font-bold">{mockBids.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'مزايدات نشطة' : 'Active Bids'}</p>
              <p className="text-xl font-bold">{activeBids}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <Gavel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'مزادات فائزة' : 'Won'}</p>
              <p className="text-xl font-bold">{wonBids}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={isAr ? 'البحث في المزايدات...' : 'Search bids...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'winning', 'outbid', 'won', 'lost'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {f === 'all'
                      ? isAr ? 'الكل' : 'All'
                      : statusConfig[f].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bids List */}
      <motion.div variants={fadeInUp} className="space-y-3">
        {filteredBids.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Gavel className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="font-semibold text-foreground">
                {isAr ? 'لا توجد مزايدات' : 'No bids found'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAr ? 'لم يتم العثور على مزايدات مطابقة' : 'No matching bids found'}
              </p>
              <Link href="/auctions">
                <Button className="mt-4" size="sm">
                  {isAr ? 'تصفح المزادات' : 'Browse Auctions'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredBids.map((bid, i) => (
            <motion.div key={bid.id} variants={staggerItem}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image placeholder */}
                    <div className="flex h-32 w-full items-center justify-center bg-muted sm:h-auto sm:w-40">
                      <Gavel className="h-8 w-8 text-muted-foreground/30" />
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/auctions/${bid.slug}`}
                            className="font-semibold text-foreground hover:text-primary-600 hover:underline"
                          >
                            {bid.title}
                          </Link>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${statusConfig[bid.status].class}`}
                          >
                            {statusConfig[bid.status].label}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {bid.myBidTime}
                          </span>
                          <span>
                            {isAr ? 'ينتهي:' : 'Ends:'} {bid.endsAt}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {isAr ? 'مزايدتي' : 'My Bid'}
                            </p>
                            <p className="text-sm font-bold text-foreground">{formatOMR(bid.bidAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {isAr ? 'السعر الحالي' : 'Current'}
                            </p>
                            <p className="text-sm font-bold text-primary-700">{formatOMR(bid.currentPrice)}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {bid.status === 'outbid' && (
                            <Link href={`/auctions/${bid.slug}`}>
                              <Button size="sm" className="gap-1.5 text-xs">
                                <RotateCcw className="h-3 w-3" />
                                {isAr ? 'زايد مرة أخرى' : 'Re-bid'}
                              </Button>
                            </Link>
                          )}
                          <Link href={`/auctions/${bid.slug}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                              <Eye className="h-3 w-3" />
                              {isAr ? 'عرض' : 'View'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  )
}
