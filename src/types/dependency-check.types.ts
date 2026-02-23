export interface DependencyItem {
  id: string
  name: string
  sku?: string
}

export interface DependencyGroup {
  type: string
  count: number
  items: DependencyItem[]
}

export interface DependencyCheckResult {
  can_delete: boolean
  dependencies: DependencyGroup[]
}
