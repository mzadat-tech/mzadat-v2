import { z } from 'zod'

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['bid', 'purchase']),
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional(),
  billingPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
