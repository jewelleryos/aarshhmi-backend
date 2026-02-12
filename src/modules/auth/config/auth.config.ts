export const authConfig = {
  jwt: {
    auth: {
      secret: process.env.ADMIN_AUTH_JWT_SECRET!,
      expiresIn: '1d',
      cookieMaxAge: 24 * 60 * 60, // 1 day in seconds
    },
    passwordReset: {
      secret: process.env.ADMIN_PASSWORD_RESET_JWT_SECRET!,
      expiresIn: '1h', // 1 hour
      dbExpiryMs: 1.5 * 60 * 60 * 1000, // 1.5 hours in milliseconds (buffer for DB)
    },
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}
