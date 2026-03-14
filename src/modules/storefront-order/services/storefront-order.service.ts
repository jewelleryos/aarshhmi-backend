import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { storefrontOrderMessages } from '../config/storefront-order.messages'
import { storefrontCartService } from '../../storefront-cart/services/storefront-cart.service'
import { getPaymentGateway } from '../../../shared/payment-gateway'
import { sendEmail, orderReceivedCustomerTemplate, orderReceivedAdminTemplate, cancelRequestCustomerTemplate, cancelRequestAdminTemplate, returnRequestCustomerTemplate, returnRequestAdminTemplate } from '../../../shared/email-service'
import { pdfService } from '../../../shared/pdf-service/pdf.service'
import { paymentReceiptTemplate } from '../../../shared/pdf-service/templates/payment-receipt.template'
import { uploadFile, getPublicUrl } from '../../../shared/bunny-service'
import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'
import type {
  CheckoutInput,
  VerifyPaymentInput,
  CheckoutResponse,
} from '../types/storefront-order.types'

const CANCELLATION_WINDOW_DAYS = Number(process.env.ORDER_CANCELLATION_WINDOW_DAYS) || 3

export const storefrontOrderService = {
  // ============================================
  // POST /orders — Checkout
  // ============================================
  async checkout(
    customer: AuthCustomer,
    input: CheckoutInput
  ): Promise<CheckoutResponse> {
    // 1. Get cart with latest prices
    const cart = await storefrontCartService.getCart(customer)

    if (!cart.cartId || cart.items.length === 0) {
      throw new AppError(storefrontOrderMessages.CART_EMPTY, HTTP_STATUS.BAD_REQUEST)
    }

    // 2. Validate: no unavailable items
    const unavailableItems = cart.items.filter((item) => !item.isAvailable)
    if (unavailableItems.length > 0) {
      throw new AppError(
        storefrontOrderMessages.CART_HAS_UNAVAILABLE_ITEMS,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 3. Validate: no price changes
    const priceChangedItems = cart.items.filter((item) => item.priceChanged)
    if (priceChangedItems.length > 0) {
      throw new AppError(
        storefrontOrderMessages.CART_PRICE_CHANGED,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 4. Address data — sent directly from frontend (no DB lookup)
    const shippingAddress = input.shipping_address
    const billingAddress = input.same_as_shipping
      ? { ...shippingAddress }
      : input.billing_address

    // 5. Generate order number from sequence
    const seqResult = await db.query(`SELECT nextval('order_number_seq') AS seq`)
    const orderNumber = `ORD-${String(seqResult.rows[0].seq).padStart(6, '0')}`

    // 6. Begin transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // 7. Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          customer_id, order_number,
          subtotal, tax_amount, coupon_discount, total_amount,
          coupon_id, coupon_code, coupon_type,
          total_quantity, stage,
          shipping_address, billing_address,
          payment_gateway, payment_status,
          cancellation_window_ends_at
        ) VALUES (
          $1, $2,
          $3, $4, $5, $6,
          $7, $8, $9,
          $10, 1,
          $11, $12,
          'razorpay', 'pending',
          NULL
        ) RETURNING id`,
        [
          customer.id,
          orderNumber,
          cart.summary.subtotalPrice,
          cart.summary.totalTaxAmount,
          cart.summary.discountAmount,
          cart.summary.totalPrice,
          null,
          cart.couponSummary?.code || null,
          cart.couponSummary?.type || null,
          cart.summary.availableItemCount,
          JSON.stringify(shippingAddress),
          JSON.stringify(billingAddress),
        ]
      )
      const orderId = orderResult.rows[0].id

      // 8. Create order items (suborders)
      for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i]
        const suborderNumber = `${orderNumber}-${i + 1}`

        // Fetch full variant + product metadata for snapshot
        const snapshotDataResult = await client.query(
          `SELECT pv.metadata AS variant_metadata, p.metadata AS product_metadata
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE pv.id = $1`,
          [item.variantId]
        )
        const variantMeta = snapshotDataResult.rows[0]?.variant_metadata || {}
        const productMeta = snapshotDataResult.rows[0]?.product_metadata || {}

        // Build product snapshot — all variant & product data frozen at order time
        const productSnapshot = {
          productName: item.productName,
          productSlug: item.productSlug,
          productSku: item.productSku,
          variantName: item.variantName,
          sku: item.sku,
          options: item.options,
          optionConfig: item.optionConfig,
          pricing: item.pricing,
          media: item.media,
          badges: item.badges,
          sizeChart: item.sizeChart,
          sizeChartValueId: item.sizeChartValueId,
          sizeChartValueName: item.sizeChartValueName,
          engravingText: item.engravingText || null,
          variantMetadata: variantMeta,
          productMetadata: productMeta,
        }

        const selling = item.pricing.sellingPrice

        const orderItemResult = await client.query(
          `INSERT INTO order_items (
            suborder_number, order_id, customer_id,
            product_id, variant_id, product_snapshot,
            metal_price, making_charge, diamond_price, gemstone_price, pearl_price,
            price_without_tax, tax_amount, unit_price,
            coupon_discount, line_total, paid_amount,
            quantity, stage
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17,
            $18, 1
          ) RETURNING id`,
          [
            suborderNumber,
            orderId,
            customer.id,
            item.productId,
            item.variantId,
            JSON.stringify(productSnapshot),
            selling.metalPrice,
            selling.makingCharge,
            selling.diamondPrice,
            selling.gemstonePrice,
            selling.pearlPrice,
            selling.finalPriceWithoutTax,
            selling.taxAmount,
            selling.finalPrice,
            item.couponDiscount,
            item.lineTotal,
            item.lineTotal - item.couponDiscount,
            item.quantity,
          ]
        )

        // 9. Create initial log entry (stage 1 - Payment Pending)
        await client.query(
          `INSERT INTO order_item_logs (
            order_id, order_item_id, customer_id,
            stage, previous_stage,
            note, actor_type, actor_id
          ) VALUES ($1, $2, $3, 1, NULL, 'Order initiated — awaiting payment', 'system', NULL)`,
          [orderId, orderItemResult.rows[0].id, customer.id]
        )
      }

      // 10. Create Razorpay order
      const gateway = getPaymentGateway('razorpay')
      const amountInr = cart.summary.totalPrice / CURRENCY_CONFIG.subunits

      const gatewayOrder = await gateway.createOrder({
        amount: amountInr,
        currency: CURRENCY_CONFIG.code,
        receipt: orderNumber,
        notes: {
          order_id: orderId,
          customer_id: customer.id,
        },
      })

      // 11. Update order with gateway order ID
      await client.query(
        `UPDATE orders SET payment_gateway_order_id = $1 WHERE id = $2`,
        [gatewayOrder.gateway_order_id, orderId]
      )

      // 12. Create payment transaction record (pending)
      await client.query(
        `INSERT INTO payment_transactions (
          order_id, gateway_name, gateway_order_id,
          type, amount, currency, status,
          gateway_response
        ) VALUES ($1, 'razorpay', $2, 'payment', $3, $4, 'pending', $5)`,
        [
          orderId,
          gatewayOrder.gateway_order_id,
          cart.summary.totalPrice,
          CURRENCY_CONFIG.code,
          JSON.stringify(gatewayOrder.raw_response),
        ]
      )

      await client.query('COMMIT')

      // 13. Return checkout response for frontend
      const customerName = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' ')

      return {
        order_id: orderId,
        order_number: orderNumber,
        razorpay_order_id: gatewayOrder.gateway_order_id,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
        amount: cart.summary.totalPrice,
        currency: CURRENCY_CONFIG.code,
        customer: {
          name: customerName,
          email: customer.email,
          phone: customer.phone,
        },
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // ============================================
  // POST /orders/:id/verify-payment
  // ============================================
  async verifyPayment(
    customer: AuthCustomer,
    orderId: string,
    input: VerifyPaymentInput
  ) {
    // 1. Find order
    const orderResult = await db.query(
      `SELECT id, order_number, payment_status, payment_gateway_order_id, stage,
              subtotal, tax_amount, coupon_discount, coupon_code, total_amount,
              shipping_address, payment_gateway, created_at
       FROM orders WHERE id = $1 AND customer_id = $2`,
      [orderId, customer.id]
    )
    if (orderResult.rows.length === 0) {
      throw new AppError(storefrontOrderMessages.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const order = orderResult.rows[0]

    if (order.payment_status === 'captured') {
      throw new AppError(
        storefrontOrderMessages.PAYMENT_ALREADY_PROCESSED,
        HTTP_STATUS.BAD_REQUEST
      )
    }
    if (order.stage !== 1) {
      throw new AppError(
        storefrontOrderMessages.ORDER_NOT_PENDING_PAYMENT,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // 2. Verify with Razorpay
    const gateway = getPaymentGateway('razorpay')
    const verification = await gateway.verifyPayment({
      gateway_order_id: input.razorpay_order_id,
      gateway_payment_id: input.razorpay_payment_id,
      gateway_signature: input.razorpay_signature,
    })

    // 3. Begin transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // 4. Update payment transaction
      await client.query(
        `UPDATE payment_transactions
         SET status = $1,
             gateway_transaction_id = $2,
             gateway_response = $3
         WHERE order_id = $4 AND gateway_order_id = $5 AND type = 'payment'`,
        [
          verification.status,
          verification.payment_id,
          JSON.stringify(verification.raw_response),
          orderId,
          input.razorpay_order_id,
        ]
      )

      if (verification.verified && verification.status === 'captured') {
        // 5. Update order — payment captured, stage 4 (On Hold)
        await client.query(
          `UPDATE orders
           SET payment_status = 'captured',
               stage = 4,
               cancellation_window_ends_at = NOW() + INTERVAL '${CANCELLATION_WINDOW_DAYS} days'
           WHERE id = $1`,
          [orderId]
        )

        // 6. Update all order items — stage 4 (On Hold), make cancellable
        const itemsResult = await client.query(
          `UPDATE order_items
           SET stage = 4, previous_stage = 3, is_cancellable = true
           WHERE order_id = $1
           RETURNING id`,
          [orderId]
        )

        // 7. Create log entries for each item — two entries: Order Placed + On Hold
        for (const item of itemsResult.rows) {
          // Log: Payment Pending → Order Placed
          await client.query(
            `INSERT INTO order_item_logs (
              order_id, order_item_id, customer_id,
              stage, previous_stage,
              note, actor_type, actor_id
            ) VALUES ($1, $2, $3, 3, 1, 'Payment captured — order placed', 'system', NULL)`,
            [orderId, item.id, customer.id]
          )
          // Log: Order Placed → On Hold
          await client.query(
            `INSERT INTO order_item_logs (
              order_id, order_item_id, customer_id,
              stage, previous_stage,
              note, actor_type, actor_id
            ) VALUES ($1, $2, $3, 4, 3, 'Order moved to hold for review', 'system', NULL)`,
            [orderId, item.id, customer.id]
          )
        }

        // 8. Clear the customer's cart
        const cartResult = await client.query(
          `SELECT id FROM carts WHERE customer_id = $1`,
          [customer.id]
        )
        if (cartResult.rows.length > 0) {
          const cartId = cartResult.rows[0].id
          await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId])
          await client.query(
            `UPDATE carts SET applied_coupon_id = NULL WHERE id = $1`,
            [cartId]
          )
        }
      } else {
        // Payment failed
        await client.query(
          `UPDATE orders SET payment_status = 'failed' WHERE id = $1`,
          [orderId]
        )
      }

      // 9. Fetch order items for email & receipt (before commit, inside transaction)
      let emailItems: any[] = []
      if (verification.verified && verification.status === 'captured') {
        const emailItemsResult = await client.query(
          `SELECT product_snapshot, quantity, unit_price, paid_amount
           FROM order_items WHERE order_id = $1`,
          [orderId]
        )
        emailItems = emailItemsResult.rows
      }

      await client.query('COMMIT')

      // 10. Generate receipt, upload to CDN, then send emails (fire-and-forget, after COMMIT)
      if (verification.verified && verification.status === 'captured') {
        ;(async () => {
          try {
            const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
            const shippingAddress = order.shipping_address
            const paymentId = verification.payment_id || ''

            const emailItemList = emailItems.map((item: any) => ({
              productName: item.product_snapshot.productName,
              variantName: item.product_snapshot.variantName || '',
              sku: item.product_snapshot.sku || '',
              quantity: item.quantity,
              paidAmount: item.paid_amount,
            }))

            // --- Generate payment receipt PDF ---
            let receiptPdfBuffer: Buffer | null = null
            try {
              // Receipt number: PR{YY}-{order_number} e.g. PR25-ORD-000042
              const year = new Date().getFullYear().toString().slice(-2)
              const receiptNumber = `PR${year}-${order.order_number}`

              // Build receipt items (need unit_price for receipt)
              const receiptItems = emailItems.map((item: any) => ({
                productName: item.product_snapshot.productName,
                variantName: item.product_snapshot.variantName || '',
                sku: item.product_snapshot.sku || '',
                quantity: item.quantity,
                unitPrice: item.unit_price,
                paidAmount: item.paid_amount,
              }))

              // Generate HTML from template
              const receiptHtml = paymentReceiptTemplate({
                receiptNumber,
                orderNumber: order.order_number,
                orderDate: order.created_at,
                customerName,
                customerEmail: customer.email || '',
                customerPhone: customer.phone || '',
                items: receiptItems,
                subtotal: order.subtotal,
                taxAmount: order.tax_amount,
                couponDiscount: order.coupon_discount,
                couponCode: order.coupon_code,
                totalAmount: order.total_amount,
                paymentGateway: order.payment_gateway || 'razorpay',
                transactionId: paymentId,
                shippingAddress,
              })

              // Generate PDF
              receiptPdfBuffer = await pdfService.generatePdf({ html: receiptHtml })

              // Upload to CDN
              const cdnFolder = `documents/orders/${order.order_number}`
              const uploadResult = await uploadFile(cdnFolder, receiptPdfBuffer, 'payment-receipt.pdf')

              if (uploadResult.success && uploadResult.data) {
                const receiptUrl = getPublicUrl(uploadResult.data.path)
                await db.query(
                  `UPDATE orders SET receipt_number = $1, receipt_url = $2 WHERE id = $3`,
                  [receiptNumber, receiptUrl, orderId]
                )
              }
            } catch (receiptErr) {
              console.error('Failed to generate payment receipt:', receiptErr)
            }

            // --- Send emails with receipt attached ---
            const attachments = receiptPdfBuffer
              ? [{ filename: `receipt-${order.order_number}.pdf`, content: receiptPdfBuffer }]
              : []

            // Customer email
            if (customer.email) {
              sendEmail({
                to: customer.email,
                subject: `Order Received — ${order.order_number}`,
                html: orderReceivedCustomerTemplate({
                  firstName: customer.first_name || 'Customer',
                  orderNumber: order.order_number,
                  paymentId,
                  items: emailItemList,
                  totalAmount: order.total_amount,
                  shippingAddress,
                }),
                attachments,
              }).catch((err) => console.error('Failed to send customer order email:', err))
            }

            // Admin email(s) — supports comma-separated list
            const adminEmails = process.env.ADMIN_ORDER_NOTIFICATION_EMAILS
            if (adminEmails) {
              const adminEmailList = adminEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
              if (adminEmailList.length > 0) {
                sendEmail({
                  to: adminEmailList,
                  subject: `New Order Received — ${order.order_number}`,
                  html: orderReceivedAdminTemplate({
                    orderNumber: order.order_number,
                    paymentId,
                    customerName,
                    customerEmail: customer.email || '',
                    customerPhone: customer.phone || '',
                    items: emailItemList,
                    totalAmount: order.total_amount,
                    shippingAddress,
                  }),
                  attachments,
                }).catch((err) => console.error('Failed to send admin order email:', err))
              }
            }
          } catch (err) {
            console.error('Failed to process post-payment tasks:', err)
          }
        })()
      }

      return {
        order_id: orderId,
        order_number: order.order_number,
        payment_status: verification.verified && verification.status === 'captured'
          ? 'captured'
          : 'failed',
        verified: verification.verified,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // ============================================
  // POST /orders/items/:itemId/cancel-request — Customer cancel request
  // ============================================
  async requestCancellation(customerId: string, itemId: string, reason: string) {
    // 1. Fetch sub-order with order info
    const result = await db.query(
      `SELECT
        oi.id, oi.order_id, oi.suborder_number, oi.stage,
        oi.is_cancellable, oi.is_cancel_requested,
        oi.product_snapshot, oi.paid_amount,
        o.order_number, o.cancellation_window_ends_at, o.customer_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.customer_id = $2`,
      [itemId, customerId]
    )

    if (result.rows.length === 0) {
      throw new AppError(storefrontOrderMessages.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const item = result.rows[0]

    // 2. Validate: must be in Order Confirmed (5) or In Process (7) and cancellable
    if (![5, 7].includes(item.stage) || !item.is_cancellable) {
      throw new AppError(storefrontOrderMessages.CANCEL_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST)
    }

    // 3. Validate: within cancellation window
    if (item.cancellation_window_ends_at && new Date() > new Date(item.cancellation_window_ends_at)) {
      throw new AppError(storefrontOrderMessages.CANCELLATION_WINDOW_EXPIRED, HTTP_STATUS.BAD_REQUEST)
    }

    // 4. Update stage to Cancel Requested (12)
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE order_items
         SET stage = 12, previous_stage = $1, is_cancel_requested = true, cancel_reason = $2, updated_at = NOW()
         WHERE id = $3`,
        [item.stage, reason, itemId]
      )

      await client.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 12, $4, $5, 'customer', $3)`,
        [item.order_id, itemId, customerId, item.stage, reason]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    // 5. Send emails (fire-and-forget, after COMMIT)
    ;(async () => {
      try {
        const customerResult = await db.query(
          `SELECT first_name, last_name, email, phone FROM customers WHERE id = $1`,
          [customerId]
        )
        if (customerResult.rows.length === 0) return

        const customer = customerResult.rows[0]
        const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        const snapshot = item.product_snapshot || {}

        // Send email to customer
        if (customer.email) {
          sendEmail({
            to: customer.email,
            subject: `Cancellation Request Received — ${item.suborder_number}`,
            html: cancelRequestCustomerTemplate({
              firstName: customer.first_name || 'Customer',
              orderNumber: item.order_number,
              suborderNumber: item.suborder_number,
              productName: snapshot.productName || '',
              variantName: snapshot.variantName || '',
              paidAmount: item.paid_amount,
              reason,
            }),
          }).catch((err) => console.error('Failed to send cancel request customer email:', err))
        }

        // Send email to admin(s)
        const adminEmails = process.env.ADMIN_ORDER_NOTIFICATION_EMAILS
        if (adminEmails) {
          const adminEmailList = adminEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
          if (adminEmailList.length > 0) {
            sendEmail({
              to: adminEmailList,
              subject: `Cancellation Request — ${item.suborder_number}`,
              html: cancelRequestAdminTemplate({
                orderNumber: item.order_number,
                suborderNumber: item.suborder_number,
                productName: snapshot.productName || '',
                variantName: snapshot.variantName || '',
                paidAmount: item.paid_amount,
                customerName,
                customerEmail: customer.email || '',
                customerPhone: customer.phone || '',
                reason,
              }),
            }).catch((err) => console.error('Failed to send cancel request admin email:', err))
          }
        }
      } catch (err) {
        console.error('Failed to send cancel request emails:', err)
      }
    })()
  },

  // ============================================
  // POST /orders/items/:itemId/return-request — Customer return request
  // ============================================
  async requestReturn(customerId: string, itemId: string, reason: string, files: File[] = []) {
    // 1. Fetch sub-order with order info
    const result = await db.query(
      `SELECT
        oi.id, oi.order_id, oi.suborder_number, oi.stage,
        oi.is_returnable, oi.is_return_requested,
        oi.return_window_ends_at,
        oi.product_snapshot, oi.paid_amount,
        o.order_number, o.customer_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.customer_id = $2`,
      [itemId, customerId]
    )

    if (result.rows.length === 0) {
      throw new AppError(storefrontOrderMessages.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const item = result.rows[0]

    // 2. Validate: must be Delivered (11), returnable, and not already requested
    if (item.stage !== 11 || !item.is_returnable || item.is_return_requested) {
      throw new AppError(storefrontOrderMessages.RETURN_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST)
    }

    // 3. Validate: within return window
    if (item.return_window_ends_at && new Date() > new Date(item.return_window_ends_at)) {
      throw new AppError(storefrontOrderMessages.RETURN_WINDOW_EXPIRED, HTTP_STATUS.BAD_REQUEST)
    }

    // 4. Upload return media to CDN (before transaction so we have URLs)
    const returnMedia: { url: string; type: 'image' | 'video'; filename: string }[] = []
    if (files.length > 0) {
      const folder = `documents/orders/${item.order_number}/returns`
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileType = file.type.startsWith('video/') ? 'video' as const : 'image' as const
        const uploadResult = await uploadFile(folder, buffer, file.name)
        if (!uploadResult.success || !uploadResult.data) {
          throw new AppError(storefrontOrderMessages.RETURN_FILE_UPLOAD_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }
        returnMedia.push({ url: uploadResult.data.url, type: fileType, filename: file.name })
      }
    }

    // 5. Update stage to Return Requested (16)
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Build metadata update for return media
      const metadataUpdate = returnMedia.length > 0
        ? `, metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb`
        : ''
      const params: (string | number)[] = [reason, itemId]
      if (returnMedia.length > 0) {
        params.push(JSON.stringify({ returnMedia }))
      }

      await client.query(
        `UPDATE order_items
         SET stage = 16, previous_stage = 11, is_return_requested = true, return_reason = $1${metadataUpdate}, updated_at = NOW()
         WHERE id = $2`,
        params
      )

      await client.query(
        `INSERT INTO order_item_logs (
          order_id, order_item_id, customer_id,
          stage, previous_stage, note, actor_type, actor_id
        ) VALUES ($1, $2, $3, 16, 11, $4, 'customer', $3)`,
        [item.order_id, itemId, customerId, reason]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    // 5. Send emails (fire-and-forget, after COMMIT)
    ;(async () => {
      try {
        const customerResult = await db.query(
          `SELECT first_name, last_name, email, phone FROM customers WHERE id = $1`,
          [customerId]
        )
        if (customerResult.rows.length === 0) return

        const customer = customerResult.rows[0]
        const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        const snapshot = item.product_snapshot || {}

        // Send email to customer
        if (customer.email) {
          sendEmail({
            to: customer.email,
            subject: `Return Request Received — ${item.suborder_number}`,
            html: returnRequestCustomerTemplate({
              firstName: customer.first_name || 'Customer',
              orderNumber: item.order_number,
              suborderNumber: item.suborder_number,
              productName: snapshot.productName || '',
              variantName: snapshot.variantName || '',
              paidAmount: item.paid_amount,
              reason,
            }),
          }).catch((err) => console.error('Failed to send return request customer email:', err))
        }

        // Send email to admin(s)
        const adminEmails = process.env.ADMIN_ORDER_NOTIFICATION_EMAILS
        if (adminEmails) {
          const adminEmailList = adminEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
          if (adminEmailList.length > 0) {
            sendEmail({
              to: adminEmailList,
              subject: `Return Request — ${item.suborder_number}`,
              html: returnRequestAdminTemplate({
                orderNumber: item.order_number,
                suborderNumber: item.suborder_number,
                productName: snapshot.productName || '',
                variantName: snapshot.variantName || '',
                paidAmount: item.paid_amount,
                customerName,
                customerEmail: customer.email || '',
                customerPhone: customer.phone || '',
                reason,
              }),
            }).catch((err) => console.error('Failed to send return request admin email:', err))
          }
        }
      } catch (err) {
        console.error('Failed to send return request emails:', err)
      }
    })()
  },

  // ============================================
  // Stage name mapping for customer-facing display
  // ============================================
  getCustomerStageName(stage: number): string {
    const CUSTOMER_STAGE_NAMES: Record<number, string> = {
      1: 'Payment Pending',
      2: 'Payment Failed',
      3: 'Order Placed',
      4: 'On Hold',
      5: 'Order Confirmed',
      6: 'Order Rejected',
      7: 'In Process',
      10: 'Shipped',
      11: 'Delivered',
      12: 'Cancel Requested',
      13: 'Cancelled',
      14: 'Cancel Rejected',
      15: 'Cancelled',
      16: 'Return Requested',
      17: 'Return Accepted',
      18: 'Return Rejected',
      25: 'Refund In Progress',
      26: 'Refund Completed',
      27: 'Partially Refunded',
      28: 'Refund In Progress',
      29: 'Refund Completed',
    }
    return CUSTOMER_STAGE_NAMES[stage] || 'Processing'
  },

  // Stages that should be hidden from customer stage history
  HIDDEN_CUSTOMER_STAGES: [28, 29] as number[],

  // ============================================
  // GET /orders — List customer orders
  // ============================================
  async getOrders(customerId: string) {
    const ordersResult = await db.query(
      `SELECT
        o.id, o.order_number, o.total_amount, o.total_quantity,
        o.stage, o.payment_status, o.cancellation_window_ends_at,
        o.created_at
       FROM orders o
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [customerId]
    )

    // Fetch items for all orders in one query
    const orderIds = ordersResult.rows.map((o: any) => o.id)
    if (orderIds.length === 0) return []

    const itemsResult = await db.query(
      `SELECT
        oi.id, oi.order_id, oi.suborder_number, oi.product_snapshot,
        oi.quantity, oi.paid_amount, oi.stage, oi.is_cancellable,
        oi.is_cancel_requested, oi.is_returnable, oi.is_return_requested,
        oi.return_window_ends_at
       FROM order_items oi
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.created_at ASC`,
      [orderIds]
    )

    // Build order cancellation window lookup
    const orderWindowMap: Record<string, string | null> = {}
    for (const o of ordersResult.rows) {
      orderWindowMap[o.id] = o.cancellation_window_ends_at || null
    }

    // Group items by order_id with can_cancel computed
    const now = new Date()
    const itemsByOrder: Record<string, any[]> = {}
    for (const item of itemsResult.rows) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = []
      }
      const windowEnd = orderWindowMap[item.order_id]
      const windowOpen = !windowEnd || now <= new Date(windowEnd)

      const returnWindowEnd = item.return_window_ends_at
      const returnWindowOpen = !!returnWindowEnd && now <= new Date(returnWindowEnd)

      itemsByOrder[item.order_id].push({
        id: item.id,
        suborder_number: item.suborder_number,
        product_snapshot: item.product_snapshot,
        quantity: item.quantity,
        paid_amount: item.paid_amount,
        stage: item.stage,
        stage_name: this.getCustomerStageName(item.stage),
        can_cancel: item.is_cancellable && [5, 7].includes(item.stage) && windowOpen,
        is_cancel_requested: item.is_cancel_requested || false,
        can_return: item.is_returnable && item.stage === 11 && !item.is_return_requested && returnWindowOpen,
        is_return_requested: item.is_return_requested || false,
        return_window_ends_at: item.return_window_ends_at || null,
      })
    }

    return ordersResult.rows.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      total_quantity: order.total_quantity,
      stage: order.stage,
      payment_status: order.payment_status,
      created_at: order.created_at,
      items: itemsByOrder[order.id] || [],
    }))
  },

  // ============================================
  // GET /orders/:id — Order detail
  // ============================================
  async getOrder(customerId: string, orderId: string) {
    const orderResult = await db.query(
      `SELECT
        o.id, o.order_number,
        o.subtotal, o.tax_amount, o.coupon_discount, o.total_amount,
        o.coupon_code, o.total_quantity, o.stage,
        o.shipping_address, o.billing_address,
        o.payment_gateway, o.payment_status,
        o.cancellation_window_ends_at,
        o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1 AND o.customer_id = $2`,
      [orderId, customerId]
    )
    if (orderResult.rows.length === 0) {
      throw new AppError(storefrontOrderMessages.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const order = orderResult.rows[0]

    const itemsResult = await db.query(
      `SELECT
        oi.id, oi.suborder_number,
        oi.product_id, oi.variant_id, oi.product_snapshot,
        oi.metal_price, oi.making_charge, oi.diamond_price,
        oi.gemstone_price, oi.pearl_price,
        oi.price_without_tax, oi.tax_amount, oi.unit_price,
        oi.coupon_discount, oi.line_total, oi.paid_amount,
        oi.quantity, oi.stage,
        oi.is_cancellable, oi.is_cancel_requested, oi.is_returnable, oi.is_return_requested,
        oi.tracking_id, oi.courier_name,
        oi.delivered_at, oi.return_window_ends_at,
        oi.created_at, oi.updated_at
       FROM order_items oi
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    )

    // Fetch stage history for all items
    const logsResult = await db.query(
      `SELECT
        ol.order_item_id, ol.stage, ol.created_at
       FROM order_item_logs ol
       WHERE ol.order_id = $1
       ORDER BY ol.created_at ASC`,
      [orderId]
    )

    // Group logs by item, filter out internal stages
    const logsByItem: Record<string, any[]> = {}
    for (const log of logsResult.rows) {
      if (this.HIDDEN_CUSTOMER_STAGES.includes(log.stage)) continue
      if (!logsByItem[log.order_item_id]) {
        logsByItem[log.order_item_id] = []
      }
      logsByItem[log.order_item_id].push({
        stage: log.stage,
        stage_name: this.getCustomerStageName(log.stage),
        created_at: log.created_at,
      })
    }

    // Compute can_cancel per item
    const now = new Date()
    const windowOpen = !order.cancellation_window_ends_at || now <= new Date(order.cancellation_window_ends_at)

    const items = itemsResult.rows.map((item: any) => ({
      ...item,
      stage_name: this.getCustomerStageName(item.stage),
      can_cancel: item.is_cancellable && [5, 7].includes(item.stage) && windowOpen,
      can_return: item.is_returnable && item.stage === 11 && !item.is_return_requested
        && !!item.return_window_ends_at && now <= new Date(item.return_window_ends_at),
      return_window_ends_at: item.return_window_ends_at || null,
      stage_history: logsByItem[item.id] || [],
    }))

    return {
      ...order,
      items,
    }
  },
}
