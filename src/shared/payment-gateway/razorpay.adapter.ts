import Razorpay from 'razorpay'
import crypto from 'crypto'
import type {
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

// ============================================
// Razorpay Adapter
// Implements PaymentGatewayAdapter interface
// ============================================

const razorpayConfig = {
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
}

// Lazily initialized — only created when first used
let razorpayInstance: Razorpay | null = null

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    if (!razorpayConfig.key_id || !razorpayConfig.key_secret) {
      throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env')
    }
    razorpayInstance = new Razorpay({
      key_id: razorpayConfig.key_id,
      key_secret: razorpayConfig.key_secret,
    })
  }
  return razorpayInstance
}

// INR to paise (Razorpay works in smallest currency unit)
function toPaise(amountInr: number): number {
  return Math.round(amountInr * 100)
}

// Paise to INR
function toInr(amountPaise: number): number {
  return amountPaise / 100
}

export const razorpayAdapter: PaymentGatewayAdapter = {
  name: 'razorpay',

  // ============================================
  // Create a Razorpay order
  // ============================================
  async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const instance = getRazorpayInstance()

    const orderData = {
      amount: toPaise(input.amount),
      currency: input.currency || 'INR',
      receipt: input.receipt,
      notes: input.notes || {},
    }

    const order = await instance.orders.create(orderData)

    return {
      gateway_order_id: order.id,
      amount: input.amount,
      currency: order.currency,
      receipt: order.receipt || input.receipt,
      status: order.status,
      raw_response: order as unknown as Record<string, unknown>,
    }
  },

  // ============================================
  // Verify payment signature + fetch payment details
  // ============================================
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    const instance = getRazorpayInstance()

    // Step 1: Verify signature (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.key_secret)
      .update(`${input.gateway_order_id}|${input.gateway_payment_id}`)
      .digest('hex')

    const signatureValid = expectedSignature === input.gateway_signature

    if (!signatureValid) {
      return {
        verified: false,
        payment_id: input.gateway_payment_id,
        amount: 0,
        status: 'failed',
        raw_response: { error: 'Signature verification failed' },
      }
    }

    // Step 2: Fetch payment details from Razorpay API
    const payment = await instance.payments.fetch(input.gateway_payment_id)

    const status: VerifyPaymentOutput['status'] =
      payment.status === 'captured' ? 'captured' :
      payment.status === 'failed' ? 'failed' : 'pending'

    return {
      verified: true,
      payment_id: payment.id,
      amount: toInr(payment.amount as number),
      status,
      method: payment.method as string | undefined,
      bank_transaction_id: (payment as Record<string, unknown>).acquirer_data
        ? ((payment as Record<string, unknown>).acquirer_data as Record<string, string>)?.bank_transaction_id
        : undefined,
      raw_response: payment as unknown as Record<string, unknown>,
    }
  },

  // ============================================
  // Get payment status by payment ID
  // ============================================
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusOutput> {
    const instance = getRazorpayInstance()

    const payment = await instance.payments.fetch(paymentId)

    return {
      payment_id: payment.id,
      amount: toInr(payment.amount as number),
      status: payment.status as PaymentStatusOutput['status'],
      method: payment.method as string | undefined,
      raw_response: payment as unknown as Record<string, unknown>,
    }
  },

  // ============================================
  // Initiate a refund (full or partial)
  // ============================================
  async initiateRefund(input: RefundInput): Promise<RefundOutput> {
    const instance = getRazorpayInstance()

    const refundData: Record<string, unknown> = {
      amount: toPaise(input.amount),
    }
    if (input.reason) {
      refundData.notes = { reason: input.reason, ...(input.notes || {}) }
    }

    const refund = await instance.payments.refund(input.payment_id, refundData)

    return {
      refund_id: refund.id,
      payment_id: input.payment_id,
      amount: toInr(refund.amount as number),
      status: refund.status as string,
      raw_response: refund as unknown as Record<string, unknown>,
    }
  },

  // ============================================
  // Fetch refund details by refund ID
  // ============================================
  async fetchRefund(refundId: string): Promise<FetchRefundOutput> {
    const instance = getRazorpayInstance()

    const refund = await instance.refunds.fetch(refundId)

    const refundData = refund as unknown as Record<string, unknown>

    return {
      refund_id: refund.id,
      payment_id: refund.payment_id as string,
      amount: toInr(refund.amount as number),
      currency: (refundData.currency as string) || 'INR',
      status: refund.status as string,
      speed_processed: refundData.speed_processed as string | undefined,
      created_at: refund.created_at as number,
      raw_response: refundData,
    }
  },
}
