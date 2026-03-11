'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Download,
  Eye,
} from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'

type WonStatus = 'pending_payment' | 'paid' | 'completed' | 'expired'

interface WonAuction {
  id: string
  slug: string
  title: string
  finalPrice: number
  wonAt: string
  paymentDeadline: string
  status: WonStatus
}

const mockWonAuctions: WonAuction[] = [
  {
    id: '1',
    slug: 'iphone-15-pro-max',
    title: 'هاتف آيفون 15 برو ماكس',
    finalPrice: 380,
    wonAt: '2024-03-13',
    paymentDeadline: '2024-03-16',
    status: 'pending_payment',
  },
  {
    id: '2',
    slug: 'honda-civic-2023',
    title: 'سيارة هوندا سيفيك 2023',
    finalPrice: 8500,
    wonAt: '2024-03-10',
    paymentDeadline: '2024-03-13',
    status: 'paid',
  },
  {
    id: '3',
    slug: 'samsung-tv-65',
    title: 'تلفزيون سامسونج 65 بوصة',
    finalPrice: 220,
    wonAt: '2024-02-28',
    paymentDeadline: '2024-03-03',
    status: 'completed',
  },
]

export default function WonAuctionsPage() {
  const isAr = false

  const statusConfig: Record<WonStatus, { label: string; icon: React.ElementType; class: string }> = {
    pending_payment: {
      label: isAr ? 'بانتظار الدفع' : 'Pending Payment',
      icon: AlertCircle,
      class: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    paid: {
      label: isAr ? 'تم الدفع' : 'Paid',
      icon: CreditCard,
      class: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    completed: {
      label: isAr ? 'مكتمل' : 'Completed',
      icon: CheckCircle2,
      class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    expired: {
      label: isAr ? 'منتهي' : 'Expired',
      icon: Clock,
      class: 'bg-red-100 text-red-700 border-red-200',
    },
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">{isAr ? 'المزادات الفائزة' : 'Won Auctions'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'المزادات التي فزت بها وحالة الدفع' : 'Auctions you have won and payment status'}
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الفائزة' : 'Total Won'}</p>
              <p className="text-xl font-bold">{mockWonAuctions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-red-50 p-2.5">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'بانتظار الدفع' : 'Pending'}</p>
              <p className="text-xl font-bold">
                {mockWonAuctions.filter((a) => a.status === 'pending_payment').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'مكتملة' : 'Completed'}</p>
              <p className="text-xl font-bold">
                {mockWonAuctions.filter((a) => a.status === 'completed').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Won Auctions List */}
      <div className="space-y-3">
        {mockWonAuctions.map((auction) => {
          const config = statusConfig[auction.status]
          const StatusIcon = config.icon
          return (
            <motion.div key={auction.id} variants={staggerItem}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <div className="rounded-lg bg-amber-50 p-2">
                          <Trophy className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <Link
                            href={`/auctions/${auction.slug}`}
                            className="font-semibold text-foreground hover:text-primary-600 hover:underline"
                          >
                            {auction.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{isAr ? 'تاريخ الفوز:' : 'Won:'} {auction.wonAt}</span>
                            {auction.status === 'pending_payment' && (
                              <span className="text-red-600">
                                {isAr ? 'آخر موعد للدفع:' : 'Pay by:'} {auction.paymentDeadline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 sm:items-center sm:flex-row sm:gap-4">
                      <div className="text-end sm:text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {isAr ? 'السعر النهائي' : 'Final Price'}
                        </p>
                        <p className="text-lg font-bold text-primary-700">{formatOMR(auction.finalPrice)}</p>
                      </div>

                      <Badge variant="outline" className={`gap-1 ${config.class}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>

                      <div className="flex gap-2">
                        {auction.status === 'pending_payment' && (
                          <Button size="sm" className="gap-1.5 text-xs">
                            <CreditCard className="h-3 w-3" />
                            {isAr ? 'ادفع الآن' : 'Pay Now'}
                          </Button>
                        )}
                        {auction.status === 'completed' && (
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Download className="h-3 w-3" />
                            {isAr ? 'الفاتورة' : 'Invoice'}
                          </Button>
                        )}
                        <Link href={`/auctions/${auction.slug}`}>
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
