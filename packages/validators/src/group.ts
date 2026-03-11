import { z } from 'zod'

const bilingualField = z.object({
  en: z.string().min(1),
  ar: z.string().optional(),
})

export const createGroupSchema = z.object({
  name: bilingualField,
  description: bilingualField.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  inspectionStartDate: z.string().datetime().optional(),
  inspectionEndDate: z.string().datetime().optional(),
  minDeposit: z.number().min(0).default(0),
})

export const updateGroupSchema = createGroupSchema.partial()

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
