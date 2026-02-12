export interface ShopByCategoryItem {
  id: string
  title: string
  image_url: string
  image_alt_text: string
  redirect_url: string
  rank: number
  status: boolean
}

export interface ShopByCategoryContent {
  categories: ShopByCategoryItem[]
}

export interface ShopByCategoryUpdateInput {
  content: ShopByCategoryContent
}
