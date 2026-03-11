import { z } from 'zod'

const bilingualField = z.object({
  en: z.string().min(1),
  ar: z.string().optional(),
})

export const createStoreSchema = z.object({
  name: bilingualField,
  description: bilingualField.optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  socialLinks: z
    .object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
    })
    .optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  vatApplicable: z.boolean().default(false),
  vatRate: z.number().min(0).max(100).default(5),
})

export const updateStoreSchema = createStoreSchema.partial()

export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>
