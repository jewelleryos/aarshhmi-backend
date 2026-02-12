import { CURRENCY_CONFIG } from '../config/currency'

/**
 * Convert display amount to smallest unit (for storing in database)
 * Example: 6500.50 → 650050
 */
export function toSmallestUnit(amount: number): number {
  return Math.round(amount * CURRENCY_CONFIG.subunits)
}

/**
 * Convert smallest unit to display amount (for API response if needed)
 * Example: 650050 → 6500.50
 */
export function fromSmallestUnit(amount: number): number {
  return amount / CURRENCY_CONFIG.subunits
}
