/**
 * Currency Configuration
 * Change these values when deploying for different regions
 */
export const CURRENCY_CONFIG = {
  code: 'INR',        // 'INR' | 'USD'
  locale: 'en-IN',    // 'en-IN' | 'en-US'
  subunits: 100,      // 100 paise = 1 rupee, 100 cents = 1 dollar
  includeTax: true,  // Prices include tax,
  taxRatePercent: 3, 
} as const
