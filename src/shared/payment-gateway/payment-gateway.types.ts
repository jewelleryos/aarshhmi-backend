// ============================================
// Payment Gateway Adapter Interface
// All gateways (Razorpay, Stripe, etc.) implement this
// ============================================

export interface CreateOrderInput {
  amount: number          // In INR (e.g., 10000.50)
  currency?: string       // Default: 'INR'
  receipt: string         // Order reference (e.g., order number)
  notes?: Record<string, string>
}

export interface CreateOrderOutput {
  gateway_order_id: string    // Gateway-specific order/session ID
  amount: number              // Amount in INR
  currency: string
  receipt: string
  status: string              // Gateway-specific status
  raw_response: Record<string, unknown>  // Full gateway response for debugging
}

export interface VerifyPaymentInput {
  gateway_order_id: string
  gateway_payment_id: string
  gateway_signature: string   // For Razorpay signature verification
}

export interface VerifyPaymentOutput {
  verified: boolean
  payment_id: string
  amount: number              // In INR (converted from paise)
  status: 'captured' | 'failed' | 'pending'
  method?: string             // upi, card, netbanking, etc.
  bank_transaction_id?: string
  raw_response: Record<string, unknown>
}

export interface RefundInput {
  payment_id: string
  amount: number              // In INR — partial or full
  reason?: string
  notes?: Record<string, string>
}

export interface RefundOutput {
  refund_id: string
  payment_id: string
  amount: number              // In INR
  status: string
  raw_response: Record<string, unknown>
}

export interface PaymentStatusOutput {
  payment_id: string
  amount: number              // In INR
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'pending'
  method?: string
  raw_response: Record<string, unknown>
}

export interface FetchRefundOutput {
  refund_id: string
  payment_id: string
  amount: number              // In INR
  currency: string
  status: string              // 'pending' | 'processed' | 'failed'
  speed_processed?: string    // 'instant' | 'normal'
  created_at: number          // UNIX timestamp
  raw_response: Record<string, unknown>
}

// ============================================
// The adapter interface that all gateways implement
// ============================================
export interface PaymentGatewayAdapter {
  readonly name: string       // 'razorpay' | 'stripe'

  createOrder(input: CreateOrderInput): Promise<CreateOrderOutput>
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput>
  getPaymentStatus(paymentId: string): Promise<PaymentStatusOutput>
  initiateRefund(input: RefundInput): Promise<RefundOutput>
  fetchRefund(refundId: string): Promise<FetchRefundOutput>
}
