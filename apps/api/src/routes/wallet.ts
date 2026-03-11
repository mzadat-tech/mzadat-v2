/**
 * Wallet Routes (User-facing)
 *
 * Endpoints for wallet balance, deposits, transactions, and export.
 * All routes require authentication.
 */

import { Router, type IRouter, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  depositSchema,
  bankDepositSchema,
  transactionListSchema,
} from '@mzadat/validators'
import { walletService } from '../services/wallet.service.js'
import { adminBankAccountService } from '../services/admin-bank-account.service.js'

const router: IRouter = Router()

// All routes require auth
router.use(authMiddleware)

// ── GET /wallet/presets ─────────────────────────────────
// Returns deposit presets, min/max, step for the UI
router.get('/presets', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: walletService.getDepositPresets() })
})

// ── GET /wallet/balance ─────────────────────────────────
// Get current wallet balance
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const balance = await walletService.getBalance(req.userId!)
    res.json({ success: true, data: balance })
  } catch (error: any) {
    console.error('Failed to get balance:', error)
    res.status(500).json({ success: false, error: 'Failed to get wallet balance' })
  }
})

// ── GET /wallet/bank-accounts ───────────────────────────
// List active platform bank accounts for deposits
router.get('/bank-accounts', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await adminBankAccountService.list(true) // active only
    res.json({ success: true, data: accounts })
  } catch (error: any) {
    console.error('Failed to list bank accounts:', error)
    res.status(500).json({ success: false, error: 'Failed to list bank accounts' })
  }
})

// ── POST /wallet/deposit ────────────────────────────────
// Add funds via bank transfer (pending approval) or gateway (auto-approved)
router.post('/deposit', validate(depositSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, paymentMethod, proofDocument, bankName, referenceNumber, description } = req.body as {
      amount: number
      paymentMethod: string
      proofDocument?: string
      bankName?: string
      referenceNumber?: string
      description?: string
    }

    // Bank transfer requires proof
    if (paymentMethod === 'bank_transfer' && !proofDocument) {
      res.status(400).json({ success: false, error: 'Bank transfer proof document is required' })
      return
    }

    const autoApprove = paymentMethod !== 'bank_transfer'

    const tx = await walletService.deposit({
      userId: req.userId!,
      amount,
      paymentMethod,
      proofDocument,
      bankName,
      referenceNumber,
      description,
      autoApprove,
    })

    const statusCode = autoApprove ? 200 : 201
    const message = autoApprove
      ? 'Funds added to wallet successfully'
      : 'Deposit submitted for review. You will be notified once approved.'

    res.status(statusCode).json({ success: true, message, data: tx })
  } catch (error: any) {
    console.error('Deposit failed:', error)
    if (error.message?.includes('amount must be')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Deposit failed' })
  }
})

// ── POST /wallet/deposit/bank ───────────────────────────
// Dedicated bank transfer deposit endpoint with stricter validation
router.post('/deposit/bank', validate(bankDepositSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, proofDocument, bankName, referenceNumber, description } = req.body as {
      amount: number
      proofDocument: string
      bankName: string
      referenceNumber?: string
      description?: string
    }

    const tx = await walletService.deposit({
      userId: req.userId!,
      amount,
      paymentMethod: 'bank_transfer',
      proofDocument,
      bankName,
      referenceNumber,
      description,
      autoApprove: false,
    })

    res.status(201).json({
      success: true,
      message: 'Bank deposit submitted for review. You will be notified once approved.',
      data: tx,
    })
  } catch (error: any) {
    console.error('Bank deposit failed:', error)
    if (error.message?.includes('amount must be')) {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Bank deposit failed' })
  }
})

// ── GET /wallet/transactions ────────────────────────────
// List transactions with filters, pagination, sorting
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

    const result = await walletService.listTransactions({
      userId: req.userId!,
      ...params,
    })

    res.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Failed to list transactions:', error)
    res.status(500).json({ success: false, error: 'Failed to list transactions' })
  }
})

// ── GET /wallet/transactions/export ─────────────────────
// Export transactions as CSV
router.get('/transactions/export', validate(transactionListSchema, 'query'), async (req: AuthenticatedRequest, res: Response) => {
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

    const csv = await walletService.exportTransactions({
      userId: req.userId!,
      ...params,
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="wallet-transactions-${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Failed to export transactions:', error)
    res.status(500).json({ success: false, error: 'Failed to export transactions' })
  }
})

// ── GET /wallet/transactions/:id ────────────────────────
// Get a single transaction
router.get('/transactions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tx = await walletService.getTransaction(req.userId!, req.params.id as string)
    if (!tx) {
      res.status(404).json({ success: false, error: 'Transaction not found' })
      return
    }
    res.json({ success: true, data: tx })
  } catch (error: any) {
    console.error('Failed to get transaction:', error)
    res.status(500).json({ success: false, error: 'Failed to get transaction' })
  }
})

// ── GET /wallet/transactions/:id/verify ─────────────────
// Verify transaction integrity (encrypted amount matches)
router.get('/transactions/:id/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // First check the transaction belongs to this user
    const tx = await walletService.getTransaction(req.userId!, req.params.id as string)
    if (!tx) {
      res.status(404).json({ success: false, error: 'Transaction not found' })
      return
    }

    const isValid = await walletService.verifyIntegrity(req.params.id as string)
    res.json({ success: true, data: { isValid, referenceNumber: tx.referenceNumber } })
  } catch (error: any) {
    console.error('Failed to verify transaction:', error)
    res.status(500).json({ success: false, error: 'Failed to verify transaction' })
  }
})

export { router as walletRoutes }
