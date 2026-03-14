import { CURRENCY_CONFIG } from '../../../config/currency'

interface InvoiceParams {
  // IDs
  invoiceNumber: string
  orderNumber: string
  suborderNumber: string
  orderDate: string
  invoiceDate: string

  // Customer
  customerName: string
  customerEmail: string
  customerPhone: string

  // Addresses
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
  billingAddress: {
    first_name: string
    last_name: string
    phone: string
    address_line_1: string
    address_line_2?: string
    city_name: string
    state_name: string
    pincode: string
  }

  // Product
  productName: string
  variantName: string
  sku: string
  quantity: number

  // Original pricing (in paise)
  metalPrice: number
  makingCharge: number
  diamondPrice: number
  gemstonePrice: number
  pearlPrice: number
  priceWithoutTax: number
  taxAmount: number
  unitPrice: number
  couponDiscount: number
  couponCode: string | null

  // Weight adjustment
  weightAdjustmentType: 'none' | 'refund' | 'complimentary'
  weightAdjustmentAmount: number  // in paise
  quotedMetalWeight: number
  actualMetalWeight: number
  newMetalPrice: number           // in paise (recalculated)

  // Final amounts
  invoiceAmount: number           // in paise — final invoice total
  paidAmount: number              // in paise — what customer originally paid

  // Refund (if applicable)
  refundAmount: number            // in paise
  refundId: string | null

  // Shipping
  trackingId: string | null
  courierName: string | null
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

export const invoiceTemplate = (params: InvoiceParams): string => {
  const {
    invoiceNumber, orderNumber, suborderNumber, orderDate, invoiceDate,
    customerName, customerEmail, customerPhone,
    shippingAddress, billingAddress,
    productName, variantName, sku, quantity,
    metalPrice, makingCharge, diamondPrice, gemstonePrice, pearlPrice,
    priceWithoutTax, taxAmount, unitPrice, couponDiscount, couponCode,
    weightAdjustmentType, weightAdjustmentAmount, quotedMetalWeight, actualMetalWeight, newMetalPrice,
    invoiceAmount, paidAmount,
    refundAmount, refundId,
    trackingId, courierName,
  } = params

  const hasWeightChange = weightAdjustmentType !== 'none'
  const isRefund = weightAdjustmentType === 'refund'
  const isComplimentary = weightAdjustmentType === 'complimentary'

  const billingAddrLine2 = billingAddress.address_line_2 ? `${billingAddress.address_line_2}<br>` : ''
  const shippingAddrLine2 = shippingAddress.address_line_2 ? `${shippingAddress.address_line_2}<br>` : ''

  // Build pricing rows — use new metal price if weight changed
  const displayMetalPrice = hasWeightChange ? newMetalPrice : metalPrice

  // Recalculate totals for invoice display
  const metalPriceDiff = displayMetalPrice - metalPrice
  const displayPriceWithoutTax = priceWithoutTax + metalPriceDiff
  const displayTaxAmount = Math.round(displayPriceWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
  const displayUnitPrice = displayPriceWithoutTax + displayTaxAmount

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice — ${invoiceNumber}</title>
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
          <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0; letter-spacing: 1px;">Aarshhmi</h1>
          <p style="font-size: 11px; color: #999; margin-top: 2px; letter-spacing: 0.5px;">FINE JEWELLERY</p>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <h2 style="font-size: 20px; font-weight: 600; color: #d4af37; margin: 0;">INVOICE</h2>
          <p style="font-size: 13px; color: #666; margin-top: 6px;">${invoiceNumber}</p>
          <p style="font-size: 13px; color: #666;">Invoice Date: ${formatDate(invoiceDate)}</p>
          <p style="font-size: 13px; color: #666;">Order Date: ${formatDate(orderDate)}</p>
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
          <p style="font-size: 13px; color: #555;">Sub-order: <strong>${suborderNumber}</strong></p>
        </td>
      </tr>
    </table>

    <!-- Addresses -->
    <table style="width: 100%; margin-bottom: 25px;">
      <tr>
        <td style="vertical-align: top; width: 50%;">
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Billing Address</p>
          <p style="font-size: 13px; color: #555;">
            ${billingAddress.first_name} ${billingAddress.last_name}<br>
            ${billingAddress.address_line_1}<br>
            ${billingAddrLine2}
            ${billingAddress.city_name}, ${billingAddress.state_name} — ${billingAddress.pincode}<br>
            Phone: ${billingAddress.phone}
          </p>
        </td>
        <td style="vertical-align: top; width: 50%;">
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Shipping Address</p>
          <p style="font-size: 13px; color: #555;">
            ${shippingAddress.first_name} ${shippingAddress.last_name}<br>
            ${shippingAddress.address_line_1}<br>
            ${shippingAddrLine2}
            ${shippingAddress.city_name}, ${shippingAddress.state_name} — ${shippingAddress.pincode}<br>
            Phone: ${shippingAddress.phone}
          </p>
        </td>
      </tr>
    </table>

    <!-- Product Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #faf8f3;">
          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Item</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">SKU</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;">Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">
            ${productName}${variantName ? `<br><span style="color: #888; font-size: 12px;">${variantName}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${sku ? sku.toUpperCase() : '—'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; text-align: center;">${quantity}</td>
        </tr>
      </tbody>
    </table>

    <!-- Pricing Breakdown -->
    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="width: 55%;"></td>
        <td style="width: 45%;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Metal${hasWeightChange ? ` (${actualMetalWeight}g)` : ''}</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(displayMetalPrice)}</td>
            </tr>
            ${hasWeightChange && metalPrice !== displayMetalPrice ? `
            <tr>
              <td style="padding: 2px 0 6px; font-size: 11px; color: #999;" colspan="2">
                Original: ${formatPrice(metalPrice)} (${quotedMetalWeight}g)
              </td>
            </tr>` : ''}
            ${makingCharge > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Making Charge</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(makingCharge)}</td>
            </tr>` : ''}
            ${diamondPrice > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Diamond</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(diamondPrice)}</td>
            </tr>` : ''}
            ${gemstonePrice > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Gemstone</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(gemstonePrice)}</td>
            </tr>` : ''}
            ${pearlPrice > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Pearl</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(pearlPrice)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="border-top: 1px solid #eee; padding-top: 6px;"></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Subtotal</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(displayPriceWithoutTax)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Tax (GST ${CURRENCY_CONFIG.taxRatePercent}%)</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(displayTaxAmount)}</td>
            </tr>
            ${couponDiscount > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Coupon${couponCode ? ` (${couponCode})` : ''}</td>
              <td style="padding: 6px 0; font-size: 13px; color: #16a34a; text-align: right;">-${formatPrice(couponDiscount)}</td>
            </tr>` : ''}
            ${isComplimentary ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Complimentary Discount</td>
              <td style="padding: 6px 0; font-size: 13px; color: #16a34a; text-align: right;">-${formatPrice(weightAdjustmentAmount)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="border-top: 2px solid #d4af37; padding-top: 8px;"></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 700; color: #1a1a1a;">Invoice Total</td>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 700; color: #d4af37; text-align: right;">${formatPrice(invoiceAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #666;">Amount Paid</td>
              <td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">${formatPrice(paidAmount)}</td>
            </tr>
            ${isRefund && refundAmount > 0 ? `
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #22c55e;">Refund</td>
              <td style="padding: 6px 0; font-size: 13px; color: #22c55e; text-align: right;">${formatPrice(refundAmount)}</td>
            </tr>
            ${refundId ? `
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #999;" colspan="2">
                Refund ID: ${refundId}
              </td>
            </tr>` : ''}` : ''}
          </table>
        </td>
      </tr>
    </table>

    ${trackingId || courierName ? `
    <!-- Shipping Info -->
    <table style="width: 100%; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #d4af37;">
          <p style="font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 6px;">Shipping Information</p>
          ${courierName ? `<p style="font-size: 13px; color: #555;">Courier: <strong>${courierName}</strong></p>` : ''}
          ${trackingId ? `<p style="font-size: 13px; color: #555;">Tracking ID: <strong>${trackingId}</strong></p>` : ''}
        </td>
      </tr>
    </table>` : ''}

    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #999;">This is a computer-generated invoice and does not require a signature.</p>
      <p style="font-size: 12px; color: #999; margin-top: 4px;">&copy; ${new Date().getFullYear()} Aarshhmi. All rights reserved.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}
