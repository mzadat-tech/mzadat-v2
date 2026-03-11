import { z } from 'zod'

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  countryId: z.string().uuid().optional(),
  stateId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
