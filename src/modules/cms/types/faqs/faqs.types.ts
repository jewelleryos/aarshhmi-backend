// FAQs section types

import type { FAQType } from '../../config/faq.constants'

export interface FAQItem {
  id: string
  type: FAQType
  question: string
  answer: string
  rank: number
  status: boolean
}

export interface FAQsContent {
  items: FAQItem[]
}

// Storefront response - grouped by type
export interface FAQsGroupedResponse {
  orders: Omit<FAQItem, 'type' | 'status'>[]
  shipping: Omit<FAQItem, 'type' | 'status'>[]
  productions: Omit<FAQItem, 'type' | 'status'>[]
  returns: Omit<FAQItem, 'type' | 'status'>[]
  repairs: Omit<FAQItem, 'type' | 'status'>[]
  sizing: Omit<FAQItem, 'type' | 'status'>[]
}
