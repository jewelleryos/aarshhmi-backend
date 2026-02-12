// Luminique Trust section types

export interface LuminiqueTrustItem {
  id: string
  image_url: string
  image_alt_text: string
  text_one: string
  text_two: string
}

export interface LuminiqueTrustContent {
  title: string
  subtext: string
  trusts: LuminiqueTrustItem[]
}
