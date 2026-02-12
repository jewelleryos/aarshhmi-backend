export interface HeroMobileBannerItem {
  id: string
  image_url: string
  image_alt_text: string
  redirect_url: string
  rank: number
  status: boolean
}

export interface HeroMobileBannerContent {
  banners: HeroMobileBannerItem[]
}

export interface HeroMobileBannerUpdateInput {
  content: HeroMobileBannerContent
}
