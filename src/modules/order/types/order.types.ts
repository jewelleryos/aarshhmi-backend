export interface OrderListItem {
  id: string
  order_number: string
  customer_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  subtotal: number
  coupon_discount: number
  total_amount: number
  total_quantity: number
  stage: number
  payment_status: string
  payment_gateway: string
  coupon_code: string | null
  created_at: string
  item_count: number
}
