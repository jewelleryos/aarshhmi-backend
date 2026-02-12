# Authentication Module

## Overview

This module handles admin authentication for the Luminique platform.

## Authentication Flow

### Login Process

1. Admin submits email and password to `/api/auth/login`
2. Backend validates credentials
3. On success:
   - JWT token is set as an **HTTP-only cookie** (not sent in response body)
   - Response body contains user data and permissions

### Response Structure

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxxxx",
      "email": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "permissions": []  // To be implemented
  }
}
```

### Token Storage

| Item | Storage Location | Purpose |
|------|------------------|---------|
| JWT Token | HTTP-only cookie | Secure, not accessible via JavaScript |
| User Data | Response body / Frontend state | Display purposes |
| Permissions | Response body / Frontend state | UI access control |

## Request Authentication

### How It Works

1. Frontend makes API request (cookie is automatically sent by browser)
2. Backend middleware reads token from HTTP-only cookie
3. Token is validated:
   - Check if token exists
   - Verify JWT signature
   - Check expiration
4. If valid: Request proceeds
5. If invalid: Return 401 Unauthorized

### Cookie Configuration

```typescript
{
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // HTTPS only (in production)
  sameSite: 'strict',  // CSRF protection
  path: '/',           // Available for all routes
  maxAge: 86400        // 24 hours (matches JWT expiry)
}
```

## Security Considerations

- **HTTP-only cookies**: Prevents XSS attacks from stealing tokens
- **Secure flag**: Ensures cookies only sent over HTTPS
- **SameSite strict**: Prevents CSRF attacks
- **Token expiration**: Limits damage from compromised tokens

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Clear auth cookie |
| GET | `/api/auth/me` | Get current user (validates token) |

## TODO

- [ ] Implement permissions system
- [ ] Update login to set HTTP-only cookie
- [ ] Create auth middleware for protected routes
- [ ] Add logout endpoint
- [ ] Add `/me` endpoint for token validation
