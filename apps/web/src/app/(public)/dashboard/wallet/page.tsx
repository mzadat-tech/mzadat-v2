'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { toast } from 'sonner'

export default function WalletPage() {
  const isAr = false
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('')

  const balance = 1250.0
  const heldDeposits = 500.0
  const available = balance - heldDeposits

  const quickAmounts = [50, 100, 250, 500, 1000]

  const transactions = [
    { id: '1', type: 'credit', amount: 500, date: '2024-03-15', desc: isAr ? 'إيداع' : 'Deposit', status: 'completed' },
    { id: '2', type: 'debit', amount: 200, date: '2024-03-14', desc: isAr ? 'تأمين مزاد' : 'Auction Deposit', status: 'completed' },
    { id: '3', type: 'credit', amount: 150, date: '2024-03-13', desc: isAr ? 'استرداد تأمين' : 'Deposit Refund', status: 'completed' },
    { id: '4', type: 'debit', amount: 100, date: '2024-03-12', desc: isAr ? 'طلب سحب' : 'Withdrawal', status: 'pending' },
    { id: '5', type: 'credit', amount: 1000, date: '2024-03-10', desc: isAr ? 'إيداع' : 'Deposit', status: 'completed' },
  ]

  function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount')
      return
    }
    toast.success(
      action === 'deposit'
        ? isAr ? 'تم تقديم طلب الإيداع بنجاح' : 'Deposit request submitted'
        : isAr ? 'تم تقديم طلب السحب بنجاح' : 'Withdrawal request submitted',
    )
    setAmount('')
    setAction(null)
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">{isAr ? 'المحفظة' : 'Wallet'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'إدارة رصيدك وعمليات الإيداع والسحب' : 'Manage your balance, deposits and withdrawals'}
        </p>
      </motion.div>

      {/* Balance Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 text-white">
          <div className="pointer-events-none absolute -end-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-white/80" />
              <p className="text-xs font-medium text-white/80">{isAr ? 'الرصيد الكلي' : 'Total Balance'}</p>
            </div>
            <p className="mt-2 text-3xl font-bold">{formatOMR(balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-xs font-medium text-muted-foreground">{isAr ? 'الرصيد المتاح' : 'Available'}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatOMR(available)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">{isAr ? 'تأمينات محجوزة' : 'Held Deposits'}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">{formatOMR(heldDeposits)}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-2">
        <Button
          variant={action === 'deposit' ? 'default' : 'outline'}
          className="h-auto gap-3 py-4"
          onClick={() => setAction(action === 'deposit' ? null : 'deposit')}
        >
          <Plus className="h-5 w-5" />
          <div className="text-start">
            <p className="font-semibold">{isAr ? 'إيداع' : 'Deposit'}</p>
            <p className="text-xs opacity-80">{isAr ? 'شحن رصيد المحفظة' : 'Top up your wallet'}</p>
          </div>
        </Button>
        <Button
          variant={action === 'withdraw' ? 'default' : 'outline'}
          className="h-auto gap-3 py-4"
          onClick={() => setAction(action === 'withdraw' ? null : 'withdraw')}
        >
          <Send className="h-5 w-5" />
          <div className="text-start">
            <p className="font-semibold">{isAr ? 'سحب' : 'Withdraw'}</p>
            <p className="text-xs opacity-80">{isAr ? 'سحب من الرصيد المتاح' : 'Withdraw available balance'}</p>
          </div>
        </Button>
      </motion.div>

      {/* Amount Input */}
      {action && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {action === 'deposit'
                  ? isAr ? 'إيداع مبلغ' : 'Deposit Amount'
                  : isAr ? 'سحب مبلغ' : 'Withdraw Amount'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? 'المبلغ (ر.ع.)' : 'Amount (OMR)'}</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  dir="ltr"
                  className="text-lg font-bold"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(qa.toString())}
                    className="text-xs"
                  >
                    {formatOMR(qa)}
                  </Button>
                ))}
              </div>
              {action === 'withdraw' && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                  <Info className="h-4 w-4 shrink-0" />
                  {isAr
                    ? 'سيتم تحويل المبلغ إلى حسابك البنكي المسجل خلال 2-3 أيام عمل'
                    : 'Amount will be transferred to your registered bank account within 2-3 business days'}
                </div>
              )}
              <Separator />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAction(null)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleSubmit}>
                  {action === 'deposit'
                    ? isAr ? 'إيداع' : 'Deposit'
                    : isAr ? 'سحب' : 'Withdraw'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transaction History */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isAr ? 'سجل المعاملات' : 'Transaction History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        tx.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50'
                      }`}
                    >
                      {tx.type === 'credit' ? (
                        <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.desc}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}{formatOMR(tx.amount)}
                    </p>
                    {tx.status === 'pending' && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                        {isAr ? 'قيد المعالجة' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
