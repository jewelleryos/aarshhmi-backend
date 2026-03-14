import { CURRENCY_CONFIG } from '../../../config/currency'

interface ReceiptItem {
  productName: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  paidAmount: number
}

interface PaymentReceiptParams {
  receiptNumber: string
  orderNumber: string
  orderDate: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: ReceiptItem[]
  subtotal: number
  taxAmount: number
  couponDiscount: number
  couponCode: string | null
  totalAmount: number
  paymentGateway: string
  transactionId: string
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const paymentReceiptTemplate = (params: PaymentReceiptParams): string => {
  const {
    receiptNumber,
    orderNumber,
    orderDate,
    customerName,
    customerEmail,
    customerPhone,
    items,
    subtotal,
    taxAmount,
    couponDiscount,
    couponCode,
    totalAmount,
    paymentGateway,
    transactionId,
    shippingAddress,
  } = params

  const addressLine2 = shippingAddress.address_line_2
    ? `${shippingAddress.address_line_2}<br>` : ''

  const itemRows = items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${index + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">
          ${item.productName}${item.variantName ? `<br><span style="color: #888; font-size: 12px;">${item.variantName}</span>` : ''}
          ${item.sku ? `<br><span style="color: #888; font-size: 11px;">SKU: ${item.sku.toUpperCase()}</span>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; text-align: right;">${formatPrice(item.unitPrice)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; text-align: right;">${formatPrice(item.paidAmount)}</td>
      </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt — ${receiptNumber}</title>
  <style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px;">

    <!-- Header -->
    <table style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="vertical-align: top;">
          <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0; letter-spacing: 1px;">AARSHHMI</h1>
          <p style="font-size: 11px; color: #999; margin-top: 2px; letter-spacing: 0.5px;">FINE JEWELLERY</p>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <h2 style="font-size: 20px; font-weight: 600; color: #d4af37; margin: 0;">PAYMENT RECEIPT</h2>
          <p style="font-size: 13px; color: #666; margin-top: 6px;">${receiptNumber}</p>
          <p style="font-size: 13px; color: #666;">Date: ${formatDate(orderDate)}</p>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <div style="border-top: 2px solid #d4af37; margin-bottom: 25px;"></div>

    <!-- Order & Customer Info -->
    <table style="width: 100%; margin-bottom: 25px;">
      <tr>
        <td style="vertical-align: top; width: 50%;">
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Bill To</p>
          <p style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${customerName}</p>
          ${customerEmail ? `<p style="font-size: 13px; color: #555;">${customerEmail}</p>` : ''}
          ${customerPhone ? `<p style="font-size: 13px; color: #555;">${customerPhone}</p>` : ''}
        </td>
        <td style="vertical-align: top; width: 50%; text-align: right;">
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Order Details</p>
          <p style="font-size: 13px; color: #555;">Order: <strong>${orderNumber}</strong></p>
          <p style="font-size: 13px; color: #555;">Payment: ${paymentGateway.charAt(0).toUpperCase() + paymentGateway.slice(1)}</p>
          ${transactionId ? `<p style="font-size: 12px; color: #888; font-family: monospace;">${transactionId}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Shipping Address -->
    <table style="width: 100%; margin-bottom: 25px;">
      <tr>
        <td>
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Shipping Address</p>
          <p style="font-size: 13px; color: #555;">
            ${shippingAddress.first_name} ${shippingAddress.last_name}<br>
            ${shippingAddress.address_line_1}<br>
            ${addressLine2}
            ${shippingAddress.city_name}, ${shippingAddress.state_name} — ${shippingAddress.pincode}<br>
            Phone: ${shippingAddress.phone}
          </p>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #faf8f3;">
          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">#</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Item</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Qty</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Unit Price</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Totals -->
    <table style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td style="width: 60%;"></td>
        <td style="width: 40%;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Subtotal</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Tax (GST ${CURRENCY_CONFIG.taxRatePercent}%)</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(taxAmount)}</td>
            </tr>
            ${couponDiscount > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Coupon${couponCode ? ` (${couponCode})` : ''}</td>
              <td style="padding: 6px 0; font-size: 13px; color: #16a34a; text-align: right;">-${formatPrice(couponDiscount)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="border-top: 2px solid #d4af37; padding-top: 8px;"></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 700; color: #1a1a1a;">Total Paid</td>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 700; color: #d4af37; text-align: right;">${formatPrice(totalAmount)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #999;">This is a computer-generated payment receipt and does not require a signature.</p>
      <p style="font-size: 12px; color: #999; margin-top: 4px;">&copy; ${new Date().getFullYear()} Aarshhmi. All rights reserved.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}
