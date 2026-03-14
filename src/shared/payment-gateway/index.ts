import { razorpayAdapter } from './razorpay.adapter'
import type { PaymentGatewayAdapter } from './payment-gateway.types'

// ============================================
// Payment Gateway Factory
// Returns the correct adapter based on gateway name
// ============================================

const adapters: Record<string, PaymentGatewayAdapter> = {
  razorpay: razorpayAdapter,
  // stripe: stripeAdapter,    — add when needed
  // paypal: paypalAdapter,    — add when needed
}

export function getPaymentGateway(gatewayName: string = 'razorpay'): PaymentGatewayAdapter {
  const adapter = adapters[gatewayName]
  if (!adapter) {
    throw new Error(`Payment gateway "${gatewayName}" is not supported. Available: ${Object.keys(adapters).join(', ')}`)
  }
  return adapter
}

// Re-export types for convenience
export type {
  PaymentGatewayAdapter,
  CreateOrderInput,
  CreateOrderOutput,
  VerifyPaymentInput,
  VerifyPaymentOutput,
  RefundInput,
  RefundOutput,
  PaymentStatusOutput,
  FetchRefundOutput,
} from './payment-gateway.types'
