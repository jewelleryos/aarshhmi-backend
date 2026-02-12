import { z } from 'zod'

export const googleTokenSchema = z.object({
  id_token: z.string().min(1, 'ID token is required'),
})
