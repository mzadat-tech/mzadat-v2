/**
 * Admin Wallet Routes
 *
 * Admin endpoints for:
 *  - Bank account management (CRUD)
 *  - Deposit approval/rejection
 *  - Manual adjustments
 *  - Wallet summary dashboard
 *  - Transaction import
 *  - Transaction listing across all users
 */

import { Router, type IRouter, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { validate } from '../middleware/validate.js'
import {
  adminBankAccountSchema,
  adminBankAccountUpdateSchema,
  adminDepositReviewSchema,
  adminAdjustmentSchema,
  transactionListSchema,
  importTransactionsSchema,
} from '@mzadat/validators'
import { walletService } from '../services/wallet.service.js'
import { adminBankAccountService } from '../services/admin-bank-account.service.js'

const router: IRouter = Router()

// All routes require auth + admin/super_admin
router.use(authMiddleware)
router.use(requireRole('admin', 'super_admin'))

// ╔═══════════════════════════════════════════════════════╗
// ║  BANK ACCOUNT MANAGEMENT                              ║
// ╚═══════════════════════════════════════════════════════╝

// ── GET /admin/wallet/bank-accounts ─────────────────────
router.get('/bank-accounts', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await adminBankAccountService.list(false) // all, including inactive
    res.json({ success: true, data: accounts })
  } catch (error: any) {
    console.error('Failed to list bank accounts:', error)
    res.status(500).json({ success: false, error: 'Failed to list bank accounts' })
  }
})

// ── GET /admin/wallet/bank-accounts/:id ─────────────────
router.get('/bank-accounts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await adminBankAccountService.getById(req.params.id as string)
    if (!account) {
      res.status(404).json({ success: false, error: 'Bank account not found' })
      return
    }
    res.json({ success: true, data: account })
  } catch (error: any) {
    console.error('Failed to get bank account:', error)
    res.status(500).json({ success: false, error: 'Failed to get bank account' })
  }
})

// ── POST /admin/wallet/bank-accounts ────────────────────
router.post('/bank-accounts', validate(adminBankAccountSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await adminBankAccountService.create(req.body)
    res.status(201).json({ success: true, data: account })
  } catch (error: any) {
    console.error('Failed to create bank account:', error)
    res.status(500).json({ success: false, error: 'Failed to create bank account' })
  }
})

// ── PATCH /admin/wallet/bank-accounts/:id ───────────────
router.patch('/bank-accounts/:id', validate(adminBankAccountUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await adminBankAccountService.update(req.params.id as string, req.body)
    if (!account) {
      res.status(404).json({ success: false, error: 'Bank account not found' })
      return
    }
    res.json({ success: true, data: account })
  } catch (error: any) {
    console.error('Failed to update bank account:', error)
    res.status(500).json({ success: false, error: 'Failed to update bank account' })
  }
})

// ── DELETE /admin/wallet/bank-accounts/:id ──────────────
router.delete('/bank-accounts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await adminBankAccountService.delete(req.params.id as string)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Bank account not found' })
      return
    }
    res.json({ success: true, message: 'Bank account deleted' })
  } catch (error: any) {
    console.error('Failed to delete bank account:', error)
    res.status(500).json({ success: false, error: 'Failed to delete bank account' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  DEPOSIT REVIEW                                       ║
// ╚═══════════════════════════════════════════════════════╝

// ── GET /admin/wallet/deposits ──────────────────────────
router.get('/deposits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending'
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const result = await walletService.listPendingDeposits({ status, page, pageSize })
    res.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Failed to list deposits:', error)
    res.status(500).json({ success: false, error: 'Failed to list deposits' })
  }
})

// ── PATCH /admin/wallet/deposits/:id/approve ────────────
router.patch('/deposits/:id/approve', validate(adminDepositReviewSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await walletService.approveDeposit(req.params.id as string, req.userId!, req.body.notes)
    res.json({ success: true, message: 'Deposit approved and funds credited to wallet' })
  } catch (error: any) {
    console.error('Approve deposit failed:', error)
    if (error.message?.includes('not found') || error.message?.includes('already')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to approve deposit' })
  }
})

// ── PATCH /admin/wallet/deposits/:id/reject ─────────────
router.patch('/deposits/:id/reject', validate(adminDepositReviewSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await walletService.rejectDeposit(req.params.id as string, req.userId!, req.body.notes)
    res.json({ success: true, message: 'Deposit rejected' })
  } catch (error: any) {
    console.error('Reject deposit failed:', error)
    if (error.message?.includes('not found') || error.message?.includes('already')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to reject deposit' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  WALLET MANAGEMENT                                    ║
// ╚═══════════════════════════════════════════════════════╝

// ── GET /admin/wallet/summary ───────────────────────────
router.get('/summary', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await walletService.getWalletSummary()
    res.json({ success: true, data: summary })
  } catch (error: any) {
    console.error('Failed to get wallet summary:', error)
    res.status(500).json({ success: false, error: 'Failed to get wallet summary' })
  }
})

// ── POST /admin/wallet/adjustment ───────────────────────
// Manual credit/debit a user's wallet
router.post('/adjustment', validate(adminAdjustmentSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, amount, description, isCredit } = req.body as {
      userId: string
      amount: number
      description: string
      isCredit: boolean
    }

    const tx = await walletService.adminAdjustment(req.userId!, userId, amount, description, isCredit)
    res.json({
      success: true,
      message: `Wallet ${isCredit ? 'credited' : 'debited'} successfully`,
      data: tx,
    })
  } catch (error: any) {
    console.error('Admin adjustment failed:', error)
    if (error.message?.includes('Insufficient') || error.message?.includes('not found')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to adjust wallet' })
  }
})

// ── GET /admin/wallet/transactions ──────────────────────
// List all transactions (across all users) with filters
router.get('/transactions', validate(transactionListSchema, 'query'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params = ((req as any).validated?.query ?? req.query) as {
      type?: string
      status?: string
      dateFrom?: string
      dateTo?: string
      page: number
      pageSize: number
      sortBy: string
      sortOrder: 'asc' | 'desc'
    }
    const userId = ((req as any).validated?.query ?? req.query).userId as string | undefined

    // Admin can query any user or all users
    const result = await walletService.listAllTransactions({
      userId,
      ...params,
    })

    res.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Failed to list transactions:', error)
    res.status(500).json({ success: false, error: 'Failed to list transactions' })
  }
})

// ── GET /admin/wallet/transactions/export ────────────────
// Export all transactions as CSV
router.get('/transactions/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined
    const type = req.query.type as string | undefined
    const status = req.query.status as string | undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined

    const csv = await walletService.exportAllTransactions({
      userId,
      type,
      status,
      dateFrom,
      dateTo,
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="all-wallet-transactions-${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Failed to export transactions:', error)
    res.status(500).json({ success: false, error: 'Failed to export transactions' })
  }
})

// ── POST /admin/wallet/import ───────────────────────────
// Bulk import transactions
router.post('/import', validate(importTransactionsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { records } = req.body as { records: Array<{ userId: string; type: string; amount: number; description?: string }> }
    const result = await walletService.importTransactions(req.userId!, records)
    res.json({
      success: true,
      message: `Imported ${result.imported} transactions`,
      data: result,
    })
  } catch (error: any) {
    console.error('Import failed:', error)
    res.status(500).json({ success: false, error: 'Failed to import transactions' })
  }
})

// ── GET /admin/wallet/transactions/:id/verify ───────────
// Admin can verify any transaction's integrity
router.get('/transactions/:id/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isValid = await walletService.verifyIntegrity(req.params.id as string)
    res.json({ success: true, data: { isValid } })
  } catch (error: any) {
    console.error('Failed to verify transaction:', error)
    res.status(500).json({ success: false, error: 'Failed to verify transaction' })
  }
})

export { router as adminWalletRoutes }
