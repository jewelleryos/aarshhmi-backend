export interface CustomerListItem {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  is_active: boolean
  last_login_at: Date | null
  last_login_method: string | null
  created_at: Date
}

export interface CustomerListResponse {
  items: CustomerListItem[]
}

export interface CustomerForCoupon {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
}
