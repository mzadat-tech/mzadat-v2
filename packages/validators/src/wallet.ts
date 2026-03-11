import { z } from 'zod'

// ── User-facing wallet schemas ──────────────────────────

export const depositSchema = z.object({
  amount: z.number().positive().min(10).max(5000),
  paymentMethod: z.string().min(1),
  proofDocument: z.string().optional(),
  bankName: z.string().optional(),
  referenceNumber: z.string().optional(),
  description: z.string().max(500).optional(),
})

export const bankDepositSchema = z.object({
  amount: z.number().positive().min(10).max(5000),
  proofDocument: z.string().min(1, 'Bank transfer proof is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  referenceNumber: z.string().optional(),
  description: z.string().max(500).optional(),
})

export const withdrawalSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountHolder: z.string().min(1),
  iban: z.string().optional(),
})

export const transactionListSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'amount', 'type', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ── Admin wallet schemas ────────────────────────────────

export const adminDepositReviewSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const adminAdjustmentSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  isCredit: z.boolean(),
})

export const adminBankAccountSchema = z.object({
  bankName: z.record(z.string(), z.string()).refine(
    (v) => v.en && v.en.length > 0,
    { message: 'English bank name is required' },
  ),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  iban: z.string().min(1),
  swiftCode: z.string().optional(),
  branch: z.string().optional(),
  currency: z.string().default('OMR'),
  logo: z.string().optional(),
  sortOrder: z.number().int().default(0),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const adminBankAccountUpdateSchema = adminBankAccountSchema.partial()

export const importTransactionsSchema = z.object({
  records: z.array(z.object({
    userId: z.string().uuid(),
    type: z.string().min(1),
    amount: z.number().positive(),
    description: z.string().optional(),
  })).min(1).max(500),
})

// ── Type exports ────────────────────────────────────────

export type DepositInput = z.infer<typeof depositSchema>
export type BankDepositInput = z.infer<typeof bankDepositSchema>
export type WithdrawalInput = z.infer<typeof withdrawalSchema>
export type TransactionListInput = z.infer<typeof transactionListSchema>
export type AdminDepositReviewInput = z.infer<typeof adminDepositReviewSchema>
export type AdminAdjustmentInput = z.infer<typeof adminAdjustmentSchema>
export type AdminBankAccountInput = z.infer<typeof adminBankAccountSchema>
export type AdminBankAccountUpdateInput = z.infer<typeof adminBankAccountUpdateSchema>
export type ImportTransactionsInput = z.infer<typeof importTransactionsSchema>
