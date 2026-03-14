import { CURRENCY_CONFIG } from '../../../../config/currency'

interface CancelRequestAdminParams {
  orderNumber: string
  suborderNumber: string
  productName: string
  variantName: string
  paidAmount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  reason: string
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

export const cancelRequestAdminTemplate = (params: CancelRequestAdminParams): string => {
  const { orderNumber, suborderNumber, productName, variantName, paidAmount, customerName, customerEmail, customerPhone, reason } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eaeaea;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Luminique — Admin</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #ea580c;">Cancellation Request Received</h2>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                A customer has submitted a cancellation request for the following order. Please review and take appropriate action.
              </p>

              <!-- Order Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #fff7ed; border-radius: 6px; border-left: 4px solid #f97316;">
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
                    <p style="margin: 6px 0 0; font-size: 14px; color: #6a6a6a;">
                      Paid Amount: ${formatPrice(paidAmount)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Customer Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #eaeaea; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Customer Details</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Name</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a; text-align: right;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Email</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a; text-align: right;">${customerEmail || '—'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #6a6a6a;">Phone</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a; text-align: right;">${customerPhone || '—'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reason -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #faf8f3; border-radius: 6px; font-size: 14px; color: #4a4a4a;">
                    <strong>Customer's reason:</strong> ${reason}
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Please log into the admin panel to accept or reject this cancellation request.
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
