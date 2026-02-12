// Media Grid section types

export interface MediaGridItem {
  id: string
  media_url: string
  media_alt_text: string
  redirect_url: string
  rank: number
  status: boolean
}

export interface MediaGridContent {
  items: MediaGridItem[]
}
