import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

export type ResolvedCustomer = AuthCustomer | undefined

export interface CustomerAddress {
  id: string
  first_name: string
  last_name: string
  address_line_1: string
  address_line_2: string | null
  pincode: string
  city_id: number
  city_name: string
  state_id: number
  state_name: string
  address_type: 'home' | 'office'
  created_at: string
  updated_at: string
}
