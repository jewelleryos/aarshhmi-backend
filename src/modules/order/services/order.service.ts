import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { orderMessages } from '../config/order.messages'
import { sendEmail, orderConfirmedCustomerTemplate, orderRejectedCustomerTemplate, cancelApprovedCustomerTemplate, cancelRejectedCustomerTemplate, refundCompletedCustomerTemplate, orderShippedCustomerTemplate, orderDeliveredCustomerTemplate, returnAcceptedCustomerTemplate, returnRejectedCustomerTemplate, returnPickupScheduledCustomerTemplate, returnInTransitCustomerTemplate, returnReceivedCustomerTemplate, qcCheckCustomerTemplate, qcAcceptedCustomerTemplate, qcRejectedCustomerTemplate } from '../../../shared/email-service'
import { creditNoteTemplate } from '../../../shared/pdf-service/templates/credit-note.template'
import type { Attachment } from '../../../shared/email-service'
import { pdfService } from '../../../shared/pdf-service/pdf.service'
import { orderSheetTemplate } from '../../../shared/pdf-service/templates/order-sheet.template'
import { invoiceTemplate } from '../../../shared/pdf-service/templates/invoice.template'
import { uploadFile, getPublicUrl } from '../../../shared/bunny-service'
import { getPaymentGateway } from '../../../shared/payment-gateway'

// Valid stage transitions (backend validation)
const VALID_STAGE_TRANSITIONS: Record<number, number[]> = {
  4: [5, 6],      // On Hold → Confirmed or Rejected
  5: [7],         // Order Confirmed → In Process (admin manual)
  7: [10],        // In Process → Shipped (with weight verification)
  10: [11],       // Shipped → Delivered
  12: [13, 14],   // Cancel Requested → Cancel Approved or Cancel Rejected
  16: [17, 18],   // Return Requested → Return Accepted or Return Rejected
  17: [19],       // Return Accepted → Pickup Scheduled
  19: [20],       // Pickup Scheduled → Return In Transit
  20: [21],       // Return In Transit → Return Received
  21: [22],       // Return Received → QC Check
  22: [23, 24],   // QC Check → QC Accepted or QC Rejected
  28: [25, 29],   // Refund Failed → Retry refund or Manual Refund Done
}

// Which transitions require a reason
const REASON_REQUIRED_TRANSITIONS: string[] = ['4-6', '12-14', '16-18', '22-24']

// Cancellation window days from env
const CANCELLATION_WINDOW_DAYS = Number(process.env.ORDER_CANCELLATION_WINDOW_DAYS) || 3
const RETURN_WINDOW_DAYS = Number(process.env.ORDER_RETURN_WINDOW_DAYS) || 7

export const orderService = {
  // ============================================
  // GET / — List all orders
  // ============================================
  async list() {
    const result = await db.query(
      `SELECT
        o.id, o.order_number,
        o.customer_id,
        COALESCE(TRIM(CONCAT(c.first_name, ' ', c.last_name)), c.email, c.phone) AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        o.subtotal, o.coupon_discount, o.total_amount,
        o.total_quantity, o.stage,
        o.payment_status, o.payment_gateway,
        o.coupon_code,
        o.created_at,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
        (SELECT json_agg(json_build_object('stage', sub.stage, 'count', sub.cnt) ORDER BY sub.stage)
         FROM (SELECT oi.stage, COUNT(*)::int AS cnt FROM order_items oi WHERE oi.order_id = o.id GROUP BY oi.stage) sub
        ) AS item_stages
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC`
    )

    return { items: result.rows }
  },

  // ============================================
  // GET /:id — Order detail with items and logs
  // ============================================
  async getById(orderId: string) {
    const orderResult = await db.query(
      `SELECT
        o.*,
        COALESCE(TRIM(CONCAT(c.first_name, ' ', c.last_name)), c.email, c.phone) AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      throw new AppError(orderMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const order = orderResult.rows[0]

    // Fetch order items
    const itemsResult = await db.query(
      `SELECT
        oi.id, oi.suborder_number,
        oi.product_id, oi.variant_id, oi.product_snapshot,
        oi.metal_price, oi.making_charge, oi.diamond_price,
        oi.gemstone_price, oi.pearl_price,
        oi.price_without_tax, oi.tax_amount, oi.unit_price,
        oi.coupon_discount, oi.line_total, oi.paid_amount,
        oi.quantity, oi.stage, oi.previous_stage,
        oi.is_cancellable, oi.is_returnable,
        oi.is_cancel_requested, oi.is_return_requested,
        oi.cancel_reason, oi.return_reason,
        oi.tracking_id, oi.courier_name,
        oi.quoted_metal_weight, oi.actual_metal_weight,
        oi.weight_difference, oi.metal_rate_per_gram,
        oi.weight_adjustment_amount, oi.weight_adjustment_type,
        oi.certification_number,
        oi.order_sheet_url, oi.invoice_number, oi.invoice_url,
        oi.credit_note_number, oi.credit_note_url,
        oi.refund_amount, oi.refund_note, oi.refund_reference_id,
        oi.refund_processed_at, oi.refund_processed_by,
        oi.delivered_at, oi.return_window_ends_at,
        oi.metadata,
        oi.created_at, oi.updated_at
       FROM order_items oi
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    )

    // Fetch logs for all items
    const logsResult = await db.query(
      `SELECT
        ol.id, ol.order_item_id,
        ol.stage, ol.previous_stage,
        ol.note, ol.metadata,
        ol.email_sent,
        ol.actor_type, ol.actor_id,
        ol.created_at
       FROM order_item_logs ol
       WHERE ol.order_id = $1
       ORDER BY ol.created_at ASC`,
      [orderId]
    )

    // Fetch payment transactions
    const paymentsResult = await db.query(
      `SELECT
        pt.id, pt.order_item_id,
        pt.gateway_name, pt.gateway_transaction_id, pt.gateway_order_id,
        pt.type, pt.amount, pt.currency, pt.status,
        pt.refund_reason, pt.parent_transaction_id,
        pt.created_at, pt.updated_at
       FROM payment_transactions pt
       WHERE pt.order_id = $1
       ORDER BY pt.created_at ASC`,
      [orderId]
    )

    // Group logs by order_item_id
    const logsByItem: Record<string, any[]> = {}
    for (const log of logsResult.rows) {
      if (!logsByItem[log.order_item_id]) {
        logsByItem[log.order_item_id] = []
      }
      logsByItem[log.order_item_id].push(log)
    }

    // Attach logs to items
    const items = itemsResult.rows.map((item: any) => ({
      ...item,
      logs: logsByItem[item.id] || [],
    }))

    return {
      ...order,
      items,
      payments: paymentsResult.rows,
    }
  },

  // ============================================
  // PATCH /:orderId/items/:itemId/stage — Update sub-order stage
  // ============================================
  async updateItemStage(
    orderId: string,
    itemId: string,
    adminId: string,
    input: {
      stage: number
      note?: string
      refund_id?: string
      // Shipping fields (7 → 10)
      is_weight_same?: boolean
      actual_metal_weight?: number
      tracking_id?: string
      courier_name?: string
      // QC Accepted fields (22 → 23)
      is_full_refund?: boolean
      return_refund_amount?: number  // in paise
    }
  ) {
    // 1. Fetch order item with full order info
    const itemResult = await db.query(
      `SELECT
        oi.id, oi.order_id, oi.suborder_number, oi.stage, oi.product_snapshot,
        oi.quantity, oi.paid_amount,
        oi.metal_price, oi.making_charge, oi.diamond_price,
        oi.gemstone_price, oi.pearl_price,
        oi.price_without_tax, oi.tax_amount, oi.unit_price,
        oi.coupon_discount, oi.refund_amount,
        oi.invoice_number, oi.invoice_url,
        o.id AS order_uuid, o.order_number, o.customer_id,
        o.shipping_address, o.billing_address,
        o.payment_gateway_order_id, o.payment_gateway, o.coupon_code,
        o.created_at AS order_date
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND oi.order_id = $2`,
      [itemId, orderId]
    )

    if (itemResult.rows.length === 0) {
      throw new AppError(orderMessages.ITEM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const item = itemResult.rows[0]
    const currentStage = item.stage
    const newStage = input.stage

    // 2. Validate stage transition
    const validNextStages = VALID_STAGE_TRANSITIONS[currentStage] || []
    if (!validNextStages.includes(newStage)) {
      throw new AppError(orderMessages.INVALID_STAGE_TRANSITION, HTTP_STATUS.BAD_REQUEST)
    }

    // 3. Validate refund_id for manual refund (28→29)
    if (newStage === 29 && currentStage === 28 && !input.refund_id?.trim()) {
      throw new AppError(orderMessages.REFUND_ID_REQUIRED, HTTP_STATUS.BAD_REQUEST)
    }

    // 4. Validate reason for required transitions
    const transitionKey = `${currentStage}-${newStage}`
    if (REASON_REQUIRED_TRANSITIONS.includes(transitionKey) && !input.note?.trim()) {
      throw new AppError(orderMessages.REASON_REQUIRED, HTTP_STATUS.BAD_REQUEST)
    }

    // 4. Begin transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      if (newStage === 5 && currentStage === 4) {
        // --- Confirm order: 4 → 5 (Order Confirmed) ---
        await client.query(
          `UPDATE order_items
           SET stage = 5, previous_stage = 4, is_cancellable = true, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        // Set cancellation window on the order
        await client.query(
          `UPDATE orders
           SET cancellation_window_ends_at = NOW() + INTERVAL '${CANCELLATION_WINDOW_DAYS} days'
           WHERE id = $1`,
          [orderId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 5, 4, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || null, adminId]
        )

      } else if (newStage === 6 && currentStage === 4) {
        // --- Reject order: 4 → 6 (Order Rejected) → auto triggers refund ---
        await client.query(
          `UPDATE order_items
           SET stage = 6, previous_stage = 4, cancel_reason = $1, is_cancellable = false, updated_at = NOW()
           WHERE id = $2`,
          [input.note || null, itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 6, 4, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || null, adminId]
        )

      } else if (newStage === 7 && currentStage === 5) {
        // --- Move to In Process: 5 → 7 (admin manual) ---
        await client.query(
          `UPDATE order_items
           SET stage = 7, previous_stage = 5, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 7, 5, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || null, adminId]
        )

      } else if (newStage === 10 && currentStage === 7) {
        // --- Ship order: 7 → 10 (Shipped) with weight verification ---
        const snapshot = item.product_snapshot || {}
        const quotedWeight = snapshot.variantMetadata?.metalWeight || 0
        const originalMetalPrice = item.metal_price || 0

        // Determine actual weight
        const isWeightSame = input.is_weight_same !== false
        const actualWeight = isWeightSame ? quotedWeight : (input.actual_metal_weight || 0)

        if (!isWeightSame && (!input.actual_metal_weight || input.actual_metal_weight <= 0)) {
          throw new AppError('Actual metal weight is required when weight is not same', HTTP_STATUS.BAD_REQUEST)
        }

        // Calculate metal rate per gram from original order pricing
        const metalRatePerGram = quotedWeight > 0 ? Math.round(originalMetalPrice / quotedWeight) : 0

        // Calculate weight adjustment
        let weightDifference = 0
        let weightAdjustmentAmount = 0
        let weightAdjustmentType = 'none'
        let newMetalPrice = originalMetalPrice

        if (!isWeightSame && quotedWeight > 0) {
          weightDifference = actualWeight - quotedWeight
          newMetalPrice = Math.round(actualWeight * metalRatePerGram)
          const metalPriceDiff = newMetalPrice - originalMetalPrice

          const newPriceWithoutTax = item.price_without_tax + metalPriceDiff
          const taxRate = CURRENCY_CONFIG.includeTax ? CURRENCY_CONFIG.taxRatePercent / 100 : 0
          const newTaxAmount = Math.round(newPriceWithoutTax * taxRate)
          const newFinalPrice = newPriceWithoutTax + newTaxAmount

          const paidBeforeDiscount = item.paid_amount + (item.coupon_discount || 0)
          weightAdjustmentAmount = Math.abs(paidBeforeDiscount - (newFinalPrice * item.quantity))

          if (weightDifference < 0) {
            weightAdjustmentType = 'refund'
          } else if (weightDifference > 0) {
            weightAdjustmentType = 'complimentary'
          }
        }

        // --- If refund needed, process it synchronously BEFORE committing ---
        let refundReferenceId: string | null = null
        let refundAmountPaise = 0

        if (weightAdjustmentType === 'refund' && weightAdjustmentAmount > 0) {
          // Fetch captured payment transaction
          const txnResult = await client.query(
            `SELECT id, gateway_transaction_id FROM payment_transactions
             WHERE order_id = $1 AND type = 'payment' AND status = 'captured'
             LIMIT 1`,
            [orderId]
          )
          if (txnResult.rows.length === 0) {
            throw new AppError('No captured payment found for partial refund', HTTP_STATUS.BAD_REQUEST)
          }

          const paymentTxn = txnResult.rows[0]
          const gateway = getPaymentGateway(item.payment_gateway || 'razorpay')
          refundAmountPaise = weightAdjustmentAmount
          const refundAmountInr = refundAmountPaise / 100

          // Initiate partial refund — throws on failure, which rolls back the transaction
          let refundResult
          try {
            refundResult = await gateway.initiateRefund({
              payment_id: paymentTxn.gateway_transaction_id,
              amount: refundAmountInr,
              reason: `Weight adjustment: ${quotedWeight}g → ${actualWeight}g`,
            })
          } catch (refundErr) {
            throw new AppError('Partial refund failed. Please try again.', HTTP_STATUS.BAD_REQUEST)
          }

          refundReferenceId = refundResult.refund_id

          // Record refund transaction
          await client.query(
            `INSERT INTO payment_transactions (
              order_id, order_item_id, gateway_name, gateway_transaction_id, gateway_order_id,
              type, amount, currency, status, refund_reason, parent_transaction_id, gateway_response
            ) VALUES ($1, $2, $3, $4, $5, 'partial_refund', $6, 'INR', $7, $8, $9, $10)`,
            [
              orderId, itemId, gateway.name,
              refundResult.refund_id,
              item.payment_gateway_order_id || null,
              refundAmountPaise,
              refundResult.status,
              `Weight adjustment: ${quotedWeight}g → ${actualWeight}g`,
              paymentTxn.id,
              JSON.stringify(refundResult.raw_response),
            ]
          )

          // Log partial refund stage (27)
          await client.query(
            `INSERT INTO order_item_logs (
              order_id, order_item_id, customer_id,
              stage, previous_stage, note, actor_type, actor_id
            ) VALUES ($1, $2, $3, 27, 7, $4, 'system', NULL)`,
            [orderId, itemId, item.customer_id,
              `Partial refund of ₹${(refundAmountPaise / 100).toFixed(2)} — Refund ID: ${refundResult.refund_id}`]
          )
        }

        // Generate invoice number
        const invoiceNumber = `INV-${item.suborder_number}`

        // Update order_items
        await client.query(
          `UPDATE order_items
           SET stage = 10, previous_stage = 7,
               quoted_metal_weight = $1, actual_metal_weight = $2,
               weight_difference = $3, metal_rate_per_gram = $4,
               weight_adjustment_amount = $5, weight_adjustment_type = $6,
               tracking_id = $7, courier_name = $8,
               is_cancellable = false,
               refund_amount = $9, refund_reference_id = $10,
               refund_processed_at = ${refundReferenceId ? 'NOW()' : 'NULL'},
               refund_processed_by = ${refundReferenceId ? `'${adminId}'` : 'NULL'},
               invoice_number = $11,
               updated_at = NOW()
           WHERE id = $12`,
          [
            quotedWeight, actualWeight,
            weightDifference, metalRatePerGram,
            weightAdjustmentAmount, weightAdjustmentType,
            input.tracking_id?.trim() || null, input.courier_name?.trim() || null,
            refundAmountPaise || null, refundReferenceId,
            invoiceNumber,
            itemId,
          ]
        )

        // Log shipped stage
        const logParts = ['Shipped']
        if (weightAdjustmentType === 'refund') {
          logParts.push(`Weight: ${quotedWeight}g → ${actualWeight}g (refund ₹${(weightAdjustmentAmount / 100).toFixed(2)})`)
        } else if (weightAdjustmentType === 'complimentary') {
          logParts.push(`Weight: ${quotedWeight}g → ${actualWeight}g (complimentary ₹${(weightAdjustmentAmount / 100).toFixed(2)})`)
        }
        if (input.tracking_id?.trim()) {
          logParts.push(`Tracking: ${input.tracking_id.trim()}`)
        }

        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 10, 7, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, logParts.join(' · '), adminId]
        )

        // Store shipping data for post-commit handler
        ;(item as any)._shippingData = {
          quotedWeight, actualWeight, weightDifference,
          metalRatePerGram, newMetalPrice,
          weightAdjustmentAmount, weightAdjustmentType,
          refundReferenceId, refundAmountPaise,
          invoiceNumber,
          trackingId: input.tracking_id?.trim() || null,
          courierName: input.courier_name?.trim() || null,
        }

      } else if (newStage === 11 && currentStage === 10) {
        // --- Delivered: 10 → 11 ---
        await client.query(
          `UPDATE order_items
           SET stage = 11, previous_stage = 10,
               delivered_at = NOW(), is_returnable = true,
               return_window_ends_at = NOW() + INTERVAL '${RETURN_WINDOW_DAYS} days',
               updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 11, 10, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Order delivered', adminId]
        )

      } else if (newStage === 13 && currentStage === 12) {
        // --- Cancel Approved: 12 → 13 → auto triggers refund ---
        await client.query(
          `UPDATE order_items
           SET stage = 13, previous_stage = 12, is_cancel_requested = false, is_cancellable = false, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 13, 12, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Cancellation approved', adminId]
        )

      } else if (newStage === 14 && currentStage === 12) {
        // --- Cancel Rejected: 12 → 14 → then back to previous stage ---
        // Fetch previous_stage to know where to return
        const prevResult = await client.query(
          `SELECT previous_stage FROM order_items WHERE id = $1`,
          [itemId]
        )
        const returnStage = prevResult.rows[0]?.previous_stage || 5

        await client.query(
          `UPDATE order_items
           SET stage = $1, previous_stage = 12, is_cancel_requested = false, updated_at = NOW()
           WHERE id = $2`,
          [returnStage, itemId]
        )
        // Log cancel rejected (14)
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 14, 12, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Cancellation rejected', adminId]
        )
        // Log return to previous stage
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, $4, 14, 'Returned to previous stage after cancel rejection', 'system', NULL)`,
          [orderId, itemId, item.customer_id, returnStage]
        )

      } else if (newStage === 17 && currentStage === 16) {
        // --- Return Accepted: 16 → 17 ---
        await client.query(
          `UPDATE order_items
           SET stage = 17, previous_stage = 16, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 17, 16, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Return accepted', adminId]
        )

      } else if (newStage === 18 && currentStage === 16) {
        // --- Return Rejected: 16 → 18 → revert to Delivered (11) ---
        await client.query(
          `UPDATE order_items
           SET stage = 11, previous_stage = 16, is_return_requested = false, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        // Log return rejected (18)
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 18, 16, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Return rejected', adminId]
        )
        // Log revert to Delivered (11)
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 11, 18, 'Returned to Delivered after return rejection', 'system', NULL)`,
          [orderId, itemId, item.customer_id]
        )

      } else if (newStage === 19 && currentStage === 17) {
        // --- Pickup Scheduled: 17 → 19 ---
        await client.query(
          `UPDATE order_items
           SET stage = 19, previous_stage = 17, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 19, 17, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Pickup scheduled', adminId]
        )

      } else if (newStage === 20 && currentStage === 19) {
        // --- Return In Transit: 19 → 20 ---
        await client.query(
          `UPDATE order_items
           SET stage = 20, previous_stage = 19, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 20, 19, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Return picked up', adminId]
        )

      } else if (newStage === 21 && currentStage === 20) {
        // --- Return Received: 20 → 21 ---
        await client.query(
          `UPDATE order_items
           SET stage = 21, previous_stage = 20, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 21, 20, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'Return received', adminId]
        )

      } else if (newStage === 23 && currentStage === 22) {
        // --- QC Accepted: 22 → 23 — validate refund amount ---
        const maxRefundable = item.paid_amount - (item.refund_amount || 0)
        const returnRefundAmount = input.is_full_refund ? maxRefundable : (input.return_refund_amount || 0)

        if (returnRefundAmount <= 0 || returnRefundAmount > maxRefundable) {
          throw new AppError(
            `Refund amount must be between 1 paise and ${maxRefundable} paise (₹${(maxRefundable / 100).toFixed(2)})`,
            HTTP_STATUS.BAD_REQUEST
          )
        }

        // Store refund amount in _qcData for post-commit handler
        ;(item as any)._qcRefundAmount = returnRefundAmount

        await client.query(
          `UPDATE order_items
           SET stage = 23, previous_stage = 22, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 23, 22, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || `QC accepted — refund ₹${(returnRefundAmount / 100).toFixed(2)}`, adminId]
        )

      } else if (newStage === 24 && currentStage === 22) {
        // --- QC Rejected: 22 → 24 (terminal) ---
        await client.query(
          `UPDATE order_items
           SET stage = 24, previous_stage = 22, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 24, 22, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'QC rejected', adminId]
        )

      } else if (newStage === 22 && currentStage === 21) {
        // --- QC Check: 21 → 22 ---
        await client.query(
          `UPDATE order_items
           SET stage = 22, previous_stage = 21, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 22, 21, $4, 'admin', $5)`,
          [orderId, itemId, item.customer_id, input.note || 'QC check started', adminId]
        )

      } else if (newStage === 25 && currentStage === 28) {
        // --- Retry refund: 28 → 25 (Refund Initiated) ---
        await client.query(
          `UPDATE order_items
           SET stage = 25, previous_stage = 28, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        )
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage, note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 25, 28, 'Retrying refund', 'admin', $4)`,
          [orderId, itemId, item.customer_id, adminId]
        )

      } else if (newStage === 29 && currentStage === 28) {
        // --- Manual refund done: 28 → 29 ---
        // Stage update happens in handleManualRefund after verification
        // Just commit the current state, handler will update
      }

      await client.query('COMMIT')

      // 5. Post-commit actions (fire-and-forget)
      if (newStage === 11) {
        // Delivered → send email
        this.handleOrderDelivered(item)
      } else if (newStage === 10) {
        // Shipped → generate invoice + send email
        this.handleOrderShipped(item)
      } else if (newStage === 5) {
        // Order Confirmed → generate order sheet + send email
        this.handleOrderConfirmed(item, input.note || '')
      } else if (newStage === 6) {
        // Order Rejected → auto-trigger refund initiation
        this.handleOrderRejected(item, adminId, input.note || '')
      } else if (newStage === 13) {
        // Cancel Approved → auto-transition to Refund Initiated (25) → process refund
        this.handleCancelApproved(item, adminId, input.note || '')
      } else if (newStage === 14) {
        // Cancel Rejected → send email to customer
        this.handleCancelRejected(item, input.note || '')
      } else if (newStage === 17) {
        // Return Accepted → send email to customer
        this.handleReturnAccepted(item, input.note || '')
      } else if (newStage === 18) {
        // Return Rejected → send email to customer
        this.handleReturnRejected(item, input.note || '')
      } else if (newStage === 19) {
        // Pickup Scheduled → send email to customer
        this.handlePickupScheduled(item, input.note || '')
      } else if (newStage === 20) {
        // Return In Transit → send email to customer
        this.handleReturnInTransit(item)
      } else if (newStage === 21) {
        // Return Received → send email to customer
        this.handleReturnReceived(item)
      } else if (newStage === 22) {
        // QC Check → send email to customer
        this.handleQcCheck(item)
      } else if (newStage === 23) {
        // QC Accepted → auto-trigger refund + credit note
        this.handleQcAccepted(item, adminId, input.note || '', (item as any)._qcRefundAmount)
      } else if (newStage === 24) {
        // QC Rejected → send email to customer
        this.handleQcRejected(item, input.note || '')
      } else if (newStage === 25) {
        // Refund Initiated (from retry) → process refund async
        this.handleRefundInitiated(item, adminId, input.note || '')
      } else if (newStage === 29) {
        // Manual Refund Done → verify with Razorpay + update
        this.handleManualRefund(item, adminId, input.refund_id!)
      }

      return { stage: newStage }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // ============================================
  // Internal: Handle post-confirmation tasks
  // ============================================
  async handleOrderConfirmed(item: any, note: string) {
    try {
      // Fetch customer info
      const customerResult = await db.query(
        `SELECT first_name, last_name, email, phone FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
      const snapshot = item.product_snapshot || {}
      const variantMeta = snapshot.variantMetadata || {}
      const productMeta = snapshot.productMetadata || {}
      const optionConfig = snapshot.optionConfig || {}

      // Fetch payment ID from transactions
      const txnResult = await db.query(
        `SELECT gateway_transaction_id FROM payment_transactions
         WHERE order_id = $1 AND type = 'payment' AND status = 'captured'
         LIMIT 1`,
        [item.order_id]
      )
      const paymentId = txnResult.rows[0]?.gateway_transaction_id || ''

      // Resolve option IDs to display names
      const resolveOptionName = (list: any[] | null, id: string | null): string | null => {
        if (!list || !id) return null
        return list.find((o: any) => o.id === id)?.name || null
      }

      const metalType = resolveOptionName(optionConfig.metalTypes, snapshot.options?.metalType)
      const metalColor = resolveOptionName(optionConfig.metalColors, snapshot.options?.metalColor)
      const metalPurity = resolveOptionName(optionConfig.metalPurities, snapshot.options?.metalPurity)
      const diamondClarityColor = resolveOptionName(optionConfig.diamondClarityColors, snapshot.options?.diamondClarityColor)
      const gemstoneColor = resolveOptionName(optionConfig.gemstoneColors, snapshot.options?.gemstoneColor)

      // Resolve stone details — fetch shape/type names
      const diamonds = await this.resolveStoneDetails(variantMeta.diamonds || [], 'diamond')
      const gemstones = await this.resolveStoneDetails(variantMeta.gemstones || [], 'gemstone')
      const pearls = await this.resolvePearlDetails(variantMeta.pearls || [])

      // Extract product image URL
      const productImageUrl = this.extractProductImage(snapshot)

      // Calculate weights
      const metalWeight = variantMeta.metalWeight || null
      const totalPearlGrams = (variantMeta.pearls || []).reduce((sum: number, p: any) => sum + (p.totalGrams || 0), 0)
      const totalProductWeight = metalWeight ? metalWeight + totalPearlGrams : null

      // --- Generate order sheet PDF ---
      try {
        const html = orderSheetTemplate({
          orderId: item.order_uuid,
          orderNumber: item.order_number,
          suborderNumber: item.suborder_number,
          razorpayOrderId: item.payment_gateway_order_id || '',
          paymentId,
          orderDate: item.order_date,
          productName: snapshot.productName || '',
          productSku: snapshot.productSku || '',
          variantName: snapshot.variantName || '',
          variantSku: snapshot.sku || '',
          productImageUrl,
          metalType,
          metalColor,
          metalPurity,
          diamondClarityColor,
          gemstoneColor,
          dimensions: productMeta.dimensions || null,
          hasEngraving: productMeta.engraving?.hasEngraving || false,
          engravingText: snapshot.engravingText || null,
          maxEngravingChars: productMeta.engraving?.maxCharacters || null,
          hasSizeChart: snapshot.sizeChart?.hasSizeChart || false,
          sizeChartValueName: snapshot.sizeChartValueName || null,
          metalWeight,
          totalProductWeight,
          diamonds,
          gemstones,
          pearls,
          metalPrice: item.metal_price,
          makingCharge: item.making_charge,
          diamondPrice: item.diamond_price,
          gemstonePrice: item.gemstone_price,
          pearlPrice: item.pearl_price,
          priceWithoutTax: item.price_without_tax,
          taxAmount: item.tax_amount,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          couponDiscount: item.coupon_discount,
          couponCode: item.coupon_code || null,
          paidAmount: item.paid_amount,
          shippingAddress: item.shipping_address,
          billingAddress: item.billing_address,
          customerName,
          customerEmail: customer.email || '',
          customerPhone: customer.phone || '',
        })

        const pdfBuffer = await pdfService.generatePdf({ html })

        // Upload to CDN
        const cdnFolder = `documents/orders/${item.order_number}`
        const fileName = `order-sheet-${item.suborder_number}.pdf`
        const uploadResult = await uploadFile(cdnFolder, pdfBuffer, fileName)

        if (uploadResult.success && uploadResult.data) {
          const sheetUrl = getPublicUrl(uploadResult.data.path)
          await db.query(
            `UPDATE order_items SET order_sheet_url = $1 WHERE id = $2`,
            [sheetUrl, item.id]
          )
        }
      } catch (pdfErr) {
        console.error('Failed to generate order sheet PDF:', pdfErr)
      }

      // --- Send confirmation email ---
      if (customer.email) {
        const emailItems = [{
          productName: snapshot.productName || '',
          variantName: snapshot.variantName || '',
          quantity: item.quantity,
          paidAmount: item.paid_amount,
        }]

        sendEmail({
          to: customer.email,
          subject: `Order Confirmed — ${item.suborder_number}`,
          html: orderConfirmedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            items: emailItems,
            totalAmount: item.paid_amount,
            note,
          }),
        }).catch((err) => console.error('Failed to send order confirmed email:', err))
      }
    } catch (err) {
      console.error('Failed to handle order confirmation:', err)
    }
  },

  // ============================================
  // Internal: Handle order shipped — generate invoice + send email
  // ============================================
  async handleOrderShipped(item: any) {
    try {
      const shippingData = (item as any)._shippingData
      if (!shippingData) return

      // 1. Fetch customer info
      const customerResult = await db.query(
        `SELECT first_name, last_name, email, phone FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
      const snapshot = item.product_snapshot || {}

      const {
        quotedWeight, actualWeight, weightAdjustmentType, weightAdjustmentAmount,
        newMetalPrice, refundReferenceId, refundAmountPaise,
        invoiceNumber, trackingId, courierName,
      } = shippingData

      // 2. Calculate invoice amount
      const hasWeightChange = weightAdjustmentType !== 'none'
      const displayMetalPrice = hasWeightChange ? newMetalPrice : item.metal_price
      const metalPriceDiff = displayMetalPrice - item.metal_price
      const displayPriceWithoutTax = item.price_without_tax + metalPriceDiff
      const displayTaxAmount = Math.round(displayPriceWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
      const displayUnitPrice = displayPriceWithoutTax + displayTaxAmount

      // Invoice amount: for refund case → new lower price; for complimentary → original paid (discount absorbed)
      let invoiceAmount = displayUnitPrice * item.quantity
      if (item.coupon_discount > 0) invoiceAmount -= item.coupon_discount
      if (weightAdjustmentType === 'complimentary') {
        invoiceAmount = item.paid_amount // customer paid original, extra weight is free
      }

      // 3. Generate invoice PDF
      let invoiceUrl: string | null = null
      let pdfBuffer: Buffer | null = null
      try {
        const html = invoiceTemplate({
          invoiceNumber,
          orderNumber: item.order_number,
          suborderNumber: item.suborder_number,
          orderDate: item.order_date,
          invoiceDate: new Date().toISOString(),
          customerName,
          customerEmail: customer.email || '',
          customerPhone: customer.phone || '',
          shippingAddress: item.shipping_address,
          billingAddress: item.billing_address,
          productName: snapshot.productName || '',
          variantName: snapshot.variantName || '',
          sku: snapshot.sku || '',
          quantity: item.quantity,
          metalPrice: item.metal_price,
          makingCharge: item.making_charge,
          diamondPrice: item.diamond_price,
          gemstonePrice: item.gemstone_price,
          pearlPrice: item.pearl_price,
          priceWithoutTax: item.price_without_tax,
          taxAmount: item.tax_amount,
          unitPrice: item.unit_price,
          couponDiscount: item.coupon_discount,
          couponCode: item.coupon_code || null,
          weightAdjustmentType,
          weightAdjustmentAmount,
          quotedMetalWeight: quotedWeight,
          actualMetalWeight: actualWeight,
          newMetalPrice: displayMetalPrice,
          invoiceAmount,
          paidAmount: item.paid_amount,
          refundAmount: refundAmountPaise || 0,
          refundId: refundReferenceId,
          trackingId,
          courierName,
        })

        pdfBuffer = await pdfService.generatePdf({ html })

        // Upload to CDN
        const cdnFolder = `documents/orders/${item.order_number}`
        const fileName = `invoice-${item.suborder_number}.pdf`
        const uploadResult = await uploadFile(cdnFolder, pdfBuffer, fileName)

        if (uploadResult.success && uploadResult.data) {
          invoiceUrl = getPublicUrl(uploadResult.data.path)
          await db.query(
            `UPDATE order_items SET invoice_url = $1 WHERE id = $2`,
            [invoiceUrl, item.id]
          )
        }
      } catch (pdfErr) {
        console.error('Failed to generate invoice PDF:', pdfErr)
      }

      // 4. Send shipped email with invoice attachment
      if (customer.email) {
        const attachments: Attachment[] = []
        if (pdfBuffer) {
          attachments.push({
            filename: `invoice-${item.suborder_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          })
        }

        sendEmail({
          to: customer.email,
          subject: `Order Shipped — ${item.suborder_number}`,
          html: orderShippedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            paidAmount: item.paid_amount,
            trackingId,
            courierName,
            hasRefund: weightAdjustmentType === 'refund',
            refundAmount: refundAmountPaise || 0,
            refundId: refundReferenceId,
          }),
          attachments,
        }).catch((err) => console.error('Failed to send order shipped email:', err))
      }
    } catch (err) {
      console.error('Failed to handle order shipped:', err)
    }
  },

  // ============================================
  // Internal: Handle order delivered — send email
  // ============================================
  async handleOrderDelivered(item: any) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Order Delivered — ${item.suborder_number}`,
          html: orderDeliveredCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            paidAmount: item.paid_amount,
          }),
        }).catch((err) => console.error('Failed to send order delivered email:', err))
      }
    } catch (err) {
      console.error('Failed to handle order delivered:', err)
    }
  },

  // ============================================
  // Internal: Handle order rejection — auto-transition to refund
  // 6 (Rejected) → 25 (Refund Initiated) → process refund
  // ============================================
  async handleOrderRejected(item: any, adminId: string, reason: string) {
    try {
      // 1. Send order cancelled email to customer
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length > 0) {
        const customer = customerResult.rows[0]
        const snapshot = item.product_snapshot || {}

        if (customer.email) {
          sendEmail({
            to: customer.email,
            subject: `Order Cancelled — ${item.suborder_number}`,
            html: orderRejectedCustomerTemplate({
              firstName: customer.first_name || 'Customer',
              orderNumber: item.order_number,
              suborderNumber: item.suborder_number,
              productName: snapshot.productName || '',
              variantName: snapshot.variantName || '',
              reason,
            }),
          }).catch((err) => console.error('Failed to send order cancelled email:', err))
        }
      }

      // 2. Auto-transition: Order Rejected (6) → Refund Initiated (25)
      await db.query(
        `UPDATE order_items SET stage = 25, previous_stage = 6, updated_at = NOW() WHERE id = $1`,
        [item.id]
      )
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 25, 6, 'Auto-initiated refund after rejection', 'system', NULL)`,
        [item.order_id, item.id, item.customer_id]
      )

      // 3. Process the actual refund
      await this.handleRefundInitiated(item, adminId, reason)
    } catch (err) {
      console.error('Failed to handle order rejection:', err)
    }
  },

  // ============================================
  // Internal: Handle cancel approved — auto-transition to refund
  // 13 (Cancel Approved) → 25 (Refund Initiated) → process refund
  // ============================================
  async handleCancelApproved(item: any, adminId: string, note: string) {
    try {
      // 1. Send cancellation approved email to customer
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length > 0) {
        const customer = customerResult.rows[0]
        const snapshot = item.product_snapshot || {}

        if (customer.email) {
          sendEmail({
            to: customer.email,
            subject: `Cancellation Approved — ${item.suborder_number}`,
            html: cancelApprovedCustomerTemplate({
              firstName: customer.first_name || 'Customer',
              orderNumber: item.order_number,
              suborderNumber: item.suborder_number,
              productName: snapshot.productName || '',
              variantName: snapshot.variantName || '',
              paidAmount: item.paid_amount,
            }),
          }).catch((err) => console.error('Failed to send cancel approved email:', err))
        }
      }

      // 2. Auto-transition: Cancel Approved (13) → Refund Initiated (25)
      await db.query(
        `UPDATE order_items SET stage = 25, previous_stage = 13, updated_at = NOW() WHERE id = $1`,
        [item.id]
      )
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 25, 13, 'Auto-initiated refund after cancel approval', 'system', NULL)`,
        [item.order_id, item.id, item.customer_id]
      )

      // 3. Process the actual refund
      await this.handleRefundInitiated(item, adminId, note || 'Cancellation approved')
    } catch (err) {
      console.error('Failed to handle cancel approved:', err)
    }
  },

  // ============================================
  // Internal: Handle cancel rejected — send email to customer
  // ============================================
  async handleCancelRejected(item: any, reason: string) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Cancellation Request Rejected — ${item.suborder_number}`,
          html: cancelRejectedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            reason,
          }),
        }).catch((err) => console.error('Failed to send cancel rejected email:', err))
      }
    } catch (err) {
      console.error('Failed to handle cancel rejected:', err)
    }
  },

  // ============================================
  // Internal: Handle return accepted — send email to customer
  // ============================================
  async handleReturnAccepted(item: any, _note: string) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Return Request Accepted — ${item.suborder_number}`,
          html: returnAcceptedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
          }),
        }).catch((err) => console.error('Failed to send return accepted email:', err))
      }
    } catch (err) {
      console.error('Failed to handle return accepted:', err)
    }
  },

  // ============================================
  // Internal: Handle return rejected — send email to customer
  // ============================================
  async handleReturnRejected(item: any, reason: string) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Return Request Rejected — ${item.suborder_number}`,
          html: returnRejectedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            reason,
          }),
        }).catch((err) => console.error('Failed to send return rejected email:', err))
      }
    } catch (err) {
      console.error('Failed to handle return rejected:', err)
    }
  },

  // ============================================
  // Internal: Handle pickup scheduled — send email to customer
  // ============================================
  async handlePickupScheduled(item: any, note: string) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Return Pickup Scheduled — ${item.suborder_number}`,
          html: returnPickupScheduledCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            note,
          }),
        }).catch((err) => console.error('Failed to send pickup scheduled email:', err))
      }
    } catch (err) {
      console.error('Failed to handle pickup scheduled:', err)
    }
  },

  // ============================================
  // Internal: Handle return in transit — send email to customer
  // ============================================
  async handleReturnInTransit(item: any) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Return Picked Up — ${item.suborder_number}`,
          html: returnInTransitCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
          }),
        }).catch((err) => console.error('Failed to send return in transit email:', err))
      }
    } catch (err) {
      console.error('Failed to handle return in transit:', err)
    }
  },

  // ============================================
  // Internal: Handle return received — send email to customer
  // ============================================
  async handleReturnReceived(item: any) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Return Received — ${item.suborder_number}`,
          html: returnReceivedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
          }),
        }).catch((err) => console.error('Failed to send return received email:', err))
      }
    } catch (err) {
      console.error('Failed to handle return received:', err)
    }
  },

  // ============================================
  // Internal: Handle QC check — send email to customer
  // ============================================
  async handleQcCheck(item: any) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Quality Check In Progress — ${item.suborder_number}`,
          html: qcCheckCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
          }),
        }).catch((err) => console.error('Failed to send QC check email:', err))
      }
    } catch (err) {
      console.error('Failed to handle QC check:', err)
    }
  },

  // ============================================
  // Internal: Handle QC accepted — auto-trigger refund + generate credit note
  // ============================================
  async handleQcAccepted(item: any, adminId: string, note: string, returnRefundAmount: number) {
    try {
      // 1. Auto-transition: QC Accepted (23) → Refund Initiated (25)
      await db.query(
        `UPDATE order_items SET stage = 25, previous_stage = 23, updated_at = NOW() WHERE id = $1`,
        [item.id]
      )
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 25, 23, 'Auto-initiated refund after QC acceptance', 'system', NULL)`,
        [item.order_id, item.id, item.customer_id]
      )

      // 2. Fetch customer info
      const customerResult = await db.query(
        `SELECT first_name, last_name, email, phone FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return
      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}
      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')

      // 2b. Send QC accepted email
      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Quality Check Passed — ${item.suborder_number}`,
          html: qcAcceptedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            refundAmount: returnRefundAmount,
          }),
        }).catch((err) => console.error('Failed to send QC accepted email:', err))
      }

      // 3. Fetch captured payment transaction
      const txnResult = await db.query(
        `SELECT id, gateway_transaction_id FROM payment_transactions
         WHERE order_id = $1 AND type = 'payment' AND status = 'captured'
         LIMIT 1`,
        [item.order_id]
      )
      if (txnResult.rows.length === 0) {
        console.error('No captured payment found for return refund, order:', item.order_id)
        await this.updateStageAsync(item, 28, 25, 'No captured payment found')
        return
      }

      const paymentTxn = txnResult.rows[0]
      const refundAmountInr = returnRefundAmount / 100

      // 4. Initiate refund via payment gateway
      const gateway = getPaymentGateway(item.payment_gateway || 'razorpay')
      let refundResult
      try {
        refundResult = await gateway.initiateRefund({
          payment_id: paymentTxn.gateway_transaction_id,
          amount: refundAmountInr,
          reason: note || 'Return refund after QC acceptance',
        })
      } catch (refundErr) {
        console.error('Return refund gateway call failed:', refundErr)
        await this.updateStageAsync(item, 28, 25, 'Refund gateway call failed')
        return
      }

      // 5. Record refund transaction
      await db.query(
        `INSERT INTO payment_transactions (
          order_id, order_item_id, gateway_name, gateway_transaction_id, gateway_order_id,
          type, amount, currency, status, refund_reason, parent_transaction_id, gateway_response
        ) VALUES ($1, $2, $3, $4, $5, 'refund', $6, 'INR', $7, $8, $9, $10)`,
        [
          item.order_id,
          item.id,
          gateway.name,
          refundResult.refund_id,
          item.payment_gateway_order_id || null,
          returnRefundAmount,
          refundResult.status,
          note || 'Return refund after QC acceptance',
          paymentTxn.id,
          JSON.stringify(refundResult.raw_response),
        ]
      )

      // 6. Generate credit note number
      const cnCountResult = await db.query(`SELECT COUNT(*)::int AS cnt FROM order_items WHERE credit_note_number IS NOT NULL`)
      const cnSeq = (cnCountResult.rows[0]?.cnt || 0) + 1
      const creditNoteNumber = `CN-${item.order_number}-${String(cnSeq).padStart(3, '0')}`

      // 7. Update order_items — refund details + credit note + stage to 26
      const totalRefund = (item.refund_amount || 0) + returnRefundAmount
      await db.query(
        `UPDATE order_items
         SET stage = 26, previous_stage = 25,
             refund_amount = $1, refund_reference_id = $2,
             refund_note = $3, refund_processed_at = NOW(), refund_processed_by = $4,
             credit_note_number = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [totalRefund, refundResult.refund_id, note || 'Return refund', adminId, creditNoteNumber, item.id]
      )

      // 8. Log: Refund Completed
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 26, 25, $4, 'system', NULL)`,
        [item.order_id, item.id, item.customer_id, `Return refund completed — ${refundResult.refund_id}`]
      )

      // 9. Generate credit note PDF + upload (fire-and-forget)
      ;(async () => {
        try {
          const creditNoteHtml = creditNoteTemplate({
            creditNoteNumber,
            invoiceNumber: item.invoice_number || '—',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            creditNoteDate: new Date().toISOString(),
            orderDate: item.order_date,
            customerName,
            customerEmail: customer.email || '',
            customerPhone: customer.phone || '',
            billingAddress: item.billing_address || {},
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            sku: snapshot.sku || snapshot.productSku || '',
            quantity: item.quantity,
            originalPaidAmount: item.paid_amount,
            priorRefundAmount: item.refund_amount || 0,
            returnRefundAmount,
            refundId: refundResult.refund_id,
            reason: note || 'Return refund after quality check',
          })

          const pdfBuffer = await pdfService.generatePdf({ html: creditNoteHtml })
          const folder = `documents/orders/${item.order_number}`
          const uploadResult = await uploadFile(folder, pdfBuffer, `${creditNoteNumber}.pdf`)

          if (uploadResult.success && uploadResult.data) {
            await db.query(
              `UPDATE order_items SET credit_note_url = $1 WHERE id = $2`,
              [uploadResult.data.url, item.id]
            )
          }
        } catch (pdfErr) {
          console.error('Failed to generate credit note PDF:', pdfErr)
        }
      })()

      // 10. Send refund completed email
      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Refund Completed — ${item.suborder_number}`,
          html: refundCompletedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            refundAmount: returnRefundAmount,
            refundId: refundResult.refund_id,
          }),
        }).catch((err) => console.error('Failed to send return refund completed email:', err))
      }
    } catch (err) {
      console.error('Failed to handle QC accepted:', err)
      try {
        await this.updateStageAsync(item, 28, 25, 'Unexpected error during return refund processing')
      } catch (e) {
        console.error('Failed to update stage to Refund Failed:', e)
      }
    }
  },

  // ============================================
  // Internal: Handle QC rejected — send email to customer
  // ============================================
  async handleQcRejected(item: any, reason: string) {
    try {
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Quality Check Failed — ${item.suborder_number}`,
          html: qcRejectedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            reason,
          }),
        }).catch((err) => console.error('Failed to send QC rejected email:', err))
      }
    } catch (err) {
      console.error('Failed to handle QC rejected:', err)
    }
  },

  // ============================================
  // Internal: Handle refund initiation — process refund, update stage, send email
  // Called for: reject from hold (6→25), cancel approved (13→25), retry (28→25)
  // ============================================
  async handleRefundInitiated(item: any, adminId: string, reason: string) {
    try {
      // 1. Fetch customer info
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length === 0) return

      const customer = customerResult.rows[0]
      const snapshot = item.product_snapshot || {}

      // 2. Fetch the captured payment transaction
      const txnResult = await db.query(
        `SELECT id, gateway_transaction_id FROM payment_transactions
         WHERE order_id = $1 AND type = 'payment' AND status = 'captured'
         LIMIT 1`,
        [item.order_id]
      )
      if (txnResult.rows.length === 0) {
        console.error('No captured payment found for refund, order:', item.order_id)
        // Move to Refund Failed since we can't process
        await this.updateStageAsync(item, 28, 25, 'No captured payment found')
        return
      }

      const paymentTxn = txnResult.rows[0]
      const paymentId = paymentTxn.gateway_transaction_id

      // 3. Initiate refund via payment gateway
      const gateway = getPaymentGateway(item.payment_gateway || 'razorpay')
      const refundAmountInr = item.paid_amount / 100 // Convert paise to INR

      let refundResult
      try {
        refundResult = await gateway.initiateRefund({
          payment_id: paymentId,
          amount: refundAmountInr,
          reason,
        })
      } catch (refundErr) {
        console.error('Refund gateway call failed:', refundErr)
        // Move to Refund Failed (28)
        await this.updateStageAsync(item, 28, 25, 'Refund gateway call failed')
        return
      }

      // 4. Record refund transaction in payment_transactions
      await db.query(
        `INSERT INTO payment_transactions (
          order_id, order_item_id, gateway_name, gateway_transaction_id, gateway_order_id,
          type, amount, currency, status, refund_reason, parent_transaction_id, gateway_response
        ) VALUES ($1, $2, $3, $4, $5, 'refund', $6, 'INR', $7, $8, $9, $10)`,
        [
          item.order_id,
          item.id,
          gateway.name,
          refundResult.refund_id,
          item.payment_gateway_order_id || null,
          item.paid_amount,
          refundResult.status,
          reason,
          paymentTxn.id,
          JSON.stringify(refundResult.raw_response),
        ]
      )

      // 5. Update order_items — refund details + stage to 26 (Refund Completed)
      await db.query(
        `UPDATE order_items
         SET stage = 26, previous_stage = 25,
             refund_amount = $1, refund_reference_id = $2,
             refund_note = $3, refund_processed_at = NOW(), refund_processed_by = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [item.paid_amount, refundResult.refund_id, reason, adminId, item.id]
      )

      // 6. Log: Refund Initiated → Refund Completed
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 26, 25, $4, 'system', NULL)`,
        [item.order_id, item.id, item.customer_id, `Refund completed — ${refundResult.refund_id}`]
      )

      // 7. Send refund completed email to customer
      if (customer.email) {
        sendEmail({
          to: customer.email,
          subject: `Refund Completed — ${item.suborder_number}`,
          html: refundCompletedCustomerTemplate({
            firstName: customer.first_name || 'Customer',
            orderNumber: item.order_number,
            suborderNumber: item.suborder_number,
            productName: snapshot.productName || '',
            variantName: snapshot.variantName || '',
            refundAmount: item.paid_amount,
            refundId: refundResult.refund_id,
          }),
        }).catch((err) => console.error('Failed to send refund completed email:', err))
      }
    } catch (err) {
      console.error('Failed to handle refund initiation:', err)
      // Attempt to move to Refund Failed
      try {
        await this.updateStageAsync(item, 28, 25, 'Unexpected error during refund processing')
      } catch (e) {
        console.error('Failed to update stage to Refund Failed:', e)
      }
    }
  },

  // ============================================
  // Internal: Update stage async (for refund success/failure)
  // ============================================
  async updateStageAsync(item: any, newStage: number, previousStage: number, note: string) {
    await db.query(
      `UPDATE order_items SET stage = $1, previous_stage = $2, updated_at = NOW() WHERE id = $3`,
      [newStage, previousStage, item.id]
    )
    await db.query(
      `INSERT INTO order_item_logs (
        order_id, order_item_id, customer_id,
        stage, previous_stage, note, actor_type, actor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'system', NULL)`,
      [item.order_id, item.id, item.customer_id, newStage, previousStage, note]
    )
  },

  // ============================================
  // Internal: Handle manual refund — verify refund ID with Razorpay, store, update stage
  // ============================================
  async handleManualRefund(item: any, adminId: string, refundId: string) {
    try {
      // 1. Fetch refund details from Razorpay
      const gateway = getPaymentGateway(item.payment_gateway || 'razorpay')
      const refundData = await gateway.fetchRefund(refundId)

      // 2. Validate refund status
      if (refundData.status === 'failed') {
        await this.updateStageAsync(item, 28, 28, `Manual refund verification failed — refund status: ${refundData.status}`)
        return
      }

      // 3. Fetch parent payment transaction
      const txnResult = await db.query(
        `SELECT id FROM payment_transactions
         WHERE order_id = $1 AND type = 'payment' AND status = 'captured'
         LIMIT 1`,
        [item.order_id]
      )
      const parentTxnId = txnResult.rows[0]?.id || null

      // 4. Record refund transaction in payment_transactions
      await db.query(
        `INSERT INTO payment_transactions (
          order_id, order_item_id, gateway_name, gateway_transaction_id, gateway_order_id,
          type, amount, currency, status, refund_reason, parent_transaction_id, gateway_response, metadata
        ) VALUES ($1, $2, $3, $4, $5, 'refund', $6, $7, $8, $9, $10, $11, $12)`,
        [
          item.order_id,
          item.id,
          gateway.name,
          refundData.refund_id,
          item.payment_gateway_order_id || null,
          Math.round(refundData.amount * 100), // Convert INR back to paise for storage
          refundData.currency,
          refundData.status,
          'Manual refund',
          parentTxnId,
          JSON.stringify(refundData.raw_response),
          JSON.stringify({ type: 'manual_refund', verified_by: adminId }),
        ]
      )

      // 5. Update order_items — refund details + stage to 29 (Manual Refund Done)
      await db.query(
        `UPDATE order_items
         SET stage = 29, previous_stage = 28,
             refund_amount = $1, refund_reference_id = $2,
             refund_note = 'Manual refund', refund_processed_at = NOW(), refund_processed_by = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [Math.round(refundData.amount * 100), refundData.refund_id, adminId, item.id]
      )

      // 6. Log: Refund Failed → Manual Refund Done
      await db.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 29, 28, $4, 'admin', $5)`,
        [item.order_id, item.id, item.customer_id, `Manual refund verified — ${refundData.refund_id}`, adminId]
      )

      // 7. Send refund completed email to customer
      const customerResult = await db.query(
        `SELECT first_name, last_name, email FROM customers WHERE id = $1`,
        [item.customer_id]
      )
      if (customerResult.rows.length > 0) {
        const customer = customerResult.rows[0]
        const snapshot = item.product_snapshot || {}

        if (customer.email) {
          sendEmail({
            to: customer.email,
            subject: `Refund Completed — ${item.suborder_number}`,
            html: refundCompletedCustomerTemplate({
              firstName: customer.first_name || 'Customer',
              orderNumber: item.order_number,
              suborderNumber: item.suborder_number,
              productName: snapshot.productName || '',
              variantName: snapshot.variantName || '',
              refundAmount: Math.round(refundData.amount * 100),
              refundId: refundData.refund_id,
            }),
          }).catch((err) => console.error('Failed to send refund completed email:', err))
        }
      }
    } catch (err) {
      console.error('Failed to handle manual refund:', err)
      try {
        await this.updateStageAsync(item, 28, 28, 'Manual refund verification failed')
      } catch (e) {
        console.error('Failed to update stage after manual refund error:', e)
      }
    }
  },

  // ============================================
  // Internal: Resolve diamond/gemstone shape names
  // ============================================
  async resolveStoneDetails(stones: any[], type: 'diamond' | 'gemstone') {
    if (stones.length === 0) return []

    const results = []
    for (const stone of stones) {
      let name = type === 'diamond' ? 'Diamond' : 'Gemstone'
      let shape = '—'

      if (stone.shapeId) {
        const shapeResult = await db.query(
          `SELECT name FROM stone_shapes WHERE id = $1`, [stone.shapeId]
        )
        if (shapeResult.rows.length > 0) shape = shapeResult.rows[0].name
      }

      if (type === 'gemstone' && stone.typeId) {
        const typeResult = await db.query(
          `SELECT name FROM stone_types WHERE id = $1`, [stone.typeId]
        )
        if (typeResult.rows.length > 0) name = typeResult.rows[0].name
      }

      results.push({
        name,
        shape,
        totalCarat: stone.totalCarat || 0,
        noOfStones: stone.noOfStones || 0,
      })
    }
    return results
  },

  // ============================================
  // Internal: Resolve pearl type/quality names
  // ============================================
  async resolvePearlDetails(pearls: any[]) {
    if (pearls.length === 0) return []

    const results = []
    for (const pearl of pearls) {
      let name = 'Pearl'
      let quality = '—'

      if (pearl.typeId) {
        const typeResult = await db.query(
          `SELECT name FROM stone_types WHERE id = $1`, [pearl.typeId]
        )
        if (typeResult.rows.length > 0) name = typeResult.rows[0].name
      }

      if (pearl.qualityId) {
        const qualityResult = await db.query(
          `SELECT name FROM stone_qualities WHERE id = $1`, [pearl.qualityId]
        )
        if (qualityResult.rows.length > 0) quality = qualityResult.rows[0].name
      }

      results.push({
        name,
        quality,
        totalGrams: pearl.totalGrams || 0,
        noOfPearls: pearl.noOfPearls || 0,
      })
    }
    return results
  },

  // ============================================
  // Internal: Extract first product image URL from snapshot
  // ============================================
  extractProductImage(snapshot: any): string | null {
    const media = snapshot?.media
    if (!media?.colorMedia || media.colorMedia.length === 0) return null

    const metalColorId = snapshot?.options?.metalColor

    // Try matching variant's metal color first
    if (metalColorId) {
      const colorMatch = media.colorMedia.find((cm: any) => cm.metalColorId === metalColorId)
      if (colorMatch?.items?.length > 0) {
        const img = colorMatch.items.find((i: any) => i.type?.startsWith('image'))
        if (img?.path) return getPublicUrl(img.path)
      }
    }

    // Fallback: first image from any color
    for (const cm of media.colorMedia) {
      if (cm.items?.length > 0) {
        const img = cm.items.find((i: any) => i.type?.startsWith('image'))
        if (img?.path) return getPublicUrl(img.path)
      }
    }

    return null
  },
}
