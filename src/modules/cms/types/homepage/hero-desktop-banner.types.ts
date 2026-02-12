export interface HeroDesktopBannerItem {
  id: string
  image_url: string
  image_alt_text: string
  redirect_url: string
  rank: number
  status: boolean
}

export interface HeroDesktopBannerContent {
  banners: HeroDesktopBannerItem[]
}

export interface HeroDesktopBannerUpdateInput {
  content: HeroDesktopBannerContent
}
