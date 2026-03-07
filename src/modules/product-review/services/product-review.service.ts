import { db } from '../../../lib/db'
import { productReviewMessages } from '../config/product-review.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  ProductReview,
  ProductReviewListResponse,
  CreateProductReviewRequest,
  UpdateProductReviewRequest,
  StorefrontReviewResponse,
} from '../types/product-review.types'

export const productReviewService = {
  // List all reviews with product info (admin)
  async list(): Promise<ProductReviewListResponse> {
    const result = await db.query(
      `SELECT
        pr.id, pr.product_id, p.name AS product_name, p.base_sku AS product_sku,
        pr.type, pr.customer_name, pr.title, pr.rating,
        pr.status, pr.approval_status, pr.review_date, pr.created_at
       FROM product_reviews pr
       JOIN products p ON pr.product_id = p.id
       ORDER BY pr.created_at DESC`
    )

    return { items: result.rows }
  },

  // Get single review by ID
  async getById(id: string): Promise<ProductReview> {
    const result = await db.query(
      `SELECT id, product_id, type, user_id, order_id, customer_name, customer_image_path,
              title, rating, description, order_date, review_date, media, metadata,
              status, approval_status, created_at, updated_at
       FROM product_reviews
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(productReviewMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create system-generated review
  async create(data: CreateProductReviewRequest): Promise<ProductReview> {
    // Validate product exists
    const product = await db.query(
      `SELECT id FROM products WHERE id = $1`,
      [data.product_id]
    )

    if (product.rows.length === 0) {
      throw new AppError(productReviewMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate dates
    const orderDate = new Date(data.order_date)
    const reviewDate = new Date(data.review_date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (orderDate > today) {
      throw new AppError(productReviewMessages.ORDER_DATE_FUTURE, HTTP_STATUS.BAD_REQUEST)
    }

    if (reviewDate < orderDate) {
      throw new AppError(productReviewMessages.REVIEW_DATE_BEFORE_ORDER, HTTP_STATUS.BAD_REQUEST)
    }

    const result = await db.query(
      `INSERT INTO product_reviews (
        product_id, type, customer_name, customer_image_path,
        title, rating, description, order_date, review_date,
        media, metadata, status, approval_status
       )
       VALUES ($1, 'system', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved')
       RETURNING id, product_id, type, user_id, order_id, customer_name, customer_image_path,
                 title, rating, description, order_date, review_date, media, metadata,
                 status, approval_status, created_at, updated_at`,
      [
        data.product_id,
        data.customer_name,
        data.customer_image_path || null,
        data.title,
        data.rating,
        data.description,
        data.order_date,
        data.review_date,
        JSON.stringify(data.media || []),
        JSON.stringify(data.metadata || {}),
        data.status ?? true,
      ]
    )

    const review = result.rows[0]

    // Recalculate stats
    await this.recalculateStats(data.product_id)

    return review
  },

  // Update system-generated review only
  async update(id: string, data: UpdateProductReviewRequest): Promise<ProductReview> {
    const existing = await this.getById(id)

    if (existing.type === 'user') {
      throw new AppError(productReviewMessages.CANNOT_EDIT_USER_REVIEW, HTTP_STATUS.FORBIDDEN)
    }

    // Validate dates if provided
    const orderDate = data.order_date ? new Date(data.order_date) : (existing.order_date ? new Date(existing.order_date) : null)
    const reviewDate = data.review_date ? new Date(data.review_date) : new Date(existing.review_date)

    if (data.order_date) {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (orderDate && orderDate > today) {
        throw new AppError(productReviewMessages.ORDER_DATE_FUTURE, HTTP_STATUS.BAD_REQUEST)
      }
    }

    if (orderDate && reviewDate < orderDate) {
      throw new AppError(productReviewMessages.REVIEW_DATE_BEFORE_ORDER, HTTP_STATUS.BAD_REQUEST)
    }

    // Build dynamic update
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.customer_name !== undefined) {
      updates.push(`customer_name = $${paramIndex++}`)
      values.push(data.customer_name)
    }
    if (data.customer_image_path !== undefined) {
      updates.push(`customer_image_path = $${paramIndex++}`)
      values.push(data.customer_image_path)
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      values.push(data.title)
    }
    if (data.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`)
      values.push(data.rating)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.order_date !== undefined) {
      updates.push(`order_date = $${paramIndex++}`)
      values.push(data.order_date)
    }
    if (data.review_date !== undefined) {
      updates.push(`review_date = $${paramIndex++}`)
      values.push(data.review_date)
    }
    if (data.media !== undefined) {
      updates.push(`media = $${paramIndex++}`)
      values.push(JSON.stringify(data.media))
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`)
      values.push(JSON.stringify(data.metadata))
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
    }

    if (updates.length === 0) {
      return existing
    }

    values.push(id)

    await db.query(
      `UPDATE product_reviews
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Recalculate stats if rating or status changed
    if (data.rating !== undefined || data.status !== undefined) {
      await this.recalculateStats(existing.product_id)
    }

    return this.getById(id)
  },

  // Update approval status (user reviews only)
  async updateApproval(id: string, approvalStatus: 'approved' | 'rejected'): Promise<ProductReview> {
    const existing = await this.getById(id)

    if (existing.type === 'system') {
      throw new AppError(productReviewMessages.CANNOT_CHANGE_SYSTEM_APPROVAL, HTTP_STATUS.BAD_REQUEST)
    }

    await db.query(
      `UPDATE product_reviews SET approval_status = $1 WHERE id = $2`,
      [approvalStatus, id]
    )

    // Recalculate stats since approval affects visibility
    await this.recalculateStats(existing.product_id)

    return this.getById(id)
  },

  // Toggle status
  async updateStatus(id: string, status: boolean): Promise<ProductReview> {
    const existing = await this.getById(id)

    await db.query(
      `UPDATE product_reviews SET status = $1 WHERE id = $2`,
      [status, id]
    )

    // Recalculate stats since status affects visibility
    await this.recalculateStats(existing.product_id)

    return this.getById(id)
  },

  // Delete review
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)

    const result = await db.query(
      `DELETE FROM product_reviews WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(productReviewMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Recalculate stats after deletion
    await this.recalculateStats(existing.product_id)
  },

  // Recalculate stats for a product
  async recalculateStats(productId: string): Promise<void> {
    // Check if any approved active reviews exist
    const countResult = await db.query(
      `SELECT COUNT(*) as cnt FROM product_reviews
       WHERE product_id = $1 AND status = true AND approval_status = 'approved'`,
      [productId]
    )

    const count = parseInt(countResult.rows[0].cnt, 10)

    if (count === 0) {
      // Reset stats to zero
      await db.query(
        `INSERT INTO product_review_stats (product_id, average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5, updated_at)
         VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NOW())
         ON CONFLICT (product_id)
         DO UPDATE SET average_rating = 0, total_reviews = 0, rating_1 = 0, rating_2 = 0, rating_3 = 0, rating_4 = 0, rating_5 = 0, updated_at = NOW()`,
        [productId]
      )
      return
    }

    await db.query(
      `INSERT INTO product_review_stats (product_id, average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5, updated_at)
       SELECT
         product_id,
         COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
         COUNT(*),
         COUNT(*) FILTER (WHERE rating = 1),
         COUNT(*) FILTER (WHERE rating = 2),
         COUNT(*) FILTER (WHERE rating = 3),
         COUNT(*) FILTER (WHERE rating = 4),
         COUNT(*) FILTER (WHERE rating = 5),
         NOW()
       FROM product_reviews
       WHERE product_id = $1 AND status = true AND approval_status = 'approved'
       GROUP BY product_id
       ON CONFLICT (product_id)
       DO UPDATE SET
         average_rating = EXCLUDED.average_rating,
         total_reviews = EXCLUDED.total_reviews,
         rating_1 = EXCLUDED.rating_1,
         rating_2 = EXCLUDED.rating_2,
         rating_3 = EXCLUDED.rating_3,
         rating_4 = EXCLUDED.rating_4,
         rating_5 = EXCLUDED.rating_5,
         updated_at = NOW()`,
      [productId]
    )
  },

  // Storefront: get reviews by product SKU
  async getByProductSku(sku: string): Promise<StorefrontReviewResponse> {
    // Get product by SKU
    const productResult = await db.query(
      `SELECT id FROM products WHERE base_sku = $1 AND status = 'active'`,
      [sku]
    )

    if (productResult.rows.length === 0) {
      return {
        stats: { average_rating: 0, total_reviews: 0, rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0 },
        reviews: [],
      }
    }

    const productId = productResult.rows[0].id

    // Get stats
    const statsResult = await db.query(
      `SELECT average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5
       FROM product_review_stats
       WHERE product_id = $1`,
      [productId]
    )

    const stats = statsResult.rows.length > 0
      ? statsResult.rows[0]
      : { average_rating: 0, total_reviews: 0, rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0 }

    // Get approved active reviews (no type field exposed)
    const reviewsResult = await db.query(
      `SELECT id, customer_name, customer_image_path, title, rating, description, review_date, media
       FROM product_reviews
       WHERE product_id = $1 AND status = true AND approval_status = 'approved'
       ORDER BY review_date DESC`,
      [productId]
    )

    return {
      stats: {
        average_rating: parseFloat(stats.average_rating) || 0,
        total_reviews: parseInt(stats.total_reviews, 10) || 0,
        rating_1: parseInt(stats.rating_1, 10) || 0,
        rating_2: parseInt(stats.rating_2, 10) || 0,
        rating_3: parseInt(stats.rating_3, 10) || 0,
        rating_4: parseInt(stats.rating_4, 10) || 0,
        rating_5: parseInt(stats.rating_5, 10) || 0,
      },
      reviews: reviewsResult.rows,
    }
  },

  // Get products for review dropdown
  async getProductsForDropdown(): Promise<{ id: string; name: string; base_sku: string }[]> {
    const result = await db.query(
      `SELECT id, name, base_sku FROM products WHERE status = 'active' ORDER BY name`
    )
    return result.rows
  },
}
