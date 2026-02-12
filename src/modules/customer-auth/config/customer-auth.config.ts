export const customerAuthConfig = {
  jwt: {
    secret: process.env.CUSTOMER_AUTH_JWT_SECRET!,
    expiresIn: process.env.CUSTOMER_JWT_EXPIRY || '30d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },

  storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:3000',
}
