import { z } from 'zod'

const addressSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(1, 'Phone number is required').max(15),
  address_line_1: z.string().min(1, 'Address line 1 is required').max(500),
  address_line_2: z.string().max(500).optional().default(''),
  pincode: z.string().min(1, 'Pincode is required').max(10),
  city_id: z.number().int().positive('City is required'),
  city_name: z.string().min(1, 'City name is required'),
  state_id: z.number().int().positive('State is required'),
  state_name: z.string().min(1, 'State name is required'),
  address_type: z.enum(['home', 'office']).optional().default('home'),
})

export const checkoutSchema = z.object({
  shipping_address: addressSchema,
  billing_address: addressSchema,
  same_as_shipping: z.boolean().optional().default(false),
})

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
})
