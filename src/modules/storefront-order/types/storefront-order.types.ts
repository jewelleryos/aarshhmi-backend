export interface AddressData {
  first_name: string
  last_name: string
  phone: string
  address_line_1: string
  address_line_2?: string
  pincode: string
  city_id: number
  city_name: string
  state_id: number
  state_name: string
  address_type?: string
}

export interface CheckoutInput {
  shipping_address: AddressData
  billing_address: AddressData
  same_as_shipping: boolean
}

export interface VerifyPaymentInput {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface CheckoutResponse {
  order_id: string
  order_number: string
  razorpay_order_id: string
  razorpay_key_id: string
  amount: number
  currency: string
  customer: {
    name: string
    email: string | null
    phone: string | null
  }
}

export interface OrderListItem {
  id: string
  order_number: string
  total_amount: number
  total_quantity: number
  stage: number
  payment_status: string
  created_at: string
  items: OrderItemSummary[]
}

export interface OrderItemSummary {
  id: string
  suborder_number: string
  product_snapshot: Record<string, unknown>
  quantity: number
  paid_amount: number
  stage: number
}

export interface OrderDetail {
  id: string
  order_number: string
  subtotal: number
  tax_amount: number
  coupon_discount: number
  total_amount: number
  coupon_code: string | null
  total_quantity: number
  stage: number
  shipping_address: AddressData
  billing_address: AddressData
  payment_gateway: string
  payment_status: string
  cancellation_window_ends_at: string | null
  created_at: string
  updated_at: string
  items: OrderItemDetail[]
}

export interface OrderItemDetail {
  id: string
  suborder_number: string
  product_id: string
  variant_id: string
  product_snapshot: Record<string, unknown>
  metal_price: number
  making_charge: number
  diamond_price: number
  gemstone_price: number
  pearl_price: number
  price_without_tax: number
  tax_amount: number
  unit_price: number
  coupon_discount: number
  line_total: number
  paid_amount: number
  quantity: number
  stage: number
  is_cancellable: boolean
  is_returnable: boolean
  tracking_id: string | null
  courier_name: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}
