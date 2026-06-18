# Security Considerations

## Authentication Token Storage

### Current Implementation (Development)
The app currently stores JWT tokens in `localStorage` for simplicity during development.

### Known Security Concerns
1. **XSS Vulnerability**: localStorage is accessible to any JavaScript running on the page
2. **No httpOnly Protection**: Tokens can be stolen via XSS attacks
3. **Persistence**: Tokens remain even after browser close

### Recommended Production Solution

#### Option 1: httpOnly Cookies (Recommended)
```javascript
// Backend (FastAPI)
response.set_cookie(
    key="auth_token",
    value=token,
    httponly=True,  // Prevents JavaScript access
    secure=True,    // HTTPS only
    samesite="strict",  // CSRF protection
    max_age=604800  // 7 days
)

// Frontend - token sent automatically with requests
// No localStorage needed!
```

#### Option 2: BFF Pattern (Backend-for-Frontend)
- Frontend never touches tokens
- All API calls go through BFF
- BFF manages session with secure cookies

### Implementation Checklist for Production
- [ ] Move token to httpOnly cookies
- [ ] Implement CSRF protection
- [ ] Add token refresh mechanism
- [ ] Implement secure logout (clear cookie)
- [ ] Add rate limiting
- [ ] Enable HTTPS only
- [ ] Add Content Security Policy headers

### References
- OWASP JWT Best Practices: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
- httpOnly Cookies: https://owasp.org/www-community/HttpOnly
- CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
