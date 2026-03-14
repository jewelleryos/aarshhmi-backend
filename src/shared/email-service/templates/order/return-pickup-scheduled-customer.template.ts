interface ReturnPickupScheduledCustomerParams {
  firstName: string
  orderNumber: string
  suborderNumber: string
  productName: string
  variantName: string
  note: string
}

export const returnPickupScheduledCustomerTemplate = (params: ReturnPickupScheduledCustomerParams): string => {
  const { firstName, orderNumber, suborderNumber, productName, variantName, note } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Pickup Scheduled</title>
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
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Return Pickup Scheduled</h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${firstName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                We have scheduled a pickup for your return. Please keep the item ready for collection.
              </p>

              <!-- Order Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #ecfdf5; border-radius: 6px; border-left: 4px solid #14b8a6;">
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
                  </td>
                </tr>
              </table>

              ${note ? `
              <!-- Note -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #faf8f3; border-radius: 6px; font-size: 14px; color: #4a4a4a;">
                    <strong>Note:</strong> ${note}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Divider -->
              <hr style="margin: 10px 0 20px; border: none; border-top: 1px solid #eaeaea;">

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                If you have any questions, please feel free to reach out to us.
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
