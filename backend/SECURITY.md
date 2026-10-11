# Security Implementation

## Overview
This document describes the security measures implemented to protect the AquaWatch API.

## Authentication

### API Key Authentication
The PATCH endpoint for updating incidents now requires authentication to prevent unauthorized modifications.

**Protected Endpoints:**
- `PATCH /api/incidents/:id` - Update incident status (requires API key)

**How to authenticate:**
Add the API key to request headers:
```bash
X-API-Key: your_api_key_here
```

**Example:**
```bash
curl -X PATCH http://localhost:5000/api/incidents/123abc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 0e950d3cff808d33b34423f02e73a1a5c4ba30de369185e14244bb1933ef874e" \
  -d '{"status": "resolved", "resolutionNote": "Fixed by maintenance team"}'
```

### API Key Setup

**Development:**
The API key is stored in `backend/.env`:
```
ADMIN_API_KEY=0e950d3cff808d33b34423f02e73a1a5c4ba30de369185e14244bb1933ef874e
```

**Production:**
1. Generate a new secure API key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set it in your production environment variables
3. Share it only with authorized administrators

### Security Features

1. **Constant-time comparison** - Prevents timing attacks
2. **Rate limiting** - Max 5 authentication attempts per 15 minutes per IP
3. **Environment-based** - API keys never hardcoded in source code

## Input Validation

### Validation Middleware Applied

All hotspot endpoints now validate inputs:

**GET /api/hotspots**
- `radius`: 100-5000 meters
- `timeWindow`: 1-365 days
- `minIncidents`: 2-100 incidents

**GET /api/hotspots/:id/weather**
- `latitude`: -90 to 90
- `longitude`: -180 to 180

**POST /api/hotspots/:id/recommendation**
- `rainfall`: 0-1000 mm
- `catchmentArea`: 1-1,000,000 m²
- `runoffCoefficient`: 0-1 (optional)
- `surfaceType`: Valid surface type enum (optional)

### Error Responses

**Invalid input:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "radius",
      "message": "Radius must be between 100 and 5000 meters"
    }
  ]
}
```

**Authentication required:**
```json
{
  "success": false,
  "message": "Authentication required. Please provide an API key in the X-API-Key header."
}
```

**Invalid API key:**
```json
{
  "success": false,
  "message": "Invalid API key. Access denied."
}
```

## Data Integrity

### Protected Operations
- **Status changes** - Only authenticated users can change incident status
- **Verification status** - Prevent false marking as "disputed" or "verified"
- **Resolution notes** - Only admins can add resolution notes

### Still Public (By Design)
- Creating new incidents - Citizen reporting should remain open
- Viewing incidents - Transparency is key for civic tech
- Viewing hotspots - Public awareness of problem areas
- Getting recommendations - Public access to solutions

## Deployment Checklist

- [ ] Generate new ADMIN_API_KEY for production
- [ ] Set ADMIN_API_KEY in production environment
- [ ] Never commit .env files to version control
- [ ] Document API key distribution to authorized personnel
- [ ] Set up API key rotation schedule (every 90 days recommended)
- [ ] Monitor authentication failures in production logs

## Future Enhancements

For production deployment, consider:
1. **OAuth2/JWT** - More robust authentication system
2. **Role-based access control** - Different permission levels
3. **Audit logging** - Track who made what changes
4. **Multi-factor authentication** - Additional security layer
5. **API key expiration** - Automatic rotation and expiry
