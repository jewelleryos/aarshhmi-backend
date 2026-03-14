import { CURRENCY_CONFIG } from '../../../../config/currency'

interface OrderItem {
  productName: string
  variantName: string
  quantity: number
  paidAmount: number
}

interface OrderReceivedCustomerParams {
  firstName: string
  orderNumber: string
  paymentId: string
  items: OrderItem[]
  totalAmount: number
  shippingAddress: {
    first_name: string
    last_name: string
    phone: string
    address_line_1: string
    address_line_2?: string
    city_name: string
    state_name: string
    pincode: string
  }
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

export const orderReceivedCustomerTemplate = (params: OrderReceivedCustomerParams): string => {
  const { firstName, orderNumber, paymentId, items, totalAmount, shippingAddress } = params

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: #4a4a4a; border-bottom: 1px solid #f0f0f0;">
          ${item.productName}${item.variantName ? ` — ${item.variantName}` : ''}
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #4a4a4a; text-align: center; border-bottom: 1px solid #f0f0f0;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #1a1a1a; text-align: right; border-bottom: 1px solid #f0f0f0;">
          ${formatPrice(item.paidAmount)}
        </td>
      </tr>`
    )
    .join('')

  const addressLine2 = shippingAddress.address_line_2
    ? `${shippingAddress.address_line_2}<br>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Received</title>
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
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">We've Received Your Order!</h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${firstName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Thank you for your order. We've received your payment and your order is now being processed.
              </p>

              <!-- Order Number & Payment ID -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #faf8f3; border-radius: 6px; border-left: 4px solid #d4af37;">
                    <p style="margin: 0; font-size: 14px; color: #6a6a6a;">Order Number</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${orderNumber}</p>
                    ${paymentId ? `<p style="margin: 8px 0 0; font-size: 13px; color: #6a6a6a;">Payment ID: <span style="font-family: monospace; color: #1a1a1a;">${paymentId}</span></p>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Items Table -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6a6a6a; text-transform: uppercase; border-bottom: 2px solid #eaeaea;">Item</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6a6a6a; text-transform: uppercase; text-align: center; border-bottom: 2px solid #eaeaea;">Qty</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6a6a6a; text-transform: uppercase; text-align: right; border-bottom: 2px solid #eaeaea;">Amount</td>
                </tr>
                ${itemRows}
                <tr>
                  <td colspan="2" style="padding: 14px 16px; font-size: 16px; font-weight: 600; color: #1a1a1a; text-align: right;">Total</td>
                  <td style="padding: 14px 16px; font-size: 16px; font-weight: 600; color: #d4af37; text-align: right;">${formatPrice(totalAmount)}</td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Shipping Address</h3>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.8; color: #4a4a4a;">
                ${shippingAddress.first_name} ${shippingAddress.last_name}<br>
                ${shippingAddress.address_line_1}<br>
                ${addressLine2}
                ${shippingAddress.city_name}, ${shippingAddress.state_name} — ${shippingAddress.pincode}<br>
                Phone: ${shippingAddress.phone}
              </p>

              <!-- Divider -->
              <hr style="margin: 10px 0 20px; border: none; border-top: 1px solid #eaeaea;">

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                We'll notify you once your order is confirmed and shipped.
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
