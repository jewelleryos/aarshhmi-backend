// Luminique Collection section types

export interface LuminiqueCollectionItem {
  id: string
  image_url: string
  image_alt_text: string
  redirect_url: string
  rank: number
  status: boolean
}

export interface LuminiqueCollectionContent {
  items: LuminiqueCollectionItem[]
}
