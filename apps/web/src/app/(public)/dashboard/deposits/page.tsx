'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Eye,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'

type DepositStatus = 'held' | 'refunded' | 'forfeited' | 'applied'

interface Deposit {
  id: string
  auctionTitle: string
  auctionSlug: string
  amount: number
  paidAt: string
  status: DepositStatus
  groupName?: string
}

const mockDeposits: Deposit[] = [
  {
    id: '1',
    auctionTitle: 'مجموعة سيارات مارس 2024',
    auctionSlug: 'march-cars-2024',
    amount: 200,
    paidAt: '2024-03-10',
    status: 'held',
    groupName: 'مزاد السيارات',
  },
  {
    id: '2',
    auctionTitle: 'مجموعة العقارات',
    auctionSlug: 'real-estate-group',
    amount: 500,
    paidAt: '2024-03-05',
    status: 'held',
    groupName: 'مزاد العقارات',
  },
  {
    id: '3',
    auctionTitle: 'مزاد الإلكترونيات',
    auctionSlug: 'electronics-auction',
    amount: 100,
    paidAt: '2024-02-28',
    status: 'refunded',
  },
  {
    id: '4',
    auctionTitle: 'مزاد الأثاث',
    auctionSlug: 'furniture-auction',
    amount: 150,
    paidAt: '2024-02-20',
    status: 'applied',
  },
]

export default function DepositsPage() {
  const isAr = false

  const statusConfig: Record<DepositStatus, { label: string; icon: React.ElementType; class: string }> = {
    held: {
      label: isAr ? 'محجوز' : 'Held',
      icon: Clock,
      class: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    refunded: {
      label: isAr ? 'مسترد' : 'Refunded',
      icon: RefreshCcw,
      class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    forfeited: {
      label: isAr ? 'مصادر' : 'Forfeited',
      icon: XCircle,
      class: 'bg-red-100 text-red-700 border-red-200',
    },
    applied: {
      label: isAr ? 'مخصم من الثمن' : 'Applied to Purchase',
      icon: CheckCircle2,
      class: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  }

  const totalHeld = mockDeposits
    .filter((d) => d.status === 'held')
    .reduce((sum, d) => sum + d.amount, 0)

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">{isAr ? 'التأمينات' : 'Deposits'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'تأمينات المزادات المدفوعة وحالتها' : 'Your auction deposits and their status'}
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-purple-50 p-2.5">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي التأمينات' : 'Total Deposits'}</p>
              <p className="text-xl font-bold">{mockDeposits.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'المحجوز حالياً' : 'Currently Held'}</p>
              <p className="text-xl font-bold">{formatOMR(totalHeld)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <RefreshCcw className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'المسترد' : 'Refunded'}</p>
              <p className="text-xl font-bold">
                {formatOMR(
                  mockDeposits.filter((d) => d.status === 'refunded').reduce((s, d) => s + d.amount, 0),
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deposits List */}
      <div className="space-y-3">
        {mockDeposits.map((deposit) => {
          const config = statusConfig[deposit.status]
          const StatusIcon = config.icon
          return (
            <motion.div key={deposit.id} variants={staggerItem}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary-50 p-2">
                        <CreditCard className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <Link
                          href={`/auctions/${deposit.auctionSlug}`}
                          className="font-semibold text-foreground hover:text-primary-600 hover:underline"
                        >
                          {deposit.auctionTitle}
                        </Link>
                        {deposit.groupName && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{deposit.groupName}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isAr ? 'تاريخ الدفع:' : 'Paid:'} {deposit.paidAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-end">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {isAr ? 'مبلغ التأمين' : 'Deposit'}
                        </p>
                        <p className="text-lg font-bold text-foreground">{formatOMR(deposit.amount)}</p>
                      </div>
                      <Badge variant="outline" className={`gap-1 ${config.class}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
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
