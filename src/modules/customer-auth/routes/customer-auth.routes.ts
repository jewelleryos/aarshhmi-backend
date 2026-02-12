import { Hono } from 'hono'
import { googleAuthService } from '../services/google-auth.service'
import { customerAuthService } from '../services/customer-auth.service'
import { customerAuthMessages } from '../config/customer-auth.messages'
import { customerAuthConfig } from '../config/customer-auth.config'
import { googleTokenSchema } from '../config/customer-auth.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { customerAuth } from '../middleware/customer-auth.middleware'
import type { AppEnv } from '../../../types/hono.types'
import type { AuthResponse, CustomerProfile } from '../types/customer-auth.types'

export const customerAuthRoutes = new Hono<AppEnv>()

// GET /google - Redirect to Google OAuth
customerAuthRoutes.get('/google', (c) => {
  try {
    const redirect = c.req.query('redirect') || '/'
    const authUrl = googleAuthService.getGoogleAuthUrl(redirect)
    return c.redirect(authUrl)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /google/callback - Handle Google OAuth callback
customerAuthRoutes.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const error = c.req.query('error')
    const state = c.req.query('state') || '/'

    if (error) {
      const errorUrl = new URL(`${customerAuthConfig.storefrontUrl}/login/failed`)
      errorUrl.searchParams.set('error', error)
      errorUrl.searchParams.set('redirect', state)
      return c.redirect(errorUrl.toString())
    }

    if (!code) {
      const errorUrl = new URL(`${customerAuthConfig.storefrontUrl}/auth/failed`)
      errorUrl.searchParams.set('error', 'no_code')
      errorUrl.searchParams.set('redirect', state)
      return c.redirect(errorUrl.toString())
    }

    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                      c.req.header('x-real-ip') ||
                      undefined

    const result = await googleAuthService.handleGoogleCallback(code, ipAddress)

    const redirectUrl = new URL(`${customerAuthConfig.storefrontUrl}/auth/success`)
    redirectUrl.searchParams.set('token', result.token)
    redirectUrl.searchParams.set('is_new_user', String(result.response.is_new_user))
    redirectUrl.searchParams.set('redirect', state)

    return c.redirect(redirectUrl.toString())
  } catch (error) {
    const state = c.req.query('state') || '/'
    const errorUrl = new URL(`${customerAuthConfig.storefrontUrl}/auth/failed`)
    errorUrl.searchParams.set('error', 'auth_failed')
    errorUrl.searchParams.set('redirect', state)
    return c.redirect(errorUrl.toString())
  }
})



// GET /me - Get current customer profile
customerAuthRoutes.get('/me', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer')
    const profile = await customerAuthService.getCustomerById(customer.id)

    return successResponse<CustomerProfile>(c, customerAuthMessages.CUSTOMER_FETCHED, profile)
  } catch (error) {
    return errorHandler(error, c)
  }
})
