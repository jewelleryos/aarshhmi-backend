import type { AuthUser } from '../middleware/auth.middleware'
import type { AuthCustomer } from '../modules/customer-auth/middleware/customer-auth.middleware'

export type AppVariables = {
  user: AuthUser
  customer: AuthCustomer
}

export type AppEnv = {
  Variables: AppVariables
}
