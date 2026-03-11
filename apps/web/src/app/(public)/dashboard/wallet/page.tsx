'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Info,
  Loader2,
  Building2,
  Copy,
  Upload,
  ChevronRight,
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
import {
  getBalance,
  getDepositPresets,
  getBankAccounts,
  submitBankDeposit,
  getTransactions,
  type WalletBalance,
  type DepositPresets,
  type BankAccount,
  type WalletTransaction,
} from '@/lib/wallet-api'
import { createClient } from '@/lib/supabase/client'

// ── Helpers ───────────────────────────────────────────

const TX_CREDIT_TYPES = new Set([
  'deposit', 'return', 'refund', 'release', 'admin_adjustment',
])

function isCreditTx(type: string) {
  return TX_CREDIT_TYPES.has(type)
}

function txTypeLabel(type: string): string {
  const map: Record<string, string> = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    bid: 'Bid Hold',
    hold: 'Hold',
    release: 'Release',
    purchase: 'Purchase',
    bid_final_payment: 'Final Payment',
    return: 'Return',
    refund: 'Refund',
    commission: 'Commission',
    admin_adjustment: 'Adjustment',
    fee: 'Fee',
  }
  return map[type] || type
}

// ── Page ──────────────────────────────────────────────

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [presets, setPresets] = useState<DepositPresets | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [recentTx, setRecentTx] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null)

  // Deposit form
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [bankRef, setBankRef] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [bal, prs, banks, txs] = await Promise.all([
        getBalance(),
        getDepositPresets(),
        getBankAccounts(),
        getTransactions({ page: 1, pageSize: 5, sortBy: 'created_at', sortOrder: 'desc' }),
      ])
      setBalance(bal)
      setPresets(prs)
      setBankAccounts(banks)
      setRecentTx(txs.data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleProofUpload(file: File): Promise<string> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `deposits/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file)
    if (error) throw new Error('Failed to upload proof document')
    return path
  }

  async function handleDeposit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (presets && (amt < presets.min || amt > presets.max)) {
      toast.error(`Amount must be between ${presets.min} and ${presets.max} ${presets.currency}`)
      return
    }
    if (!selectedBank) {
      toast.error('Please select a bank account')
      return
    }
    if (!proofFile) {
      toast.error('Please upload proof of transfer')
      return
    }

    setSubmitting(true)
    try {
      const proofPath = await handleProofUpload(proofFile)
      const result = await submitBankDeposit({
        amount: amt,
        proofDocument: proofPath,
        bankName: selectedBank,
        referenceNumber: bankRef || undefined,
      })
      toast.success(result.message || 'Deposit submitted for review')
      setAmount('')
      setSelectedBank('')
      setBankRef('')
      setProofFile(null)
      setAction(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Deposit failed')
    } finally {
      setSubmitting(false)
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const balanceNum = parseFloat(balance?.balance || '0')

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your balance, deposits and withdrawals
        </p>
      </motion.div>

      {/* Balance Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden bg-linear-to-br from-primary-900 to-primary-700 text-white">
          <div className="pointer-events-none absolute -inset-e-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-white/80" />
              <p className="text-xs font-medium text-white/80">Total Balance</p>
            </div>
            <p className="mt-2 text-3xl font-bold">{formatOMR(balanceNum)}</p>
            {balance?.isVip && (
              <Badge className="mt-2 border-amber-400/50 bg-amber-400/20 text-amber-200">
                VIP Member
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-xs font-medium text-muted-foreground">Available</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatOMR(balanceNum)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">Currency</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">{balance?.currency || 'OMR'}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-2">
        <Button
          variant={action === 'deposit' ? 'default' : 'outline'}
          className="h-auto gap-3 py-4"
          onClick={() => setAction(action === 'deposit' ? null : 'deposit')}
        >
          <Plus className="h-5 w-5" />
          <div className="text-start">
            <p className="font-semibold">Deposit</p>
            <p className="text-xs opacity-80">Top up your wallet via bank transfer</p>
          </div>
        </Button>
        <Button
          variant={action === 'withdraw' ? 'default' : 'outline'}
          className="h-auto gap-3 py-4"
          onClick={() => setAction(action === 'withdraw' ? null : 'withdraw')}
          disabled
        >
          <Send className="h-5 w-5" />
          <div className="text-start">
            <p className="font-semibold">Withdraw</p>
            <p className="text-xs opacity-80">Coming soon</p>
          </div>
        </Button>
      </motion.div>

      {/* Deposit Form */}
      <AnimatePresence>
        {action === 'deposit' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bank Transfer Deposit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount ({presets?.currency || 'OMR'})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min={presets?.min || 10}
                    max={presets?.max || 5000}
                    placeholder="0.000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    dir="ltr"
                    className="text-lg font-bold"
                  />
                  {presets && (
                    <div className="flex flex-wrap gap-2">
                      {presets.presets.map((qa) => (
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
                  )}
                  {presets && (
                    <p className="text-xs text-muted-foreground">
                      Min: {formatOMR(presets.min)} — Max: {formatOMR(presets.max)}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Select Bank */}
                <div className="space-y-3">
                  <Label>Transfer to one of our bank accounts</Label>
                  {bankAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bank accounts available</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bankAccounts.map((bank) => {
                        const name = bank.bankName.en || bank.bankName.ar || ''
                        return (
                          <div
                            key={bank.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedBank(name)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedBank(name) }}
                            className={`cursor-pointer rounded-xl border-2 p-4 text-start transition-all ${
                              selectedBank === name
                                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                : 'border-border hover:border-primary-200 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{bank.accountName}</p>
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); copyText(bank.accountNumber) }}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); copyText(bank.accountNumber) } }}
                                      className="flex cursor-pointer items-center gap-1 text-xs text-primary-600 hover:underline"
                                    >
                                      {bank.accountNumber} <Copy className="h-3 w-3" />
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">IBAN</span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); copyText(bank.iban) }}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); copyText(bank.iban) } }}
                                      className="flex cursor-pointer items-center gap-1 text-xs text-primary-600 hover:underline"
                                    >
                                      {bank.iban} <Copy className="h-3 w-3" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Reference & Proof */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bank Reference Number (optional)</Label>
                    <Input
                      placeholder="e.g. TRF-123456"
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proof of Transfer *</Label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
                        proofFile
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-border hover:border-primary-300 hover:bg-muted/50'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="truncate">
                        {proofFile ? proofFile.name : 'Upload screenshot or PDF'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  <Info className="h-4 w-4 shrink-0" />
                  Your deposit will be reviewed by our team and credited within 1-2 business hours.
                </div>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setAction(null)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleDeposit} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Transactions */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <div className="py-8 text-center">
                <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No transactions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Make a deposit to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTx.map((tx) => {
                  const credit = isCreditTx(tx.type)
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${credit ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          {credit ? (
                            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{txTypeLabel(tx.type)}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {tx.referenceNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {credit ? '+' : '-'}{formatOMR(parseFloat(tx.amount))}
                        </p>
                        <StatusBadge status={tx.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; label: string }> = {
    completed: { class: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Completed' },
    pending: { class: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Pending' },
    rejected: { class: 'border-red-200 bg-red-50 text-red-700', label: 'Rejected' },
    failed: { class: 'border-red-200 bg-red-50 text-red-700', label: 'Failed' },
  }
  const c = config[status] || config.pending!
  return (
    <Badge variant="outline" className={`text-[10px] ${c.class}`}>
      {c.label}
    </Badge>
  )
}
