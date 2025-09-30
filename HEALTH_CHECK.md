# Health Check System

This application includes comprehensive health checks to monitor system status and diagnose issues.

## Quick Health Checks

### 1. Command Line Health Check
Run the standalone health check script:
```bash
node test-health.js
```

This will test:
- ✅ Application status
- ✅ Environment variables
- ✅ Supabase connection
- ✅ Database data availability
- ✅ Latest run data status

### 2. Browser Health Check
Visit the health check page in your browser:
```
http://localhost:5173/health
```

This provides a visual dashboard showing:
- Overall system status
- Individual service health
- Database statistics
- Raw health data for debugging

### 3. API-Style Health Check
The health check page also displays JSON data that can be used for monitoring:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-09-23T22:11:57.918Z",
  "checks": {
    "app": { "status": "healthy", "version": "1.0.0" },
    "supabase": { "status": "healthy", "connected": true },
    "database": { "status": "healthy", "data": {...} }
  }
}
```

## What Gets Checked

### Application Health
- App version and environment
- Node.js version
- Timestamp of last check

### Supabase Connection
- Database connectivity
- Authentication status
- Basic query functionality

### Database Data
- Runs table status and count
- Listings table status and count
- Tampa listings availability
- Latest run data verification

## Troubleshooting

### If Health Check Fails

1. **Environment Variables**: Ensure `.env.local` has correct values
2. **Supabase Connection**: Check URL and API key
3. **Database Access**: Verify RLS policies allow anonymous access
4. **Data Availability**: Check if latest run has associated listings

### Common Issues

**"No listings showing"**: This usually means the latest run ID has no associated listings. The app now automatically falls back to the most recent run with data.

**"Supabase connection failed"**: Check your environment variables and network connectivity.

**"Database data missing"**: Verify your Supabase tables have data and RLS policies are configured correctly.

## Files

- `src/utils/healthCheck.js` - Core health check functions
- `src/pages/HealthCheck.jsx` - Visual health check page
- `src/utils/apiHealth.js` - API-style health endpoints
- `test-health.js` - Standalone health check script
- `HEALTH_CHECK.md` - This documentation

## Integration

The health check system is integrated into the main app and can be accessed at `/health`. It's useful for:
- Development debugging
- Production monitoring
- Customer support diagnostics
- System maintenance verification
