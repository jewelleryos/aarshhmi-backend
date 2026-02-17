export type JobStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'

export type TriggerSource =
  | 'metal_purity'
  | 'diamond_pricing'
  | 'diamond_pricing_bulk'
  | 'gemstone_pricing'
  | 'gemstone_pricing_bulk'
  | 'making_charge'
  | 'other_charge'
  | 'mrp_markup'
  | 'pricing_rule'
  | 'manual'

export interface ProductError {
  productId: string
  productName: string
  error: string
}
