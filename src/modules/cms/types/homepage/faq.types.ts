// FAQ section types

export interface FAQItem {
  id: string
  question: string
  answer: string
  rank: number
  status: boolean
}

export interface FAQContent {
  items: FAQItem[]
}
