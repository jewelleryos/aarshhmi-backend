import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { gemstonePricingMessages } from '../config/gemstone-pricing.messages'
import { csvUtils } from '../utils/csv-utils'
import { bulkCreateRowSchema, bulkUpdateRowSchema, BULK_FILE_CONSTRAINTS } from '../config/gemstone-pricing.bulk.schema'
import { fromSmallestUnit, toSmallestUnit } from '../../../utils/currency'
import { AppError } from '../../../utils/app-error'
import type {
  GemstonePriceFilters,
  CREATE_HEADERS,
  UPDATE_HEADERS,
  BulkCreateResult,
  BulkCreateError,
  BulkCreateErrorItem,
  BulkUpdateResult,
  BulkUpdateFailedItem,
  BulkUpdateWarningItem,
  ReferenceDataRow,
  GemstonePriceExportRow,
} from '../types/gemstone-pricing.types'

// Custom error class for bulk create validation errors
export class BulkCreateValidationError extends Error {
  constructor(public details: BulkCreateError) {
    super(gemstonePricingMessages.BULK_CREATE_FAILED)
    this.name = 'BulkCreateValidationError'
  }
}

// Expected headers
const CREATE_HEADERS_ARRAY = ['gemstone_type', 'shape', 'quality', 'color', 'from', 'to', 'price'] as const
const UPDATE_HEADERS_ARRAY = ['id', 'gemstone_type', 'shape', 'quality', 'color', 'from', 'to', 'price'] as const

export const gemstonePricingBulkService = {
  // ============ DOWNLOAD METHODS ============

  /**
   * Generate template CSV for bulk create
   * Contains headers and one example row
   */
  generateTemplate(): string {
    const exampleRow = {
      gemstone_type: 'emerald',
      shape: 'oval',
      quality: 'aaa',
      color: 'green',
      from: '0.0000',
      to: '1.0000',
      price: '15000.00',
    }

    return csvUtils.createCsv([exampleRow], [...CREATE_HEADERS_ARRAY])
  },

  /**
   * Generate reference data CSV with available gemstone types, shapes, qualities, and colors
   * All filtered by GEMSTONE group except shapes (shared across all groups)
   */
  async generateReferenceData(): Promise<string> {
    // Fetch gemstone types (filtered by GEMSTONE group)
    const typesResult = await db.query(
      `SELECT name, slug FROM stone_types WHERE stone_group_id = $1 AND status = true ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    const types = typesResult.rows

    // Fetch all active shapes (shared across all stone groups)
    const shapesResult = await db.query(
      `SELECT name, slug FROM stone_shapes WHERE status = true ORDER BY name`
    )
    const shapes = shapesResult.rows

    // Fetch gemstone qualities (filtered by GEMSTONE group)
    const qualitiesResult = await db.query(
      `SELECT name, slug FROM stone_qualities WHERE stone_group_id = $1 AND status = true ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    const qualities = qualitiesResult.rows

    // Fetch gemstone colors (filtered by GEMSTONE group)
    const colorsResult = await db.query(
      `SELECT name, slug FROM stone_colors WHERE stone_group_id = $1 AND status = true ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    const colors = colorsResult.rows

    // Combine into reference data (side by side)
    const maxRows = Math.max(types.length, shapes.length, qualities.length, colors.length)
    const referenceData: ReferenceDataRow[] = []

    for (let i = 0; i < maxRows; i++) {
      referenceData.push({
        gemstone_type_name: types[i]?.name || '',
        gemstone_type_slug: types[i]?.slug || '',
        shape_name: shapes[i]?.name || '',
        shape_slug: shapes[i]?.slug || '',
        quality_name: qualities[i]?.name || '',
        quality_slug: qualities[i]?.slug || '',
        color_name: colors[i]?.name || '',
        color_slug: colors[i]?.slug || '',
      })
    }

    return csvUtils.createCsv(referenceData, [
      'gemstone_type_name',
      'gemstone_type_slug',
      'shape_name',
      'shape_slug',
      'quality_name',
      'quality_slug',
      'color_name',
      'color_slug',
    ])
  },

  /**
   * Export current prices to CSV format
   * Used for bulk update - includes IDs
   */
  async exportToCsv(filters?: GemstonePriceFilters): Promise<string> {
    let query = `
      SELECT
        sp.id,
        st.slug as gemstone_type,
        ss.slug as shape,
        sq.slug as quality,
        sc.slug as color,
        sp.ct_from as from,
        sp.ct_to as to,
        sp.price
      FROM stone_prices sp
      INNER JOIN stone_types st ON sp.stone_type_id = st.id
      INNER JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      INNER JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      INNER JOIN stone_colors sc ON sp.stone_color_id = sc.id
      WHERE sp.stone_group_id = $1
    `
    const params: unknown[] = [STONE_GROUPS.GEMSTONE]
    let paramIndex = 2

    if (filters?.stone_type_id) {
      query += ` AND sp.stone_type_id = $${paramIndex++}`
      params.push(filters.stone_type_id)
    }

    if (filters?.stone_shape_id) {
      query += ` AND sp.stone_shape_id = $${paramIndex++}`
      params.push(filters.stone_shape_id)
    }

    if (filters?.stone_quality_id) {
      query += ` AND sp.stone_quality_id = $${paramIndex++}`
      params.push(filters.stone_quality_id)
    }

    if (filters?.stone_color_id) {
      query += ` AND sp.stone_color_id = $${paramIndex++}`
      params.push(filters.stone_color_id)
    }

    query += ` ORDER BY st.name, sq.name, sc.name, ss.name, sp.ct_from`

    const result = await db.query(query, params)

    // Convert to export format
    const exportData: GemstonePriceExportRow[] = result.rows.map((row) => ({
      id: row.id,
      gemstone_type: row.gemstone_type,
      shape: row.shape,
      quality: row.quality,
      color: row.color,
      from: parseFloat(row.from),
      to: parseFloat(row.to),
      price: fromSmallestUnit(row.price), // Convert from paise to rupees
    }))

    return csvUtils.createCsv(exportData, [...UPDATE_HEADERS_ARRAY])
  },

  // ============ LOOKUP METHODS ============

  /**
   * Get all gemstone types as map { slug -> id }
   */
  async getGemstoneTypeMap(): Promise<Map<string, string>> {
    const result = await db.query(
      `SELECT id, slug FROM stone_types WHERE stone_group_id = $1 AND status = true`,
      [STONE_GROUPS.GEMSTONE]
    )
    const map = new Map<string, string>()
    result.rows.forEach((row) => map.set(row.slug, row.id))
    return map
  },

  /**
   * Get all shapes as map { slug -> id }
   */
  async getShapeMap(): Promise<Map<string, string>> {
    const result = await db.query(
      `SELECT id, slug FROM stone_shapes WHERE status = true`
    )
    const map = new Map<string, string>()
    result.rows.forEach((row) => map.set(row.slug, row.id))
    return map
  },

  /**
   * Get all gemstone qualities as map { slug -> id }
   */
  async getQualityMap(): Promise<Map<string, string>> {
    const result = await db.query(
      `SELECT id, slug FROM stone_qualities WHERE stone_group_id = $1 AND status = true`,
      [STONE_GROUPS.GEMSTONE]
    )
    const map = new Map<string, string>()
    result.rows.forEach((row) => map.set(row.slug, row.id))
    return map
  },

  /**
   * Get all gemstone colors as map { slug -> id }
   */
  async getColorMap(): Promise<Map<string, string>> {
    const result = await db.query(
      `SELECT id, slug FROM stone_colors WHERE stone_group_id = $1 AND status = true`,
      [STONE_GROUPS.GEMSTONE]
    )
    const map = new Map<string, string>()
    result.rows.forEach((row) => map.set(row.slug, row.id))
    return map
  },

  /**
   * Check if duplicate entry exists
   * Returns the existing ID if found, null otherwise
   */
  async findDuplicate(
    typeId: string,
    shapeId: string,
    qualityId: string,
    colorId: string,
    ctFrom: number,
    ctTo: number,
    excludeId?: string
  ): Promise<string | null> {
    let query = `
      SELECT id FROM stone_prices
      WHERE stone_group_id = $1
        AND stone_type_id = $2
        AND stone_shape_id = $3
        AND stone_quality_id = $4
        AND stone_color_id = $5
        AND ct_from = $6 AND ct_to = $7
    `
    const params: unknown[] = [
      STONE_GROUPS.GEMSTONE,
      typeId,
      shapeId,
      qualityId,
      colorId,
      ctFrom,
      ctTo,
    ]

    if (excludeId) {
      query += ` AND id != $8`
      params.push(excludeId)
    }

    const result = await db.query(query, params)
    return result.rows.length > 0 ? result.rows[0].id : null
  },

  /**
   * Get price entry by ID with all slugs
   */
  async getPriceById(id: string): Promise<{
    id: string
    stone_type_id: string
    stone_shape_id: string
    stone_quality_id: string
    stone_color_id: string
    type_slug: string
    shape_slug: string
    quality_slug: string
    color_slug: string
    ct_from: number
    ct_to: number
    price: number
  } | null> {
    const result = await db.query(
      `SELECT
        sp.id, sp.stone_type_id, sp.stone_shape_id, sp.stone_quality_id, sp.stone_color_id,
        sp.ct_from, sp.ct_to, sp.price,
        st.slug as type_slug,
        ss.slug as shape_slug,
        sq.slug as quality_slug,
        sc.slug as color_slug
       FROM stone_prices sp
       INNER JOIN stone_types st ON sp.stone_type_id = st.id
       INNER JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
       INNER JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
       INNER JOIN stone_colors sc ON sp.stone_color_id = sc.id
       WHERE sp.id = $1 AND sp.stone_group_id = $2`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }
  },

  // ============ BULK CREATE ============

  /**
   * Process bulk create from CSV file
   * All-or-nothing: if any row fails validation, entire file is rejected
   */
  async processBulkCreate(file: File): Promise<BulkCreateResult> {
    // Read file content
    const buffer = await file.arrayBuffer()
    const { headers, rows } = csvUtils.readCsv(buffer)

    // Validate headers
    csvUtils.validateHeaders(headers, CREATE_HEADERS_ARRAY)

    // Check for empty file
    if (rows.length === 0) {
      throw new AppError(gemstonePricingMessages.FILE_EMPTY, 400)
    }

    // Check row limit
    if (rows.length > BULK_FILE_CONSTRAINTS.MAX_ROWS) {
      throw new AppError(gemstonePricingMessages.TOO_MANY_ROWS, 400)
    }

    // Pre-fetch lookup maps
    const typeMap = await this.getGemstoneTypeMap()
    const shapeMap = await this.getShapeMap()
    const qualityMap = await this.getQualityMap()
    const colorMap = await this.getColorMap()

    // PHASE 1: Validate ALL rows first
    const errors: BulkCreateErrorItem[] = []
    const validatedRows: Array<{
      rowNumber: number
      typeId: string
      shapeId: string
      qualityId: string
      colorId: string
      typeSlug: string
      shapeSlug: string
      qualitySlug: string
      colorSlug: string
      ctFrom: number
      ctTo: number
      price: number
    }> = []

    // Track duplicates within the file itself
    const seenCombinations = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2 // 1-indexed, plus 1 for header row
      const row = rows[i]

      // Parse values
      const typeSlug = csvUtils.parseString(row['gemstone_type'])
      const shapeSlug = csvUtils.parseString(row['shape'])
      const qualitySlug = csvUtils.parseString(row['quality'])
      const colorSlug = csvUtils.parseString(row['color'])
      const ctFrom = csvUtils.parseNumber(row['from'])
      const ctTo = csvUtils.parseNumber(row['to'])
      const price = csvUtils.parseNumber(row['price'])

      // Validate with Zod schema
      const parseResult = bulkCreateRowSchema.safeParse({
        gemstone_type: typeSlug,
        shape: shapeSlug,
        quality: qualitySlug,
        color: colorSlug,
        from: ctFrom,
        to: ctTo,
        price: price,
      })

      if (!parseResult.success) {
        const errorMessages = parseResult.error.issues.map((e) => e.message).join('; ')
        errors.push({
          row: rowNumber,
          error: errorMessages,
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate gemstone type slug exists
      const typeId = typeMap.get(typeSlug)
      if (!typeId) {
        errors.push({
          row: rowNumber,
          error: gemstonePricingMessages.INVALID_GEMSTONE_TYPE_SLUG.replace('{slug}', typeSlug),
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate shape slug exists
      const shapeId = shapeMap.get(shapeSlug)
      if (!shapeId) {
        errors.push({
          row: rowNumber,
          error: gemstonePricingMessages.INVALID_SHAPE_SLUG.replace('{slug}', shapeSlug),
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate quality slug exists
      const qualityId = qualityMap.get(qualitySlug)
      if (!qualityId) {
        errors.push({
          row: rowNumber,
          error: gemstonePricingMessages.INVALID_QUALITY_SLUG.replace('{slug}', qualitySlug),
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate color slug exists
      const colorId = colorMap.get(colorSlug)
      if (!colorId) {
        errors.push({
          row: rowNumber,
          error: gemstonePricingMessages.INVALID_COLOR_SLUG.replace('{slug}', colorSlug),
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Check for duplicate within file
      const combinationKey = `${typeId}:${shapeId}:${qualityId}:${colorId}:${ctFrom}:${ctTo}`
      if (seenCombinations.has(combinationKey)) {
        errors.push({
          row: rowNumber,
          error: `Duplicate entry in file for ${typeSlug} + ${shapeSlug} + ${qualitySlug} + ${colorSlug} + ${ctFrom}-${ctTo}`,
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }
      seenCombinations.add(combinationKey)

      // Check for duplicate in database
      const existingId = await this.findDuplicate(typeId, shapeId, qualityId, colorId, ctFrom, ctTo)
      if (existingId) {
        errors.push({
          row: rowNumber,
          error: gemstonePricingMessages.DUPLICATE_EXISTS
            .replace('{type}', typeSlug)
            .replace('{shape}', shapeSlug)
            .replace('{quality}', qualitySlug)
            .replace('{color}', colorSlug)
            .replace('{from}', ctFrom.toString())
            .replace('{to}', ctTo.toString()),
          data: { gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Row is valid
      validatedRows.push({
        rowNumber,
        typeId,
        shapeId,
        qualityId,
        colorId,
        typeSlug,
        shapeSlug,
        qualitySlug,
        colorSlug,
        ctFrom,
        ctTo,
        price,
      })
    }

    // If any errors, reject entire file
    if (errors.length > 0) {
      throw new BulkCreateValidationError({
        total_rows: rows.length,
        error_count: errors.length,
        errors,
      })
    }

    // PHASE 2: Insert ALL rows in single transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const created: BulkCreateResult['created'] = []

      for (const row of validatedRows) {
        const priceInPaise = toSmallestUnit(row.price)

        const result = await client.query(
          `INSERT INTO stone_prices (
            stone_group_id, stone_type_id, stone_shape_id, stone_quality_id,
            stone_color_id, ct_from, ct_to, price, status, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, '{}')
          RETURNING id`,
          [
            STONE_GROUPS.GEMSTONE,
            row.typeId,
            row.shapeId,
            row.qualityId,
            row.colorId,
            row.ctFrom,
            row.ctTo,
            priceInPaise,
          ]
        )

        created.push({
          row: row.rowNumber,
          id: result.rows[0].id,
          gemstone_type: row.typeSlug,
          shape: row.shapeSlug,
          quality: row.qualitySlug,
          color: row.colorSlug,
          from: row.ctFrom,
          to: row.ctTo,
          price: priceInPaise, // Return in paise for consistency
        })
      }

      await client.query('COMMIT')

      return {
        created_count: created.length,
        created,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // ============ BULK UPDATE ============

  /**
   * Process bulk update from CSV file
   * Row-by-row: partial success allowed
   */
  async processBulkUpdate(file: File): Promise<BulkUpdateResult> {
    // Read file content
    const buffer = await file.arrayBuffer()
    const { headers, rows } = csvUtils.readCsv(buffer)

    // Validate headers
    csvUtils.validateHeaders(headers, UPDATE_HEADERS_ARRAY)

    // Check for empty file
    if (rows.length === 0) {
      throw new AppError(gemstonePricingMessages.FILE_EMPTY, 400)
    }

    // Check row limit
    if (rows.length > BULK_FILE_CONSTRAINTS.MAX_ROWS) {
      throw new AppError(gemstonePricingMessages.TOO_MANY_ROWS, 400)
    }

    // Process each row independently
    const failed: BulkUpdateFailedItem[] = []
    const warnings: BulkUpdateWarningItem[] = []
    let updatedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2 // 1-indexed, plus 1 for header row
      const row = rows[i]

      // Parse values
      const id = csvUtils.parseString(row['id'])
      const typeSlug = csvUtils.parseString(row['gemstone_type'])
      const shapeSlug = csvUtils.parseString(row['shape'])
      const qualitySlug = csvUtils.parseString(row['quality'])
      const colorSlug = csvUtils.parseString(row['color'])
      const ctFrom = csvUtils.parseNumber(row['from'])
      const ctTo = csvUtils.parseNumber(row['to'])
      const price = csvUtils.parseNumber(row['price'])

      // Validate with Zod schema
      const parseResult = bulkUpdateRowSchema.safeParse({
        id,
        gemstone_type: typeSlug,
        shape: shapeSlug,
        quality: qualitySlug,
        color: colorSlug,
        from: ctFrom,
        to: ctTo,
        price,
      })

      if (!parseResult.success) {
        const errorMessages = parseResult.error.issues.map((e) => e.message).join('; ')
        failed.push({
          row: rowNumber,
          error: errorMessages,
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, price },
        })
        continue
      }

      // Find existing record
      const existing = await this.getPriceById(id)
      if (!existing) {
        failed.push({
          row: rowNumber,
          error: gemstonePricingMessages.PRICE_NOT_FOUND.replace('{id}', id),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, price },
        })
        continue
      }

      // Check for mismatches and generate warnings
      if (existing.type_slug !== typeSlug) {
        warnings.push({
          row: rowNumber,
          warning: gemstonePricingMessages.TYPE_MISMATCH
            .replace('{csv}', typeSlug)
            .replace('{db}', existing.type_slug),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug },
        })
      }

      if (existing.shape_slug !== shapeSlug) {
        warnings.push({
          row: rowNumber,
          warning: gemstonePricingMessages.SHAPE_MISMATCH
            .replace('{csv}', shapeSlug)
            .replace('{db}', existing.shape_slug),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug },
        })
      }

      if (existing.quality_slug !== qualitySlug) {
        warnings.push({
          row: rowNumber,
          warning: gemstonePricingMessages.QUALITY_MISMATCH
            .replace('{csv}', qualitySlug)
            .replace('{db}', existing.quality_slug),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug },
        })
      }

      if (existing.color_slug !== colorSlug) {
        warnings.push({
          row: rowNumber,
          warning: gemstonePricingMessages.COLOR_MISMATCH
            .replace('{csv}', colorSlug)
            .replace('{db}', existing.color_slug),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug },
        })
      }

      if (existing.ct_from !== ctFrom || existing.ct_to !== ctTo) {
        warnings.push({
          row: rowNumber,
          warning: gemstonePricingMessages.CARAT_MISMATCH
            .replace('{csvFrom}', ctFrom.toString())
            .replace('{csvTo}', ctTo.toString())
            .replace('{dbFrom}', existing.ct_from.toString())
            .replace('{dbTo}', existing.ct_to.toString()),
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug },
        })
      }

      // Update ONLY the price field
      try {
        const priceInPaise = toSmallestUnit(price)
        await db.query(`UPDATE stone_prices SET price = $1 WHERE id = $2`, [priceInPaise, id])
        updatedCount++
      } catch (error) {
        failed.push({
          row: rowNumber,
          error: `Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: { id, gemstone_type: typeSlug, shape: shapeSlug, quality: qualitySlug, color: colorSlug, price },
        })
      }
    }

    return {
      summary: {
        total: rows.length,
        updated: updatedCount,
        failed: failed.length,
      },
      failed,
      warnings,
    }
  },
}
