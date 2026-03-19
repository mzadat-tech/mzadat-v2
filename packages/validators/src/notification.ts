import { z } from 'zod'

// ── List notifications query params ──────────────────────
export const notificationListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.string().max(50).optional(),
})

export type NotificationListInput = z.infer<typeof notificationListSchema>
