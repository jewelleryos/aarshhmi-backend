import { z } from 'zod'

export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase()),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(25).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  permissions: z.array(z.number()).min(1, 'At least one permission is required'),
  is_active: z.boolean().optional().default(true),
})

// No password field - password cannot be changed through user management
export const updateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase())
    .optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(25).optional().nullable(),
  permissions: z.array(z.number()).optional(),
})

export const statusChangeSchema = z.object({
  is_active: z.boolean(),
})
