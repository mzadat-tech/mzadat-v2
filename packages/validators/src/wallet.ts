import { z } from 'zod'

export const depositSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
})

export const bankDepositSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(1),
  referenceNumber: z.string().optional(),
})

export const withdrawalSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountHolder: z.string().min(1),
  iban: z.string().optional(),
})

export type DepositInput = z.infer<typeof depositSchema>
export type BankDepositInput = z.infer<typeof bankDepositSchema>
export type WithdrawalInput = z.infer<typeof withdrawalSchema>
