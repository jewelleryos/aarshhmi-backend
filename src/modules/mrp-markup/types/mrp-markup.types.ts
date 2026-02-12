export interface MrpMarkup {
  id: string
  diamond: number
  gemstone: number
  pearl: number
  making_charge: number
}

export interface UpdateMrpMarkupRequest {
  diamond?: number
  gemstone?: number
  pearl?: number
  making_charge?: number
}
