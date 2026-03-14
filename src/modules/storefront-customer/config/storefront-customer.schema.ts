import { z } from 'zod'

export const createAddressSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(1, 'Phone number is required').max(15),
  address_line_1: z.string().min(1, 'Address line 1 is required').max(500),
  address_line_2: z.string().max(500).optional(),
  pincode: z.string().min(1, 'Pincode is required').max(10),
  city_id: z.number().int().min(1, 'City is required'),
  state_id: z.number().int().min(1, 'State is required'),
  address_type: z.enum(['home', 'office']).default('home'),
})

export const updateAddressSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(15).optional(),
  address_line_1: z.string().min(1).max(500).optional(),
  address_line_2: z.string().max(500).nullable().optional(),
  pincode: z.string().min(1).max(10).optional(),
  city_id: z.number().int().min(1).optional(),
  state_id: z.number().int().min(1).optional(),
  address_type: z.enum(['home', 'office']).optional(),
})
