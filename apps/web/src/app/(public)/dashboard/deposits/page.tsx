'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type BankDeposit = {
  id: string
  amount: number
  bank_name: string
  reference_number: string | null
  proof_document: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

const PAGE_SIZE = 10

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<BankDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadDeposits = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('bank_deposits')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (tab !== 'all') {
        query = query.eq('status', tab)
      }

      const { data, count, error } = await query
      if (error) throw error
      setDeposits((data as BankDeposit[]) || [])
      setTotal(count || 0)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }, [page, tab])

  useEffect(() => {
    loadDeposits()
  }, [loadDeposits])

  useEffect(() => {
    setPage(1)
  }, [tab])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Summaries
  const pending = deposits.filter((d) => d.status === 'pending').length
  const approved = deposits.filter((d) => d.status === 'approved').length

  const tabs = [
    { key: 'all' as const, label: 'All', count: total },
    { key: 'pending' as const, label: 'Pending', count: null },
    { key: 'approved' as const, label: 'Approved', count: null },
    { key: 'rejected' as const, label: 'Rejected', count: null },
  ]

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deposits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your bank transfer deposits</p>
        </div>
        <Link href="/dashboard/wallet">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowUpRight className="h-3 w-3" /> New Deposit
          </Button>
        </Link>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deposits</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-50 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
              <p className="text-xl font-bold text-amber-600">{pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold text-emerald-600">{approved}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeInUp}>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      <motion.div variants={fadeInUp}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : deposits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No deposits found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab !== 'all' ? 'Try a different filter' : 'Make a deposit from your Wallet page'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deposits.map((dep) => (
              <DepositCard key={dep.id} deposit={dep} />
            ))}
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

function DepositCard({ deposit }: { deposit: BankDeposit }) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    pending: { icon: Clock, color: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Pending' },
    approved: { icon: CheckCircle2, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Approved' },
    rejected: { icon: XCircle, color: 'border-red-200 bg-red-50 text-red-700', label: 'Rejected' },
  }
  const sc = statusConfig[deposit.status] || statusConfig.pending!
  const Icon = sc.icon

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-muted p-2.5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{deposit.bank_name}</p>
              <Badge variant="outline" className={`text-[10px] ${sc.color}`}>
                <Icon className="mr-1 h-3 w-3" />
                {sc.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {new Date(deposit.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {deposit.reference_number && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="font-mono">Ref: {deposit.reference_number}</span>
                </>
              )}
            </div>
            {deposit.status === 'rejected' && deposit.admin_notes && (
              <p className="mt-1 text-xs text-red-600">Reason: {deposit.admin_notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-base font-bold">{formatOMR(deposit.amount)}</p>
          {deposit.proof_document && (
            <ProofLink path={deposit.proof_document} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProofLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    if (data?.publicUrl) setUrl(data.publicUrl)
  }, [path])

  if (!url) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary-600">
        <Eye className="h-3 w-3" /> Proof
      </Button>
    </a>
  )
}
