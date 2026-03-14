import { Hono } from 'hono'
import { customerAuth } from '../../customer-auth/middleware/customer-auth.middleware'
import { storefrontCustomerService } from '../services/storefront-customer.service'
import { storefrontCustomerMessages } from '../config/storefront-customer.messages'
import { createAddressSchema, updateAddressSchema } from '../config/storefront-customer.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import type { AppEnv } from '../../../types/hono.types'
import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

export const storefrontCustomerRoutes = new Hono<AppEnv>()

// GET /addresses — list all customer addresses
storefrontCustomerRoutes.get('/addresses', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const addresses = await storefrontCustomerService.getAddresses(customer.id)
    return successResponse(c, storefrontCustomerMessages.ADDRESSES_FETCHED, addresses)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /addresses — add new address
storefrontCustomerRoutes.post('/addresses', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const body = await c.req.json()
    const data = createAddressSchema.parse(body)
    const result = await storefrontCustomerService.createAddress(customer.id, data)
    return successResponse(c, storefrontCustomerMessages.ADDRESS_CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /addresses/:id — update address
storefrontCustomerRoutes.patch('/addresses/:id', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const addressId = c.req.param('id')
    const body = await c.req.json()
    const data = updateAddressSchema.parse(body)
    const result = await storefrontCustomerService.updateAddress(customer.id, addressId, data)
    return successResponse(c, storefrontCustomerMessages.ADDRESS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /addresses/:id — delete address
storefrontCustomerRoutes.delete('/addresses/:id', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const addressId = c.req.param('id')
    const result = await storefrontCustomerService.deleteAddress(customer.id, addressId)
    return successResponse(c, storefrontCustomerMessages.ADDRESS_DELETED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /states — list all states (for address form dropdown)
storefrontCustomerRoutes.get('/states', async (c) => {
  try {
    const states = await storefrontCustomerService.getStates()
    return successResponse(c, storefrontCustomerMessages.STATES_FETCHED, states)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /states/:stateId/cities — list cities by state (for address form dropdown)
storefrontCustomerRoutes.get('/states/:stateId/cities', async (c) => {
  try {
    const stateId = Number(c.req.param('stateId'))
    const cities = await storefrontCustomerService.getCitiesByState(stateId)
    return successResponse(c, storefrontCustomerMessages.CITIES_FETCHED, cities)
  } catch (error) {
    return errorHandler(error, c)
  }
})
