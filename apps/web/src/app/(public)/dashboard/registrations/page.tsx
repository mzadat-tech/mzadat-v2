'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Crown, Download, ChevronLeft, ChevronRight,
  Loader2, Package, Calendar, CheckCircle2, XCircle,
} from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'
import { toast } from 'sonner'
import {
  getMyRegistrations,
  downloadReceipt,
  type UserRegistration,
} from '@/lib/registration-api'
import { DEFAULT_LOCALE } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const isAr = locale === 'ar'
const PAGE_SIZE = 10

function getName(json: unknown, lang: string): string {
  if (typeof json === 'string') return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, string>
    return obj[lang] || obj.en || obj.ar || Object.values(obj)[0] || ''
  }
  return ''
}

const statusConfig: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', border: 'border-red-200' },
  refunded: { label: 'Refunded', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<UserRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMyRegistrations(page, PAGE_SIZE)
      setRegistrations(res.data)
      setTotal(res.total)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeCount = registrations.filter((r) => r.status === 'active').length

  function handleDownload(id: string, lang: 'en' | 'ar') {
    downloadReceipt(id, lang)
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your auction group registrations and deposits
          </p>
        </div>
        <Link href="/auctions">
          <Button variant="outline" size="sm" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Browse Auctions
          </Button>
        </Link>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Registrations</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-50 p-2">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VIP Free</p>
              <p className="text-xl font-bold text-amber-600">
                {registrations.filter((r) => r.isVipFree).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* List */}
      <motion.div variants={fadeInUp}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : registrations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No registrations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Register for an auction to start bidding on lots
              </p>
              <Link href="/auctions">
                <Button className="mt-4" size="sm">
                  Browse Auctions
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg) => {
              const groupName = getName(reg.groupName, isAr ? 'ar' : 'en')
              const status = statusConfig[reg.status] || statusConfig.active
              const isDownloading = false

              return (
                <motion.div key={reg.id} variants={staggerItem}>
                  <Card className="overflow-hidden transition-shadow hover:shadow-md">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        {reg.groupImage ? (
                          <div className="relative h-32 w-full sm:h-auto sm:w-40">
                            <Image
                              src={reg.groupImage}
                              alt={groupName}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 160px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center bg-muted sm:h-auto sm:w-40">
                            <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-foreground">
                                {groupName}
                              </h4>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${status.color} ${status.border}`}
                                >
                                  {status.label}
                                </Badge>
                                {reg.isVipFree && (
                                  <Badge className="border-amber-200 bg-amber-100 text-[10px] text-amber-700">
                                    <Crown className="mr-0.5 h-2.5 w-2.5" /> VIP
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {reg.orderNumber}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {reg.lotCount} {reg.lotCount === 1 ? 'lot' : 'lots'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(reg.createdAt).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Deposit
                              </p>
                              <p className="text-sm font-bold text-foreground">
                                {reg.isVipFree
                                  ? 'Free'
                                  : formatOMR(parseFloat(reg.totalAmount))}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                disabled={isDownloading}
                                onClick={() => handleDownload(reg.id, 'en')}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                EN
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                disabled={isDownloading}
                                onClick={() => handleDownload(reg.id, 'ar')}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                AR
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
