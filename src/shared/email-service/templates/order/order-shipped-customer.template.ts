import { CURRENCY_CONFIG } from '../../../../config/currency'

interface OrderShippedCustomerParams {
  firstName: string
  orderNumber: string
  suborderNumber: string
  productName: string
  variantName: string
  paidAmount: number
  trackingId: string | null
  courierName: string | null
  // Refund info (only when weight was less)
  hasRefund: boolean
  refundAmount: number
  refundId: string | null
}

const formatPrice = (paise: number): string => {
  const amount = paise / CURRENCY_CONFIG.subunits
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const orderShippedCustomerTemplate = (params: OrderShippedCustomerParams): string => {
  const {
    firstName, orderNumber, suborderNumber,
    productName, variantName, paidAmount,
    trackingId, courierName,
    hasRefund, refundAmount, refundId,
  } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eaeaea;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Luminique</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #3b82f6;">Your Order Has Been Shipped!</h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${firstName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Great news! Your order has been shipped and is on its way to you.
              </p>

              <!-- Order Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a;">Order Number</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${orderNumber}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6a6a6a;">Sub-order: ${suborderNumber}</p>
                  </td>
                </tr>
              </table>

              <!-- Product Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                      ${productName}${variantName ? ` — ${variantName}` : ''}
                    </p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #6a6a6a;">
                      Amount: ${formatPrice(paidAmount)}
                    </p>
                  </td>
                </tr>
              </table>

              ${trackingId || courierName ? `
              <!-- Tracking Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #eaeaea; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Tracking Details</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${courierName ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6a6a6a;">Courier</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a; text-align: right;">${courierName}</td>
                      </tr>` : ''}
                      ${trackingId ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6a6a6a;">Tracking ID</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${trackingId}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              ${hasRefund && refundAmount > 0 ? `
              <!-- Refund Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #eaeaea; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Refund Details</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6a6a6a;">
                      Due to a slight difference in metal weight, a partial refund has been processed.
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6a6a6a;">Refund Amount</td>
                        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #22c55e; text-align: right;">${formatPrice(refundAmount)}</td>
                      </tr>
                      ${refundId ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #6a6a6a;">Refund ID</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a; text-align: right;">${refundId}</td>
                      </tr>` : ''}
                    </table>
                    <p style="margin: 8px 0 0; font-size: 13px; color: #999;">
                      The refund will be credited to your original payment method within 5-7 business days.
                    </p>
                  </td>
                </tr>
              </table>` : ''}

              <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Your invoice is attached with this email.
              </p>

              <!-- Divider -->
              <hr style="margin: 10px 0 20px; border: none; border-top: 1px solid #eaeaea;">

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Thank you for shopping with Luminique!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #fafafa; border-top: 1px solid #eaeaea; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #8a8a8a;">
                &copy; ${new Date().getFullYear()} Luminique. All rights reserved.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #aaaaaa;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
