import { CURRENCY_CONFIG } from '../../../config/currency'

// ============================================
// Order Sheet — per sub-order, generated on confirmation
// ============================================

interface StoneDetail {
  name: string
  shape: string
  totalCarat: number
  noOfStones: number
}

interface PearlDetail {
  name: string
  quality: string
  totalGrams: number
  noOfPearls: number
}

interface OrderSheetParams {
  // IDs
  orderId: string
  orderNumber: string
  suborderNumber: string
  razorpayOrderId: string
  paymentId: string

  // Dates
  orderDate: string

  // Product
  productName: string
  productSku: string
  variantName: string
  variantSku: string
  productImageUrl: string | null

  // Options (resolved names)
  metalType: string | null
  metalColor: string | null
  metalPurity: string | null
  diamondClarityColor: string | null
  gemstoneColor: string | null

  // Dimensions (mm)
  dimensions: { width: number; height: number; length: number } | null

  // Engraving
  hasEngraving: boolean
  engravingText: string | null
  maxEngravingChars: number | null

  // Size
  hasSizeChart: boolean
  sizeChartValueName: string | null

  // Weights
  metalWeight: number | null       // grams
  totalProductWeight: number | null // grams

  // Stones
  diamonds: StoneDetail[]
  gemstones: StoneDetail[]
  pearls: PearlDetail[]

  // Pricing (all in paise)
  metalPrice: number
  makingCharge: number
  diamondPrice: number
  gemstonePrice: number
  pearlPrice: number
  priceWithoutTax: number
  taxAmount: number
  unitPrice: number
  quantity: number
  couponDiscount: number
  couponCode: string | null
  paidAmount: number

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

  // Customer
  customerName: string
  customerEmail: string
  customerPhone: string
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

const formatWeight = (grams: number | null): string => {
  if (grams === null || grams === undefined) return '—'
  return `${grams.toFixed(4)} g`
}

const formatCarat = (carat: number): string => {
  return `${carat.toFixed(4)} ct`
}

const formatAddress = (addr: OrderSheetParams['shippingAddress']): string => {
  const line2 = addr.address_line_2 ? `${addr.address_line_2}<br>` : ''
  return `
    ${addr.first_name} ${addr.last_name}<br>
    ${addr.address_line_1}<br>
    ${line2}
    ${addr.city_name}, ${addr.state_name} — ${addr.pincode}<br>
    Phone: ${addr.phone}
  `
}

export const orderSheetTemplate = (params: OrderSheetParams): string => {
  const {
    orderId,
    orderNumber,
    suborderNumber,
    razorpayOrderId,
    paymentId,
    orderDate,
    productName,
    productSku,
    variantName,
    variantSku,
    productImageUrl,
    metalType,
    metalColor,
    metalPurity,
    diamondClarityColor,
    gemstoneColor,
    dimensions,
    hasEngraving,
    engravingText,
    maxEngravingChars,
    hasSizeChart,
    sizeChartValueName,
    metalWeight,
    totalProductWeight,
    diamonds,
    gemstones,
    pearls,
    metalPrice,
    makingCharge,
    diamondPrice,
    gemstonePrice,
    pearlPrice,
    priceWithoutTax,
    taxAmount,
    unitPrice,
    quantity,
    couponDiscount,
    couponCode,
    paidAmount,
    shippingAddress,
    billingAddress,
    customerName,
    customerEmail,
    customerPhone,
  } = params

  // ---- Stone rows ----
  const diamondRows = diamonds.map((d) => `
    <tr>
      <td style="${cellStyle}">Diamond</td>
      <td style="${cellStyle}">${d.name}</td>
      <td style="${cellStyle}">${d.shape}</td>
      <td style="${cellStyle} text-align: center;">${d.noOfStones}</td>
      <td style="${cellStyle} text-align: right;">${formatCarat(d.totalCarat)}</td>
    </tr>
  `).join('')

  const gemstoneRows = gemstones.map((g) => `
    <tr>
      <td style="${cellStyle}">Gemstone</td>
      <td style="${cellStyle}">${g.name}</td>
      <td style="${cellStyle}">${g.shape}</td>
      <td style="${cellStyle} text-align: center;">${g.noOfStones}</td>
      <td style="${cellStyle} text-align: right;">${formatCarat(g.totalCarat)}</td>
    </tr>
  `).join('')

  const pearlRows = pearls.map((p) => `
    <tr>
      <td style="${cellStyle}">Pearl</td>
      <td style="${cellStyle}">${p.name}</td>
      <td style="${cellStyle}">${p.quality}</td>
      <td style="${cellStyle} text-align: center;">${p.noOfPearls}</td>
      <td style="${cellStyle} text-align: right;">${formatWeight(p.totalGrams)}</td>
    </tr>
  `).join('')

  const hasStones = diamonds.length > 0 || gemstones.length > 0 || pearls.length > 0

  // ---- Pricing rows ----
  const pricingRows = [
    metalPrice > 0 ? `<tr><td style="${priceLabel}">Metal</td><td style="${priceValue}">${formatPrice(metalPrice)}</td></tr>` : '',
    makingCharge > 0 ? `<tr><td style="${priceLabel}">Making Charge</td><td style="${priceValue}">${formatPrice(makingCharge)}</td></tr>` : '',
    diamondPrice > 0 ? `<tr><td style="${priceLabel}">Diamond</td><td style="${priceValue}">${formatPrice(diamondPrice)}</td></tr>` : '',
    gemstonePrice > 0 ? `<tr><td style="${priceLabel}">Gemstone</td><td style="${priceValue}">${formatPrice(gemstonePrice)}</td></tr>` : '',
    pearlPrice > 0 ? `<tr><td style="${priceLabel}">Pearl</td><td style="${priceValue}">${formatPrice(pearlPrice)}</td></tr>` : '',
  ].filter(Boolean).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Sheet — ${suborderNumber}</title>
  <style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.5; font-size: 13px; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 30px;">

    <!-- Header -->
    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="vertical-align: top;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; letter-spacing: 1px;">LUMINIQUE</h1>
          <p style="font-size: 10px; color: #999; margin-top: 2px; letter-spacing: 0.5px;">FINE JEWELLERY</p>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <h2 style="font-size: 18px; font-weight: 600; color: #d4af37; margin: 0;">ORDER SHEET</h2>
          <p style="font-size: 12px; color: #666; margin-top: 4px;">${suborderNumber}</p>
          <p style="font-size: 12px; color: #666;">Date: ${formatDate(orderDate)}</p>
        </td>
      </tr>
    </table>

    <div style="border-top: 2px solid #d4af37; margin-bottom: 18px;"></div>

    <!-- Reference IDs -->
    <table style="width: 100%; margin-bottom: 18px; border-collapse: collapse;">
      <tr>
        <td style="${refLabel}">Order Number</td>
        <td style="${refValue}">${orderNumber}</td>
        <td style="${refLabel}">Sub-order</td>
        <td style="${refValue}">${suborderNumber}</td>
      </tr>
      <tr>
        <td style="${refLabel}">Order ID</td>
        <td style="${refValue} font-family: monospace; font-size: 11px;">${orderId}</td>
        <td style="${refLabel}">Payment ID</td>
        <td style="${refValue} font-family: monospace; font-size: 11px;">${paymentId || '—'}</td>
      </tr>
      <tr>
        <td style="${refLabel}">Razorpay Order ID</td>
        <td style="${refValue} font-family: monospace; font-size: 11px;" colspan="3">${razorpayOrderId || '—'}</td>
      </tr>
    </table>

    <div style="border-top: 1px solid #eee; margin-bottom: 18px;"></div>

    <!-- Product Info + Image -->
    <table style="width: 100%; margin-bottom: 18px;">
      <tr>
        <td style="vertical-align: top; width: ${productImageUrl ? '65%' : '100%'};">
          <p style="${sectionTitle}">Product Details</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="${detailLabel}">Product</td><td style="${detailValue}">${productName}</td></tr>
            ${variantName ? `<tr><td style="${detailLabel}">Variant</td><td style="${detailValue}">${variantName}</td></tr>` : ''}
            ${productSku ? `<tr><td style="${detailLabel}">Product SKU</td><td style="${detailValue} text-transform: uppercase;">${productSku}</td></tr>` : ''}
            <tr><td style="${detailLabel}">Variant SKU</td><td style="${detailValue} text-transform: uppercase;">${variantSku}</td></tr>
            <tr><td style="${detailLabel}">Quantity</td><td style="${detailValue}">${quantity}</td></tr>
            ${hasSizeChart && sizeChartValueName ? `<tr><td style="${detailLabel}">Size</td><td style="${detailValue}">${sizeChartValueName}</td></tr>` : ''}
            ${dimensions ? `<tr><td style="${detailLabel}">Dimensions</td><td style="${detailValue}">${dimensions.width} × ${dimensions.height} × ${dimensions.length} mm</td></tr>` : ''}
            ${hasEngraving ? `<tr><td style="${detailLabel}">Engraving</td><td style="${detailValue}">${engravingText || 'Available'} ${maxEngravingChars ? `<span style="color: #888; font-size: 11px;">(max ${maxEngravingChars} chars)</span>` : ''}</td></tr>` : ''}
          </table>
        </td>
        ${productImageUrl ? `
        <td style="vertical-align: top; text-align: right; width: 35%; padding-left: 16px;">
          <img src="${productImageUrl}" alt="${productName}" style="max-width: 180px; max-height: 180px; border-radius: 8px; border: 1px solid #eee; object-fit: cover;" />
        </td>
        ` : ''}
      </tr>
    </table>

    <!-- Metal & Options -->
    <table style="width: 100%; margin-bottom: 18px;">
      <tr>
        <td style="vertical-align: top; width: 50%;">
          <p style="${sectionTitle}">Metal Details</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${metalType ? `<tr><td style="${detailLabel}">Metal Type</td><td style="${detailValue}">${metalType}</td></tr>` : ''}
            ${metalColor ? `<tr><td style="${detailLabel}">Metal Color</td><td style="${detailValue}">${metalColor}</td></tr>` : ''}
            ${metalPurity ? `<tr><td style="${detailLabel}">Metal Purity</td><td style="${detailValue}">${metalPurity}</td></tr>` : ''}
            <tr><td style="${detailLabel}">Metal Weight</td><td style="${detailValue}">${formatWeight(metalWeight)}</td></tr>
            <tr><td style="${detailLabel}">Total Weight</td><td style="${detailValue}">${formatWeight(totalProductWeight)}</td></tr>
          </table>
        </td>
        <td style="vertical-align: top; width: 50%; padding-left: 20px;">
          <p style="${sectionTitle}">Options</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${diamondClarityColor ? `<tr><td style="${detailLabel}">Diamond</td><td style="${detailValue}">${diamondClarityColor}</td></tr>` : ''}
            ${gemstoneColor ? `<tr><td style="${detailLabel}">Gemstone</td><td style="${detailValue}">${gemstoneColor}</td></tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- Stones Table -->
    ${hasStones ? `
    <div style="margin-bottom: 18px;">
      <p style="${sectionTitle}">Stone Details</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #faf8f3;">
            <th style="${thStyle}">Type</th>
            <th style="${thStyle}">Name</th>
            <th style="${thStyle}">Shape / Quality</th>
            <th style="${thStyle} text-align: center;">Count</th>
            <th style="${thStyle} text-align: right;">Weight</th>
          </tr>
        </thead>
        <tbody>
          ${diamondRows}
          ${gemstoneRows}
          ${pearlRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Pricing + Customer side by side -->
    <table style="width: 100%; margin-bottom: 18px;">
      <tr>
        <td style="vertical-align: top; width: 50%;">
          <p style="${sectionTitle}">Pricing Breakdown</p>
          <table style="width: 90%; border-collapse: collapse;">
            ${pricingRows}
            <tr><td colspan="2" style="border-top: 1px solid #eee; padding-top: 4px;"></td></tr>
            <tr><td style="${priceLabel}">Excl. Tax</td><td style="${priceValue}">${formatPrice(priceWithoutTax)}</td></tr>
            <tr><td style="${priceLabel}">Tax (GST ${CURRENCY_CONFIG.taxRatePercent}%)</td><td style="${priceValue}">${formatPrice(taxAmount)}</td></tr>
            <tr><td style="${priceLabel} font-weight: 600;">Unit Price</td><td style="${priceValue} font-weight: 600;">${formatPrice(unitPrice)}</td></tr>
            ${quantity > 1 ? `<tr><td style="${priceLabel}">Qty × ${quantity}</td><td style="${priceValue}">${formatPrice(unitPrice * quantity)}</td></tr>` : ''}
            ${couponDiscount > 0 ? `<tr><td style="${priceLabel}">Coupon${couponCode ? ` (${couponCode})` : ''}</td><td style="${priceValue} color: #16a34a;">-${formatPrice(couponDiscount)}</td></tr>` : ''}
            <tr><td colspan="2" style="border-top: 2px solid #d4af37; padding-top: 6px;"></td></tr>
            <tr><td style="${priceLabel} font-size: 14px; font-weight: 700;">Paid Amount</td><td style="${priceValue} font-size: 14px; font-weight: 700; color: #d4af37;">${formatPrice(paidAmount)}</td></tr>
          </table>
        </td>
        <td style="vertical-align: top; width: 50%; padding-left: 20px;">
          <p style="${sectionTitle}">Customer</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="${detailLabel}">Name</td><td style="${detailValue}">${customerName}</td></tr>
            ${customerEmail ? `<tr><td style="${detailLabel}">Email</td><td style="${detailValue}">${customerEmail}</td></tr>` : ''}
            ${customerPhone ? `<tr><td style="${detailLabel}">Phone</td><td style="${detailValue}">${customerPhone}</td></tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- Addresses -->
    <table style="width: 100%; margin-bottom: 18px;">
      <tr>
        <td style="vertical-align: top; width: 50%;">
          <p style="${sectionTitle}">Shipping Address</p>
          <p style="font-size: 12px; color: #555; line-height: 1.7;">
            ${formatAddress(shippingAddress)}
          </p>
        </td>
        <td style="vertical-align: top; width: 50%; padding-left: 20px;">
          <p style="${sectionTitle}">Billing Address</p>
          <p style="font-size: 12px; color: #555; line-height: 1.7;">
            ${formatAddress(billingAddress)}
          </p>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 14px; text-align: center;">
      <p style="font-size: 11px; color: #999;">This is an internal order sheet for production and fulfillment reference.</p>
      <p style="font-size: 11px; color: #999; margin-top: 3px;">&copy; ${new Date().getFullYear()} Luminique. All rights reserved.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

// ============================================
// Inline styles (kept as constants for readability)
// ============================================

const sectionTitle = 'font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;'

const detailLabel = 'padding: 3px 8px 3px 0; font-size: 12px; color: #888; width: 110px; vertical-align: top;'
const detailValue = 'padding: 3px 0; font-size: 12px; color: #1a1a1a; font-weight: 500;'

const refLabel = 'padding: 4px 8px 4px 0; font-size: 11px; color: #888; width: 120px;'
const refValue = 'padding: 4px 0; font-size: 12px; color: #1a1a1a;'

const thStyle = 'padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; border-bottom: 2px solid #d4af37;'
const cellStyle = 'padding: 7px 10px; font-size: 12px; color: #333; border-bottom: 1px solid #eee;'

const priceLabel = 'padding: 3px 0; font-size: 12px; color: #666;'
const priceValue = 'padding: 3px 0; font-size: 12px; color: #333; text-align: right;'
