'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  Calendar,
  ArrowDownUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion'

type TxType = 'deposit' | 'withdrawal' | 'bid_hold' | 'bid_refund' | 'purchase' | 'deposit_hold' | 'deposit_refund'

interface Transaction {
  id: string
  type: TxType
  amount: number
  date: string
  description: string
  reference?: string
  status: 'completed' | 'pending' | 'failed'
}

const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: 500, date: '2024-03-15 14:30', description: 'إيداع في المحفظة', reference: 'TXN-001', status: 'completed' },
  { id: '2', type: 'deposit_hold', amount: 200, date: '2024-03-14 10:15', description: 'تأمين مزاد سيارات مارس', reference: 'TXN-002', status: 'completed' },
  { id: '3', type: 'bid_hold', amount: 50, date: '2024-03-14 11:00', description: 'مزايدة على تويوتا لاندكروزر', reference: 'TXN-003', status: 'completed' },
  { id: '4', type: 'deposit_refund', amount: 150, date: '2024-03-13 09:00', description: 'استرداد تأمين مزاد إلكترونيات', reference: 'TXN-004', status: 'completed' },
  { id: '5', type: 'withdrawal', amount: 100, date: '2024-03-12 16:45', description: 'سحب إلى الحساب البنكي', reference: 'TXN-005', status: 'pending' },
  { id: '6', type: 'deposit', amount: 1000, date: '2024-03-10 08:00', description: 'إيداع في المحفظة', reference: 'TXN-006', status: 'completed' },
  { id: '7', type: 'purchase', amount: 380, date: '2024-03-09 15:30', description: 'شراء آيفون 15 برو ماكس', reference: 'TXN-007', status: 'completed' },
  { id: '8', type: 'bid_refund', amount: 30, date: '2024-03-08 12:00', description: 'استرداد مزايدة أثاث', reference: 'TXN-008', status: 'completed' },
]

export default function TransactionsPage() {
  const isAr = false
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all')

  const txTypeConfig: Record<TxType, { label: string; direction: 'credit' | 'debit' }> = {
    deposit: { label: isAr ? 'إيداع' : 'Deposit', direction: 'credit' },
    withdrawal: { label: isAr ? 'سحب' : 'Withdrawal', direction: 'debit' },
    bid_hold: { label: isAr ? 'حجز مزايدة' : 'Bid Hold', direction: 'debit' },
    bid_refund: { label: isAr ? 'استرداد مزايدة' : 'Bid Refund', direction: 'credit' },
    purchase: { label: isAr ? 'شراء' : 'Purchase', direction: 'debit' },
    deposit_hold: { label: isAr ? 'حجز تأمين' : 'Deposit Hold', direction: 'debit' },
    deposit_refund: { label: isAr ? 'استرداد تأمين' : 'Deposit Refund', direction: 'credit' },
  }

  const filtered = mockTransactions.filter((tx) => {
    if (typeFilter !== 'all' && txTypeConfig[tx.type].direction !== typeFilter) return false
    if (search && !tx.description.includes(search) && !tx.reference?.includes(search)) return false
    return true
  })

  const totalCredit = mockTransactions
    .filter((tx) => txTypeConfig[tx.type].direction === 'credit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalDebit = mockTransactions
    .filter((tx) => txTypeConfig[tx.type].direction === 'debit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'المعاملات' : 'Transactions'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr ? 'سجل جميع العمليات المالية في حسابك' : 'Complete financial history of your account'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          {isAr ? 'تصدير' : 'Export'}
        </Button>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <ArrowDownUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المعاملات' : 'Total'}</p>
              <p className="text-xl font-bold">{mockTransactions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <ArrowDownRight className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الوارد' : 'Total Credit'}</p>
              <p className="text-xl font-bold text-emerald-600">{formatOMR(totalCredit)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-red-50 p-2.5">
              <ArrowUpRight className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الصادر' : 'Total Debit'}</p>
              <p className="text-xl font-bold text-red-600">{formatOMR(totalDebit)}</p>
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
                  placeholder={isAr ? 'البحث بالوصف أو رقم المرجع...' : 'Search by description or reference...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'credit', 'debit'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={typeFilter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(f)}
                    className="text-xs"
                  >
                    {f === 'all'
                      ? isAr ? 'الكل' : 'All'
                      : f === 'credit'
                        ? isAr ? 'وارد' : 'Credit'
                        : isAr ? 'صادر' : 'Debit'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions List */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ArrowDownUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold">{isAr ? 'لا توجد معاملات' : 'No transactions'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAr ? 'لم يتم العثور على معاملات مطابقة' : 'No matching transactions found'}
                </p>
              </div>
            ) : (
              filtered.map((tx) => {
                const config = txTypeConfig[tx.type]
                const isCredit = config.direction === 'credit'
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${isCredit ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isCredit ? (
                          <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {tx.date}
                          </span>
                          {tx.reference && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                              {tx.reference}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}{formatOMR(tx.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{config.label}</p>
                      </div>
                      {tx.status === 'pending' && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                          {isAr ? 'جاري' : 'Pending'}
                        </Badge>
                      )}
                      {tx.status === 'failed' && (
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] text-red-700">
                          {isAr ? 'فشل' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
