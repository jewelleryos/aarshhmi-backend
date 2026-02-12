// FAQ Types Constants

export const FAQ_TYPES = {
  ORDERS: 'orders',
  SHIPPING: 'shipping',
  PRODUCTIONS: 'productions',
  RETURNS: 'returns',
  REPAIRS: 'repairs',
  SIZING: 'sizing',
} as const

export const FAQ_TYPE_LABELS: Record<string, string> = {
  orders: 'Orders',
  shipping: 'Shipping',
  productions: 'Productions',
  returns: 'Returns',
  repairs: 'Repairs',
  sizing: 'Sizing',
}

export const FAQ_TYPES_ARRAY = Object.values(FAQ_TYPES)

export type FAQType = (typeof FAQ_TYPES)[keyof typeof FAQ_TYPES]
