import { CURRENCY_CONFIG } from '../../../config/currency'

interface CreditNoteParams {
  creditNoteNumber: string
  invoiceNumber: string
  orderNumber: string
  suborderNumber: string
  creditNoteDate: string
  orderDate: string

  // Customer
  customerName: string
  customerEmail: string
  customerPhone: string

  // Billing address
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

  // Amounts (in paise)
  originalPaidAmount: number
  priorRefundAmount: number    // any partial refund already done (weight adjustment)
  returnRefundAmount: number   // the refund being issued now
  refundId: string | null

  // Reason
  reason: string
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

export const creditNoteTemplate = (params: CreditNoteParams): string => {
  const {
    creditNoteNumber, invoiceNumber, orderNumber, suborderNumber,
    creditNoteDate, orderDate,
    customerName, customerEmail, customerPhone,
    billingAddress,
    productName, variantName, sku, quantity,
    originalPaidAmount, priorRefundAmount, returnRefundAmount, refundId,
    reason,
  } = params

  const billingAddrLine2 = billingAddress.address_line_2 ? `${billingAddress.address_line_2}<br>` : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credit Note — ${creditNoteNumber}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
    .company-name { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .doc-title { font-size: 22px; font-weight: 600; color: #dc2626; text-align: right; }
    .doc-number { font-size: 14px; color: #6a6a6a; text-align: right; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .info-block h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6a6a6a; }
    .info-block p { margin: 2px 0; line-height: 1.5; }
    .ref-table { margin-bottom: 24px; }
    .ref-table td { padding: 6px 12px; }
    .ref-table .label { color: #6a6a6a; font-size: 12px; }
    .ref-table .value { font-weight: 600; }
    .items-table th { background: #f8f8f8; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6a6a6a; border-bottom: 1px solid #e0e0e0; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    .amount-section { margin-top: 20px; display: flex; justify-content: flex-end; }
    .amount-table { width: 300px; }
    .amount-table td { padding: 6px 12px; }
    .amount-table .label { color: #6a6a6a; }
    .amount-table .value { text-align: right; }
    .amount-table .total { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; }
    .reason-box { margin-top: 20px; padding: 12px 16px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; }
    .reason-box strong { font-size: 12px; color: #6a6a6a; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #8a8a8a; font-size: 11px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">Aarshhmi</div>
    </div>
    <div>
      <div class="doc-title">Credit Note</div>
      <div class="doc-number">${creditNoteNumber}</div>
    </div>
  </div>

  <!-- Reference Info -->
  <table class="ref-table">
    <tr>
      <td class="label">Credit Note Date</td>
      <td class="value">${formatDate(creditNoteDate)}</td>
      <td class="label">Against Invoice</td>
      <td class="value">${invoiceNumber}</td>
    </tr>
    <tr>
      <td class="label">Order Number</td>
      <td class="value">${orderNumber}</td>
      <td class="label">Sub-order</td>
      <td class="value">${suborderNumber}</td>
    </tr>
    <tr>
      <td class="label">Order Date</td>
      <td class="value">${formatDate(orderDate)}</td>
      <td></td>
      <td></td>
    </tr>
  </table>

  <!-- Customer & Billing -->
  <div class="info-grid">
    <div class="info-block">
      <h4>Customer</h4>
      <p><strong>${customerName}</strong></p>
      ${customerEmail ? `<p>${customerEmail}</p>` : ''}
      ${customerPhone ? `<p>${customerPhone}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>Billing Address</h4>
      <p>
        ${billingAddress.first_name} ${billingAddress.last_name}<br>
        ${billingAddress.address_line_1}<br>
        ${billingAddrLine2}
        ${billingAddress.city_name}, ${billingAddress.state_name} — ${billingAddress.pincode}<br>
        ${billingAddress.phone}
      </p>
    </div>
  </div>

  <!-- Product -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Product</th>
        <th>SKU</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Original Paid</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${productName}</strong>
          ${variantName ? `<br><span style="color: #6a6a6a; font-size: 12px;">${variantName}</span>` : ''}
        </td>
        <td>${sku}</td>
        <td style="text-align: center;">${quantity}</td>
        <td style="text-align: right;">${formatPrice(originalPaidAmount)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Amounts -->
  <div class="amount-section">
    <table class="amount-table">
      <tr>
        <td class="label">Original Paid Amount</td>
        <td class="value">${formatPrice(originalPaidAmount)}</td>
      </tr>
      ${priorRefundAmount > 0 ? `
      <tr>
        <td class="label">Prior Refund (Weight Adj.)</td>
        <td class="value">- ${formatPrice(priorRefundAmount)}</td>
      </tr>
      ` : ''}
      <tr class="total">
        <td class="label">Credit Note Amount</td>
        <td class="value" style="color: #dc2626;">${formatPrice(returnRefundAmount)}</td>
      </tr>
    </table>
  </div>

  ${refundId ? `
  <div style="margin-top: 12px; text-align: right; font-size: 12px; color: #6a6a6a;">
    Refund Reference: <strong>${refundId}</strong>
  </div>
  ` : ''}

  <!-- Reason -->
  <div class="reason-box">
    <strong>Reason for Credit Note</strong>
    <p style="margin: 6px 0 0;">${reason}</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Aarshhmi. All rights reserved.</p>
    <p>This is a computer-generated document and does not require a signature.</p>
  </div>
</body>
</html>
  `.trim()
}
