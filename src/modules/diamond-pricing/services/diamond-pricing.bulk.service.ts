import { db } from '../../../lib/db'
import { STONE_GROUPS, STONE_TYPES } from '../../../config/stone.config'
import { diamondPricingMessages } from '../config/diamond-pricing.messages'
import { csvUtils } from '../utils/csv-utils'
import { bulkCreateRowSchema, bulkUpdateRowSchema, BULK_FILE_CONSTRAINTS } from '../config/diamond-pricing.bulk.schema'
import { fromSmallestUnit, toSmallestUnit } from '../../../utils/currency'
import { AppError } from '../../../utils/app-error'
import type {
  DiamondPriceFilters,
  CREATE_HEADERS,
  UPDATE_HEADERS,
  BulkCreateResult,
  BulkCreateError,
  BulkCreateErrorItem,
  BulkUpdateResult,
  BulkUpdateFailedItem,
  BulkUpdateWarningItem,
  ReferenceDataRow,
  DiamondPriceExportRow,
} from '../types/diamond-pricing.types'

// Custom error class for bulk create validation errors
export class BulkCreateValidationError extends Error {
  constructor(public details: BulkCreateError) {
    super(diamondPricingMessages.BULK_CREATE_FAILED)
    this.name = 'BulkCreateValidationError'
  }
}

// Expected headers
const CREATE_HEADERS_ARRAY = ['shape', 'clarity/color', 'from', 'to', 'price'] as const
const UPDATE_HEADERS_ARRAY = ['id', 'shape', 'clarity/color', 'from', 'to', 'price'] as const

export const diamondPricingBulkService = {
  // ============ DOWNLOAD METHODS ============

  /**
   * Generate template CSV for bulk create
   * Contains headers and one example row
   */
  generateTemplate(): string {
    const exampleRow = {
      shape: 'round',
      'clarity/color': 'vvs1-d',
      from: '0.0000',
      to: '0.5000',
      price: '25000.00',
    }

    return csvUtils.createCsv([exampleRow], [...CREATE_HEADERS_ARRAY])
  },

  /**
   * Generate reference data CSV with available shapes and clarity/colors
   * Shows both name and slug for user reference
   */
  async generateReferenceData(): Promise<string> {
    // Fetch all active shapes
    const shapesResult = await db.query(
      `SELECT name, slug FROM stone_shapes WHERE status = true ORDER BY name`
    )
    const shapes = shapesResult.rows

    // Fetch all active diamond clarity/colors
    const qualitiesResult = await db.query(
      `SELECT name, slug FROM stone_qualities
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.DIAMOND]
    )
    const qualities = qualitiesResult.rows

    // Combine into reference data (side by side)
    const maxRows = Math.max(shapes.length, qualities.length)
    const referenceData: ReferenceDataRow[] = []

    for (let i = 0; i < maxRows; i++) {
      referenceData.push({
        shape_name: shapes[i]?.name || '',
        shape_slug: shapes[i]?.slug || '',
        clarity_color_name: qualities[i]?.name || '',
        clarity_color_slug: qualities[i]?.slug || '',
      })
    }

    return csvUtils.createCsv(referenceData, [
      'shape_name',
      'shape_slug',
      'clarity_color_name',
      'clarity_color_slug',
    ])
  },

  /**
   * Export current prices to CSV format
   * Used for bulk update - includes IDs
   */
  async exportToCsv(filters?: DiamondPriceFilters): Promise<string> {
    let query = `
      SELECT
        sp.id,
        ss.slug as shape,
        sq.slug as quality,
        sp.ct_from as from,
        sp.ct_to as to,
        sp.price
      FROM stone_prices sp
      INNER JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      INNER JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      WHERE sp.stone_group_id = $1 AND sp.stone_type_id = $2
    `
    const params: unknown[] = [STONE_GROUPS.DIAMOND, STONE_TYPES.LAB_GROWN_DIAMOND]
    let paramIndex = 3

    if (filters?.stone_shape_id) {
      query += ` AND sp.stone_shape_id = $${paramIndex++}`
      params.push(filters.stone_shape_id)
    }

    if (filters?.stone_quality_id) {
      query += ` AND sp.stone_quality_id = $${paramIndex++}`
      params.push(filters.stone_quality_id)
    }

    query += ` ORDER BY sq.name, ss.name, sp.ct_from`

    const result = await db.query(query, params)

    // Convert to export format
    const exportData: DiamondPriceExportRow[] = result.rows.map((row) => ({
      id: row.id,
      shape: row.shape,
      'clarity/color': row.quality,
      from: parseFloat(row.from),
      to: parseFloat(row.to),
      price: fromSmallestUnit(row.price), // Convert from paise to rupees
    }))

    return csvUtils.createCsv(exportData, [...UPDATE_HEADERS_ARRAY])
  },

  // ============ LOOKUP METHODS ============

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
   * Get all diamond qualities as map { slug -> id }
   */
  async getQualityMap(): Promise<Map<string, string>> {
    const result = await db.query(
      `SELECT id, slug FROM stone_qualities
       WHERE stone_group_id = $1 AND status = true`,
      [STONE_GROUPS.DIAMOND]
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
    shapeId: string,
    qualityId: string,
    ctFrom: number,
    ctTo: number,
    excludeId?: string
  ): Promise<string | null> {
    let query = `
      SELECT id FROM stone_prices
      WHERE stone_group_id = $1 AND stone_type_id = $2
        AND stone_shape_id = $3 AND stone_quality_id = $4
        AND ct_from = $5 AND ct_to = $6
        AND stone_color_id IS NULL
    `
    const params: unknown[] = [
      STONE_GROUPS.DIAMOND,
      STONE_TYPES.LAB_GROWN_DIAMOND,
      shapeId,
      qualityId,
      ctFrom,
      ctTo,
    ]

    if (excludeId) {
      query += ` AND id != $7`
      params.push(excludeId)
    }

    const result = await db.query(query, params)
    return result.rows.length > 0 ? result.rows[0].id : null
  },

  /**
   * Get price entry by ID with shape and quality slugs
   */
  async getPriceById(id: string): Promise<{
    id: string
    stone_shape_id: string
    stone_quality_id: string
    shape_slug: string
    quality_slug: string
    ct_from: number
    ct_to: number
    price: number
  } | null> {
    const result = await db.query(
      `SELECT
        sp.id, sp.stone_shape_id, sp.stone_quality_id,
        sp.ct_from, sp.ct_to, sp.price,
        ss.slug as shape_slug,
        sq.slug as quality_slug
       FROM stone_prices sp
       INNER JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
       INNER JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
       WHERE sp.id = $1 AND sp.stone_group_id = $2 AND sp.stone_type_id = $3`,
      [id, STONE_GROUPS.DIAMOND, STONE_TYPES.LAB_GROWN_DIAMOND]
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
      throw new AppError(diamondPricingMessages.FILE_EMPTY, 400)
    }

    // Check row limit
    if (rows.length > BULK_FILE_CONSTRAINTS.MAX_ROWS) {
      throw new AppError(diamondPricingMessages.TOO_MANY_ROWS, 400)
    }

    // Pre-fetch lookup maps
    const shapeMap = await this.getShapeMap()
    const qualityMap = await this.getQualityMap()

    // PHASE 1: Validate ALL rows first
    const errors: BulkCreateErrorItem[] = []
    const validatedRows: Array<{
      rowNumber: number
      shapeId: string
      qualityId: string
      shapeSlug: string
      qualitySlug: string
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
      const shapeSlug = csvUtils.parseString(row['shape'])
      const qualitySlug = csvUtils.parseString(row['clarity/color'])
      const ctFrom = csvUtils.parseNumber(row['from'])
      const ctTo = csvUtils.parseNumber(row['to'])
      const price = csvUtils.parseNumber(row['price'])

      // Validate with Zod schema
      const parseResult = bulkCreateRowSchema.safeParse({
        shape: shapeSlug,
        'clarity/color': qualitySlug,
        from: ctFrom,
        to: ctTo,
        price: price,
      })

      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map((e) => e.message).join('; ')
        errors.push({
          row: rowNumber,
          error: errorMessages,
          data: { shape: shapeSlug, clarity_color: qualitySlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate shape slug exists
      const shapeId = shapeMap.get(shapeSlug)
      if (!shapeId) {
        errors.push({
          row: rowNumber,
          error: diamondPricingMessages.INVALID_SHAPE_SLUG.replace('{slug}', shapeSlug),
          data: { shape: shapeSlug, clarity_color: qualitySlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Validate quality slug exists
      const qualityId = qualityMap.get(qualitySlug)
      if (!qualityId) {
        errors.push({
          row: rowNumber,
          error: diamondPricingMessages.INVALID_QUALITY_SLUG.replace('{slug}', qualitySlug),
          data: { shape: shapeSlug, clarity_color: qualitySlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Check for duplicate within file
      const combinationKey = `${shapeId}:${qualityId}:${ctFrom}:${ctTo}`
      if (seenCombinations.has(combinationKey)) {
        errors.push({
          row: rowNumber,
          error: `Duplicate entry in file for ${shapeSlug} + ${qualitySlug} + ${ctFrom}-${ctTo}`,
          data: { shape: shapeSlug, clarity_color: qualitySlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }
      seenCombinations.add(combinationKey)

      // Check for duplicate in database
      const existingId = await this.findDuplicate(shapeId, qualityId, ctFrom, ctTo)
      if (existingId) {
        errors.push({
          row: rowNumber,
          error: diamondPricingMessages.DUPLICATE_EXISTS
            .replace('{shape}', shapeSlug)
            .replace('{quality}', qualitySlug)
            .replace('{from}', ctFrom.toString())
            .replace('{to}', ctTo.toString()),
          data: { shape: shapeSlug, clarity_color: qualitySlug, from: ctFrom, to: ctTo, price },
        })
        continue
      }

      // Row is valid
      validatedRows.push({
        rowNumber,
        shapeId,
        qualityId,
        shapeSlug,
        qualitySlug,
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
          VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, true, '{}')
          RETURNING id`,
          [
            STONE_GROUPS.DIAMOND,
            STONE_TYPES.LAB_GROWN_DIAMOND,
            row.shapeId,
            row.qualityId,
            row.ctFrom,
            row.ctTo,
            priceInPaise,
          ]
        )

        created.push({
          row: row.rowNumber,
          id: result.rows[0].id,
          shape: row.shapeSlug,
          clarity_color: row.qualitySlug,
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
      throw new AppError(diamondPricingMessages.FILE_EMPTY, 400)
    }

    // Check row limit
    if (rows.length > BULK_FILE_CONSTRAINTS.MAX_ROWS) {
      throw new AppError(diamondPricingMessages.TOO_MANY_ROWS, 400)
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
      const shapeSlug = csvUtils.parseString(row['shape'])
      const qualitySlug = csvUtils.parseString(row['clarity/color'])
      const ctFrom = csvUtils.parseNumber(row['from'])
      const ctTo = csvUtils.parseNumber(row['to'])
      const price = csvUtils.parseNumber(row['price'])

      // Validate with Zod schema
      const parseResult = bulkUpdateRowSchema.safeParse({
        id,
        shape: shapeSlug,
        'clarity/color': qualitySlug,
        from: ctFrom,
        to: ctTo,
        price,
      })

      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map((e) => e.message).join('; ')
        failed.push({
          row: rowNumber,
          error: errorMessages,
          data: { id, shape: shapeSlug, clarity_color: qualitySlug, price },
        })
        continue
      }

      // Find existing record
      const existing = await this.getPriceById(id)
      if (!existing) {
        failed.push({
          row: rowNumber,
          error: diamondPricingMessages.PRICE_NOT_FOUND.replace('{id}', id),
          data: { id, shape: shapeSlug, clarity_color: qualitySlug, price },
        })
        continue
      }

      // Check for mismatches and generate warnings
      if (existing.shape_slug !== shapeSlug) {
        warnings.push({
          row: rowNumber,
          warning: diamondPricingMessages.SHAPE_MISMATCH
            .replace('{csv}', shapeSlug)
            .replace('{db}', existing.shape_slug),
          data: { id, shape: shapeSlug, clarity_color: qualitySlug },
        })
      }

      if (existing.quality_slug !== qualitySlug) {
        warnings.push({
          row: rowNumber,
          warning: diamondPricingMessages.QUALITY_MISMATCH
            .replace('{csv}', qualitySlug)
            .replace('{db}', existing.quality_slug),
          data: { id, shape: shapeSlug, clarity_color: qualitySlug },
        })
      }

      if (existing.ct_from !== ctFrom || existing.ct_to !== ctTo) {
        warnings.push({
          row: rowNumber,
          warning: diamondPricingMessages.CARAT_MISMATCH
            .replace('{csvFrom}', ctFrom.toString())
            .replace('{csvTo}', ctTo.toString())
            .replace('{dbFrom}', existing.ct_from.toString())
            .replace('{dbTo}', existing.ct_to.toString()),
          data: { id, shape: shapeSlug, clarity_color: qualitySlug },
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
          data: { id, shape: shapeSlug, clarity_color: qualitySlug, price },
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
