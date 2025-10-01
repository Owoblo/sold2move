# Sold2Move Data Flow Documentation

## Overview

This document outlines the complete data flow from the Node.js scraper to the React frontend, ensuring data consistency and optimal performance.

## Data Pipeline Architecture

```
Node.js Scraper → Supabase Database → React Frontend
     ↓                    ↓                ↓
  Raw Data          Structured Data    User Interface
  (Zillow API)      (PostgreSQL)      (React Components)
```

## Database Schema

### Core Tables

#### 1. `current_listings`
- **Purpose**: Stores all current property listings
- **Key Fields**: `zpid`, `addressstreet`, `addresscity`, `addressstate`, `unformattedprice`, `beds`, `baths`, `area`, `statustext`, `lastseenat`
- **Indexes**: `zpid`, `city + lastseenat`, `unformattedprice`

#### 2. `just_listed`
- **Purpose**: Stores newly listed properties (first 4 pages of search results)
- **Key Fields**: Same as `current_listings`
- **Indexes**: `zpid`, `lastcity + lastseenat`, `unformattedprice`

#### 3. `sold_listings`
- **Purpose**: Stores recently sold properties
- **Key Fields**: Same as `current_listings`
- **Indexes**: `zpid`, `lastcity + lastseenat`, `unformattedprice`

#### 4. `runs`
- **Purpose**: Tracks scraper execution runs
- **Key Fields**: `id`, `started_at`, `ended_at`
- **Indexes**: `started_at`

#### 5. `listing_reveals`
- **Purpose**: Tracks which listings users have revealed
- **Key Fields**: `user_id`, `listing_id`, `created_at`
- **Indexes**: `user_id + listing_id`

## Data Mapping

### Scraper → Database

The scraper maps Zillow API data to database columns:

```javascript
// Key mappings in mapItemToRow function
{
  zpid: item?.zpid ?? item?.hdpData?.homeInfo?.zpid,
  addressstreet: item?.addressStreet ?? item?.hdpData?.homeInfo?.streetAddress,
  addresscity: item?.addressCity ?? item?.hdpData?.homeInfo?.city,
  addressstate: item?.addressState ?? item?.hdpData?.homeInfo?.state,
  unformattedprice: item?.unformattedPrice,
  beds: item?.beds ?? item?.hdpData?.homeInfo?.bedrooms,
  baths: item?.baths ?? item?.hdpData?.homeInfo?.bathrooms,
  area: item?.area,
  statustext: item?.statusText,
  lastseenat: new Date().toISOString()
}
```

### Database → Frontend

The frontend maps database columns to component properties:

```javascript
// Key mappings in mapDatabaseListingToFrontend function
{
  addressStreet: dbListing.addressstreet, // lowercase DB → camelCase frontend
  addresscity: dbListing.addresscity,
  addressstate: dbListing.addressstate,
  unformattedprice: dbListing.unformattedprice,
  beds: dbListing.beds,
  baths: dbListing.baths,
  area: dbListing.area,
  statustext: dbListing.statustext,
  lastseenat: dbListing.lastseenat
}
```

## API Endpoints

### Just Listed Properties
- **Query**: `just_listed` table
- **Filters**: `lastcity`, `lastseenat`, `unformattedprice`, `beds`, `baths`, `area`, `statustext`
- **Sorting**: `lastseenat DESC` (newest first)
- **Pagination**: `LIMIT` and `OFFSET`

### Sold Properties
- **Query**: `sold_listings` table
- **Filters**: Same as just listed
- **Sorting**: `lastseenat DESC` (newest first)
- **Pagination**: Client-side (all data loaded, then paginated)

## Data Validation

### Scraper Validation
```javascript
// Validates required fields and data types
function validateListingData(listing) {
  const errors = [];
  
  if (!listing.zpid) errors.push('Missing zpid');
  if (listing.beds < 0 || listing.beds > 20) errors.push('Invalid beds');
  if (listing.baths < 0 || listing.baths > 20) errors.push('Invalid baths');
  if (listing.area < 0 || listing.area > 100000) errors.push('Invalid area');
  if (listing.unformattedprice < 0 || listing.unformattedprice > 100000000) errors.push('Invalid price');
  
  return { isValid: errors.length === 0, errors };
}
```

### Frontend Validation
```javascript
// Validates data before display
function validateListingData(listing) {
  // Same validation logic as scraper
  // Ensures data integrity in UI
}
```

## Performance Optimizations

### Database Indexes
```sql
-- Key indexes for performance
CREATE INDEX idx_just_listed_city_lastseenat ON just_listed(lastcity, lastseenat DESC);
CREATE INDEX idx_sold_listings_city_lastseenat ON sold_listings(lastcity, lastseenat DESC);
CREATE INDEX idx_just_listed_price ON just_listed(unformattedprice) WHERE unformattedprice IS NOT NULL;
CREATE INDEX idx_listing_reveals_user_listing ON listing_reveals(user_id, listing_id);
```

### Query Optimization
- Use `SELECT` with specific columns instead of `SELECT *`
- Implement proper pagination with `LIMIT` and `OFFSET`
- Use database-level filtering instead of client-side filtering when possible
- Cache frequently accessed data with React Query

### Frontend Optimizations
- Use `React.memo` for expensive components
- Implement virtual scrolling for large lists
- Use `useMemo` and `useCallback` for expensive calculations
- Lazy load images and non-critical data

## Error Handling

### Database Errors
```javascript
// Handle common database errors
if (error.code === '42703') {
  // Column not found
  throw new Error('Database column error: Column does not exist');
} else if (error.code === '42P01') {
  // Table not found
  throw new Error('Database table error: Table does not exist');
}
```

### Frontend Errors
```javascript
// Handle API errors gracefully
if (error.code === 'COLUMN_NOT_FOUND') {
  // Show user-friendly message
  setError('Database structure issue. Please try again later.');
} else if (error.code === 'CONNECTION_FAILED') {
  // Show network error
  setError('Unable to connect to servers. Check your internet connection.');
}
```

## Data Consistency Checks

### Scraper Consistency
- Validate all required fields before database insertion
- Use database constraints to prevent invalid data
- Implement retry logic for failed operations
- Log all data validation errors

### Frontend Consistency
- Map database columns consistently across all components
- Validate data before display
- Handle missing or null values gracefully
- Show appropriate fallbacks for invalid data

## Monitoring and Debugging

### Database Monitoring
```sql
-- Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

### Frontend Monitoring
- Use React DevTools for component performance
- Monitor API response times
- Track user interactions and errors
- Implement error boundaries for graceful error handling

## Best Practices

### Scraper
1. Always validate data before database insertion
2. Use batch operations for better performance
3. Implement proper error handling and retry logic
4. Log all operations for debugging
5. Use database transactions for data consistency

### Frontend
1. Map database data consistently across components
2. Implement proper loading and error states
3. Use TypeScript for better type safety
4. Optimize re-renders with React.memo and useMemo
5. Handle edge cases gracefully

### Database
1. Use appropriate indexes for common queries
2. Implement proper constraints and validation
3. Regular maintenance and cleanup of old data
4. Monitor performance and optimize slow queries
5. Use connection pooling for better performance

## Troubleshooting

### Common Issues

#### 1. Column Name Mismatches
- **Problem**: Database uses lowercase (`addressstreet`) but frontend expects camelCase (`addressStreet`)
- **Solution**: Use consistent mapping functions in `mapDatabaseListingToFrontend`

#### 2. Data Type Issues
- **Problem**: String values where numbers expected
- **Solution**: Validate and convert data types in both scraper and frontend

#### 3. Missing Data
- **Problem**: Null or undefined values causing UI errors
- **Solution**: Implement proper null checks and fallbacks

#### 4. Performance Issues
- **Problem**: Slow queries or UI lag
- **Solution**: Add proper indexes, optimize queries, and implement caching

### Debugging Steps

1. **Check Database Schema**: Ensure all required columns exist
2. **Validate Data**: Use validation functions to check data integrity
3. **Monitor Queries**: Check query performance and execution plans
4. **Test API Endpoints**: Verify data is returned correctly
5. **Check Frontend Mapping**: Ensure data is mapped correctly to components

## Future Improvements

1. **Real-time Updates**: Implement WebSocket connections for live data updates
2. **Advanced Caching**: Use Redis for better caching performance
3. **Data Analytics**: Add analytics for user behavior and data usage
4. **Automated Testing**: Implement comprehensive test suites
5. **Performance Monitoring**: Add APM tools for better observability

## Conclusion

This data flow architecture ensures:
- ✅ Consistent data mapping between scraper and frontend
- ✅ Optimal database performance with proper indexing
- ✅ Robust error handling and validation
- ✅ Scalable and maintainable codebase
- ✅ User-friendly interface with proper loading states

The system is designed to handle large volumes of data efficiently while providing a smooth user experience.
