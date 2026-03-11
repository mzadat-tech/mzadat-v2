'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Gavel,
  Trophy,
  Wallet,
  CreditCard,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Badge } from '@mzadat/ui/components/badge'
import { Button } from '@mzadat/ui'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'

export default function DashboardPage() {
  const isAr = false

  const stats = [
    {
      label: isAr ? 'المزايدات النشطة' : 'Active Bids',
      value: '12',
      icon: Gavel,
      change: '+3',
      trend: 'up' as const,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: isAr ? 'المزادات الفائزة' : 'Won Auctions',
      value: '5',
      icon: Trophy,
      change: '+1',
      trend: 'up' as const,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: isAr ? 'رصيد المحفظة' : 'Wallet Balance',
      value: formatOMR(1250),
      icon: Wallet,
      change: '-200',
      trend: 'down' as const,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: isAr ? 'التأمينات المحجوزة' : 'Held Deposits',
      value: formatOMR(500),
      icon: CreditCard,
      change: '+150',
      trend: 'up' as const,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  const recentBids = [
    {
      id: '1',
      title: isAr ? 'سيارة تويوتا لاندكروزر 2022' : 'Toyota Land Cruiser 2022',
      amount: 15500,
      time: isAr ? 'منذ 5 دقائق' : '5 mins ago',
      status: 'winning' as const,
    },
    {
      id: '2',
      title: isAr ? 'أرض سكنية - صلالة' : 'Residential Land - Salalah',
      amount: 42000,
      time: isAr ? 'منذ ساعة' : '1 hour ago',
      status: 'outbid' as const,
    },
    {
      id: '3',
      title: isAr ? 'هاتف آيفون 15 برو' : 'iPhone 15 Pro',
      amount: 380,
      time: isAr ? 'منذ 3 ساعات' : '3 hours ago',
      status: 'winning' as const,
    },
    {
      id: '4',
      title: isAr ? 'أثاث مكتبي كامل' : 'Complete Office Furniture',
      amount: 1200,
      time: isAr ? 'أمس' : 'Yesterday',
      status: 'ended' as const,
    },
  ]

  const recentTransactions = [
    {
      id: '1',
      type: 'deposit' as const,
      amount: 500,
      date: '2024-03-15',
      description: isAr ? 'إيداع في المحفظة' : 'Wallet Deposit',
    },
    {
      id: '2',
      type: 'hold' as const,
      amount: 200,
      date: '2024-03-14',
      description: isAr ? 'تأمين مزاد #1234' : 'Auction #1234 Deposit',
    },
    {
      id: '3',
      type: 'refund' as const,
      amount: 150,
      date: '2024-03-13',
      description: isAr ? 'استرداد تأمين مزاد #1200' : 'Auction #1200 Refund',
    },
  ]

  const statusBadge = (status: 'winning' | 'outbid' | 'ended') => {
    const config = {
      winning: { label: isAr ? 'متصدر' : 'Winning', class: 'bg-emerald-100 text-emerald-700' },
      outbid: { label: isAr ? 'تم المزايدة عليك' : 'Outbid', class: 'bg-red-100 text-red-700' },
      ended: { label: isAr ? 'انتهى' : 'Ended', class: 'bg-gray-100 text-gray-600' },
    }
    const c = config[status]
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.class}`}>{c.label}</span>
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Page Title */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold text-foreground">
          {isAr ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'نظرة عامة على نشاطك في المنصة' : 'Overview of your platform activity'}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1.5 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">
                    {isAr ? 'هذا الشهر' : 'this month'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bids */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                {isAr ? 'آخر المزايدات' : 'Recent Bids'}
              </CardTitle>
              <Link href="/dashboard/bids">
                <Button variant="ghost" size="sm" className="text-xs">
                  {isAr ? 'عرض الكل' : 'View All'}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                {recentBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{bid.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{bid.time}</span>
                      </div>
                    </div>
                    <div className="ms-3 flex flex-col items-end gap-1">
                      <p className="text-sm font-bold text-foreground">{formatOMR(bid.amount)}</p>
                      {statusBadge(bid.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                {isAr ? 'آخر المعاملات' : 'Recent Transactions'}
              </CardTitle>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="text-xs">
                  {isAr ? 'عرض الكل' : 'View All'}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          tx.type === 'deposit'
                            ? 'bg-emerald-50'
                            : tx.type === 'hold'
                              ? 'bg-amber-50'
                              : 'bg-blue-50'
                        }`}
                      >
                        <Activity
                          className={`h-4 w-4 ${
                            tx.type === 'deposit'
                              ? 'text-emerald-600'
                              : tx.type === 'hold'
                                ? 'text-amber-600'
                                : 'text-blue-600'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        tx.type === 'deposit' || tx.type === 'refund' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}
                      {formatOMR(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/auctions">
                <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                  <Gavel className="h-5 w-5 text-primary-600" />
                  <span className="text-xs">{isAr ? 'تصفح المزادات' : 'Browse Auctions'}</span>
                </Button>
              </Link>
              <Link href="/dashboard/wallet">
                <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs">{isAr ? 'شحن المحفظة' : 'Top Up Wallet'}</span>
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span className="text-xs">{isAr ? 'تحديث الملف' : 'Update Profile'}</span>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <span className="text-xs">{isAr ? 'الدعم الفني' : 'Support'}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
