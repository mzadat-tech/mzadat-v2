import { z } from 'zod'

const bilingualField = z.object({
  en: z.string().min(1),
  ar: z.string().optional(),
})

export const createProductSchema = z.object({
  name: bilingualField,
  description: bilingualField.optional(),
  shortDescription: bilingualField.optional(),
  categoryId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  saleType: z.enum(['auction', 'direct']).default('auction'),
  scheduleType: z.enum(['default', 'scheduled']).default('default'),
  price: z.number().min(0).default(0),
  salePrice: z.number().min(0).optional(),
  minBidPrice: z.number().min(0).default(0),
  reservePrice: z.number().min(0).optional(),
  bidIncrement1: z.number().min(0).default(1),
  bidIncrement2: z.number().min(0).optional(),
  bidIncrement3: z.number().min(0).optional(),
  bidIncrement4: z.number().min(0).optional(),
  minDeposit: z.number().min(0).default(0),
  minDepositType: z.enum(['fixed', 'percentage']).default('fixed'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  snipeExtensionSeconds: z.number().int().min(0).default(120),
  maxSnipeExtensionMinutes: z.number().int().min(0).default(30),
  location: z.string().optional(),
  inspectionNotes: z.string().optional(),
  metaTitle: bilingualField.optional(),
  metaKeywords: bilingualField.optional(),
  metaDescription: bilingualField.optional(),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
