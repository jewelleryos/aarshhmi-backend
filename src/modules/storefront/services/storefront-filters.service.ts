import { db } from '../../../lib/db'
import type {
  StorefrontFiltersParams,
  StorefrontFiltersResponse,
  StorefrontFilterGroup,
  StorefrontCategoryValue,
  StorefrontTagValue,
  StorefrontPriceValue,
  StorefrontSortByOption,
} from '../types/storefront.types'

class StorefrontFiltersService {
  /**
   * Get all filters with contextual counts + sort-by options
   */
  async getFilters(params: StorefrontFiltersParams): Promise<StorefrontFiltersResponse> {
    const categories = params.categories || []
    const tags = params.tags || []
    const priceRanges = params.price_ranges || []

    // 1. Fetch group configs and tag groups
    const [groupConfigs, tagGroups] = await Promise.all([
      this.getGroupConfigs(),
      this.getActiveTagGroups(),
    ])

    // 2. Resolve price range values if applied
    let priceRangeFilters: { min_price: number; max_price: number }[] = []
    if (priceRanges.length > 0) {
      priceRangeFilters = await this.getPriceRangeValues(priceRanges)
    }

    // 3. Build tag-to-group mapping for cross-filter logic
    const tagGroupMapping = await this.getTagGroupMapping(tags)

    // 4. Compute all counts in parallel — structured results, not push-based
    const categoryConfig = groupConfigs.find((g) => g.type === 'category')
    const priceConfig = groupConfigs.find((g) => g.type === 'price_filter')

    const [categoryValues, tagGroupResults, priceValues, sortByOptions] = await Promise.all([
      categoryConfig?.is_filterable
        ? this.getCategoryCounts(tags, priceRangeFilters, tagGroupMapping)
        : Promise.resolve(null),
      Promise.all(
        tagGroups.map((tg) =>
          this.getTagCounts(tg.id, categories, tags, priceRangeFilters, tagGroupMapping)
        )
      ),
      priceConfig?.is_filterable
        ? this.getPriceRangeCounts(categories, tags, tagGroupMapping)
        : Promise.resolve(null),
      this.getSortByOptions(),
    ])

    // 5. Build filter groups in deterministic order
    const filterGroups: (StorefrontFilterGroup & { rank: number })[] = []

    if (categoryValues && categoryConfig) {
      filterGroups.push({
        type: 'category',
        label: categoryConfig.display_name || 'Category',
        values: categoryValues,
        rank: categoryConfig.rank,
      })
    }

    for (let i = 0; i < tagGroups.length; i++) {
      const tg = tagGroups[i]
      filterGroups.push({
        type: 'tag_group',
        id: tg.id,
        label: tg.filter_display_name || tg.name,
        slug: tg.slug,
        media_url: tg.media_url,
        media_alt_text: tg.media_alt_text,
        values: tagGroupResults[i],
        rank: tg.rank,
      })
    }

    if (priceValues && priceConfig) {
      filterGroups.push({
        type: 'price_filter',
        label: priceConfig.display_name || 'Price',
        values: priceValues,
        rank: priceConfig.rank,
      })
    }

    // 6. Sort by rank
    filterGroups.sort((a, b) => a.rank - b.rank)

    // Remove the internal rank field from the response
    const filters: StorefrontFilterGroup[] = filterGroups.map(({ rank, ...group }) => group)

    return { filters, sort_by: sortByOptions }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Fetch group configs (category, price_filter)
   */
  private async getGroupConfigs() {
    const result = await db.query(
      `SELECT type, display_name, is_filterable, rank
      FROM storefront_filter_group_config
      ORDER BY rank ASC`
    )
    return result.rows as {
      type: string
      display_name: string | null
      is_filterable: boolean
      rank: number
    }[]
  }

  /**
   * Fetch active, filterable tag groups
   */
  private async getActiveTagGroups() {
    const result = await db.query(
      `SELECT id, name, slug, filter_display_name, media_url, media_alt_text, rank
      FROM tag_groups
      WHERE status = TRUE AND is_filterable = TRUE
      ORDER BY rank ASC`
    )
    return result.rows as {
      id: string
      name: string
      slug: string
      filter_display_name: string | null
      media_url: string | null
      media_alt_text: string | null
      rank: number
    }[]
  }

  /**
   * Get min/max values for selected price range IDs
   */
  private async getPriceRangeValues(priceRangeIds: string[]) {
    const result = await db.query(
      `SELECT min_price, max_price FROM price_filter_ranges WHERE id = ANY($1)`,
      [priceRangeIds]
    )
    return result.rows as { min_price: number; max_price: number }[]
  }

  /**
   * Map tag IDs to their group IDs (needed for cross-filter within tag groups)
   */
  private async getTagGroupMapping(tagIds: string[]) {
    if (tagIds.length === 0) return new Map<string, string>()

    const result = await db.query(
      `SELECT id, tag_group_id FROM tags WHERE id = ANY($1)`,
      [tagIds]
    )

    const mapping = new Map<string, string>()
    for (const row of result.rows) {
      mapping.set(row.id, row.tag_group_id)
    }
    return mapping
  }

  /**
   * Group tag IDs by their tag group using the tagGroupMapping.
   * Returns Map<tagGroupId, tagIds[]> so each group gets a separate INNER JOIN (AND between groups).
   */
  private groupTagsByGroup(
    tagIds: string[],
    tagGroupMapping: Map<string, string>
  ): Map<string, string[]> {
    const grouped = new Map<string, string[]>()
    for (const tagId of tagIds) {
      const groupId = tagGroupMapping.get(tagId)
      if (!groupId) continue
      if (!grouped.has(groupId)) {
        grouped.set(groupId, [])
      }
      grouped.get(groupId)!.push(tagId)
    }
    return grouped
  }

  /**
   * Add one INNER JOIN per tag group to subqueryJoins.
   * AND between groups, OR within group.
   */
  private addTagGroupJoins(
    tagsByGroup: Map<string, string[]>,
    subqueryJoins: string[],
    values: unknown[],
    paramIndex: number
  ): number {
    let joinIndex = 0
    for (const [, groupTagIds] of tagsByGroup) {
      subqueryJoins.push(
        `INNER JOIN product_tags pt_filter_${joinIndex} ON pt_filter_${joinIndex}.product_id = p.id AND pt_filter_${joinIndex}.tag_id = ANY($${paramIndex})`
      )
      values.push(groupTagIds)
      paramIndex++
      joinIndex++
    }
    return paramIndex
  }

  /**
   * Build price range WHERE clause (no leading AND)
   * Returns e.g. "(p.min_price <= $1 AND p.max_price >= $2) OR (...)"
   */
  private buildPriceRangeWhereClause(
    priceRangeFilters: { min_price: number; max_price: number }[],
    productAlias: string,
    values: unknown[],
    startIndex: number
  ): { sql: string; nextIndex: number } {
    if (priceRangeFilters.length === 0) return { sql: '', nextIndex: startIndex }

    const conditions: string[] = []
    let idx = startIndex

    for (const range of priceRangeFilters) {
      conditions.push(
        `(${productAlias}.min_price <= $${idx} AND ${productAlias}.max_price >= $${idx + 1})`
      )
      values.push(range.max_price, range.min_price)
      idx += 2
    }

    return {
      sql: `(${conditions.join(' OR ')})`,
      nextIndex: idx,
    }
  }

  /**
   * Category counts — cross-filter: exclude category filter, apply tags + price ranges
   *
   * Uses subquery approach: build a subquery of filtered products, then LEFT JOIN
   * categories to it. This ensures ALL categories always appear (even with count 0).
   */
  private async getCategoryCounts(
    tags: string[],
    priceRangeFilters: { min_price: number; max_price: number }[],
    tagGroupMapping: Map<string, string>
  ): Promise<StorefrontCategoryValue[]> {
    const values: unknown[] = []
    let paramIndex = 1
    const subqueryJoins: string[] = []
    const subqueryConditions: string[] = [`p.status = 'active'`]

    // Tag filter — AND between groups, OR within group
    if (tags.length > 0) {
      const tagsByGroup = this.groupTagsByGroup(tags, tagGroupMapping)
      paramIndex = this.addTagGroupJoins(tagsByGroup, subqueryJoins, values, paramIndex)
    }

    // Price range filter
    if (priceRangeFilters.length > 0) {
      const priceClause = this.buildPriceRangeWhereClause(
        priceRangeFilters,
        'p',
        values,
        paramIndex
      )
      subqueryConditions.push(priceClause.sql)
      paramIndex = priceClause.nextIndex
    }

    const query = `
      SELECT c.id, c.name, c.slug, c.filter_display_name AS display_name,
             c.media_url, c.media_alt_text, c.parent_category_id, c.rank,
             COUNT(DISTINCT fp.product_id) AS count
      FROM categories c
      LEFT JOIN (
        SELECT pc.category_id, pc.product_id
        FROM product_categories pc
        INNER JOIN products p ON p.id = pc.product_id
        ${subqueryJoins.join('\n')}
        WHERE ${subqueryConditions.join(' AND ')}
      ) fp ON fp.category_id = c.id
      WHERE c.status = TRUE AND c.is_filterable = TRUE
      GROUP BY c.id, c.name, c.slug, c.filter_display_name, c.media_url, c.media_alt_text,
               c.parent_category_id, c.rank
      ORDER BY c.rank ASC, c.name ASC
    `

    const result = await db.query(query, values)

    // Build hierarchical structure: root categories with children
    const allCategories = result.rows as (StorefrontCategoryValue & {
      parent_category_id: string | null
      rank: number
    })[]

    const rootCategories: StorefrontCategoryValue[] = []
    const childMap = new Map<string, StorefrontCategoryValue[]>()

    for (const cat of allCategories) {
      const value: StorefrontCategoryValue = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        display_name: cat.display_name,
        media_url: cat.media_url,
        media_alt_text: cat.media_alt_text,
        count: Number(cat.count),
        children: [],
      }

      if (cat.parent_category_id) {
        if (!childMap.has(cat.parent_category_id)) {
          childMap.set(cat.parent_category_id, [])
        }
        childMap.get(cat.parent_category_id)!.push(value)
      } else {
        rootCategories.push(value)
      }
    }

    // Attach children to their parents
    for (const root of rootCategories) {
      root.children = childMap.get(root.id) || []
    }

    return rootCategories
  }

  /**
   * Tag counts for a specific tag group — cross-filter:
   * Exclude tags from THIS group, apply categories + price ranges + tags from OTHER groups
   *
   * Uses subquery approach: build a subquery of filtered products, then LEFT JOIN
   * tags to it. This ensures ALL tags in the group always appear (even with count 0).
   */
  private async getTagCounts(
    tagGroupId: string,
    categories: string[],
    tags: string[],
    priceRangeFilters: { min_price: number; max_price: number }[],
    tagGroupMapping: Map<string, string>
  ): Promise<StorefrontTagValue[]> {
    const values: unknown[] = [tagGroupId]
    let paramIndex = 2
    const subqueryJoins: string[] = []
    const subqueryConditions: string[] = [`p.status = 'active'`]

    // Category filter
    if (categories.length > 0) {
      subqueryJoins.push(
        `INNER JOIN product_categories pc_filter ON pc_filter.product_id = p.id AND pc_filter.category_id = ANY($${paramIndex})`
      )
      values.push(categories)
      paramIndex++
    }

    // Tag filter — only tags from OTHER groups (cross-filter), AND between groups
    const otherGroupTags = tags.filter((tagId) => tagGroupMapping.get(tagId) !== tagGroupId)
    if (otherGroupTags.length > 0) {
      const tagsByGroup = this.groupTagsByGroup(otherGroupTags, tagGroupMapping)
      paramIndex = this.addTagGroupJoins(tagsByGroup, subqueryJoins, values, paramIndex)
    }

    // Price range filter
    if (priceRangeFilters.length > 0) {
      const priceClause = this.buildPriceRangeWhereClause(
        priceRangeFilters,
        'p',
        values,
        paramIndex
      )
      subqueryConditions.push(priceClause.sql)
      paramIndex = priceClause.nextIndex
    }

    const query = `
      SELECT t.id, t.name, t.slug, t.filter_display_name AS display_name,
             t.media_url, t.media_alt_text,
             COUNT(DISTINCT fp.product_id) AS count
      FROM tags t
      LEFT JOIN (
        SELECT pt.tag_id, pt.product_id
        FROM product_tags pt
        INNER JOIN products p ON p.id = pt.product_id
        ${subqueryJoins.join('\n')}
        WHERE ${subqueryConditions.join(' AND ')}
      ) fp ON fp.tag_id = t.id
      WHERE t.tag_group_id = $1 AND t.status = TRUE AND t.is_filterable = TRUE
      GROUP BY t.id, t.name, t.slug, t.filter_display_name, t.media_url, t.media_alt_text, t.rank
      ORDER BY t.rank ASC, t.name ASC
    `

    const result = await db.query(query, values)

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      display_name: row.display_name,
      media_url: row.media_url,
      media_alt_text: row.media_alt_text,
      count: Number(row.count),
    }))
  }

  /**
   * Price range counts — cross-filter: exclude price range filter, apply categories + tags
   *
   * Uses subquery approach: build a subquery of filtered products, then LEFT JOIN
   * price ranges to it. This ensures ALL price ranges always appear (even with count 0).
   */
  private async getPriceRangeCounts(
    categories: string[],
    tags: string[],
    tagGroupMapping: Map<string, string>
  ): Promise<StorefrontPriceValue[]> {
    const values: unknown[] = []
    let paramIndex = 1
    const subqueryJoins: string[] = []
    const subqueryConditions: string[] = [`p.status = 'active'`]

    // Category filter
    if (categories.length > 0) {
      subqueryJoins.push(
        `INNER JOIN product_categories pc_filter ON pc_filter.product_id = p.id AND pc_filter.category_id = ANY($${paramIndex})`
      )
      values.push(categories)
      paramIndex++
    }

    // Tag filter — AND between groups, OR within group
    if (tags.length > 0) {
      const tagsByGroup = this.groupTagsByGroup(tags, tagGroupMapping)
      paramIndex = this.addTagGroupJoins(tagsByGroup, subqueryJoins, values, paramIndex)
    }

    const query = `
      SELECT pfr.id, pfr.display_name, pfr.min_price, pfr.max_price,
             pfr.media_url, pfr.media_alt_text,
             COUNT(DISTINCT fp.id) AS count
      FROM price_filter_ranges pfr
      LEFT JOIN (
        SELECT p.id, p.min_price, p.max_price
        FROM products p
        ${subqueryJoins.join('\n')}
        WHERE ${subqueryConditions.join(' AND ')}
      ) fp ON fp.min_price <= pfr.max_price AND fp.max_price >= pfr.min_price
      WHERE pfr.status = TRUE
      GROUP BY pfr.id, pfr.display_name, pfr.min_price, pfr.max_price,
               pfr.media_url, pfr.media_alt_text, pfr.rank
      ORDER BY pfr.rank ASC
    `

    const result = await db.query(query, values)

    return result.rows.map((row: any) => ({
      id: row.id,
      display_name: row.display_name,
      min_price: row.min_price,
      max_price: row.max_price,
      media_url: row.media_url,
      media_alt_text: row.media_alt_text,
      count: Number(row.count),
    }))
  }

  /**
   * Fetch active sort-by options
   */
  private async getSortByOptions(): Promise<StorefrontSortByOption[]> {
    const result = await db.query(
      `SELECT key, label FROM sort_by_options WHERE is_active = TRUE ORDER BY rank ASC`
    )
    return result.rows
  }
}

export const storefrontFiltersService = new StorefrontFiltersService()
