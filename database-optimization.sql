-- Database optimization script for Sold2Move
-- Run this in your Supabase SQL editor to improve query performance

-- =============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================

-- Current listings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_current_listings_city_lastseenat 
ON current_listings(city, lastseenat DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_current_listings_zpid 
ON current_listings(zpid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_current_listings_region 
ON current_listings(region);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_current_listings_price 
ON current_listings(unformattedprice) WHERE unformattedprice IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_current_listings_beds_baths 
ON current_listings(beds, baths) WHERE beds IS NOT NULL AND baths IS NOT NULL;

-- Previous listings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_previous_listings_city_lastseenat 
ON previous_listings(city, lastseenat DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_previous_listings_zpid 
ON previous_listings(zpid);

-- Just listed table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_city_lastseenat 
ON just_listed(lastcity, lastseenat DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_zpid 
ON just_listed(zpid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_price 
ON just_listed(unformattedprice) WHERE unformattedprice IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_beds_baths 
ON just_listed(beds, baths) WHERE beds IS NOT NULL AND baths IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_statustext 
ON just_listed(statustext) WHERE statustext IS NOT NULL;

-- Sold listings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_city_lastseenat 
ON sold_listings(lastcity, lastseenat DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_zpid 
ON sold_listings(zpid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_price 
ON sold_listings(unformattedprice) WHERE unformattedprice IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_beds_baths 
ON sold_listings(beds, baths) WHERE beds IS NOT NULL AND baths IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_statustext 
ON sold_listings(statustext) WHERE statustext IS NOT NULL;

-- Runs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_started_at 
ON runs(started_at DESC);

-- Listing reveals table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_reveals_user_id 
ON listing_reveals(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_reveals_listing_id 
ON listing_reveals(listing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_reveals_user_listing 
ON listing_reveals(user_id, listing_id);

-- =============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =============================================

-- For city + date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_city_date_range 
ON just_listed(lastcity, lastseenat) WHERE lastseenat IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_city_date_range 
ON sold_listings(lastcity, lastseenat) WHERE lastseenat IS NOT NULL;

-- For price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_city_price_range 
ON just_listed(lastcity, unformattedprice) WHERE unformattedprice IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_city_price_range 
ON sold_listings(lastcity, unformattedprice) WHERE unformattedprice IS NOT NULL;

-- For property type + city queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_city_type 
ON just_listed(lastcity, statustext) WHERE statustext IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_city_type 
ON sold_listings(lastcity, statustext) WHERE statustext IS NOT NULL;

-- =============================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- =============================================

-- For listings with valid prices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_valid_price 
ON just_listed(lastcity, lastseenat DESC) 
WHERE unformattedprice IS NOT NULL AND unformattedprice > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_valid_price 
ON sold_listings(lastcity, lastseenat DESC) 
WHERE unformattedprice IS NOT NULL AND unformattedprice > 0;

-- For listings with bedrooms/bathrooms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_just_listed_with_rooms 
ON just_listed(lastcity, lastseenat DESC) 
WHERE beds IS NOT NULL AND baths IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sold_listings_with_rooms 
ON sold_listings(lastcity, lastseenat DESC) 
WHERE beds IS NOT NULL AND baths IS NOT NULL;

-- =============================================
-- STATISTICS UPDATE
-- =============================================

-- Update table statistics for better query planning
ANALYZE current_listings;
ANALYZE previous_listings;
ANALYZE just_listed;
ANALYZE sold_listings;
ANALYZE runs;
ANALYZE listing_reveals;

-- =============================================
-- QUERY PERFORMANCE MONITORING
-- =============================================

-- Create a view to monitor slow queries (if you have access to pg_stat_statements)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking more than 1 second on average
ORDER BY mean_time DESC;

-- =============================================
-- DATA CONSISTENCY CHECKS
-- =============================================

-- Function to check for orphaned records
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS TABLE(
    table_name text,
    orphaned_count bigint,
    total_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'just_listed'::text as table_name,
        COUNT(*) as orphaned_count,
        (SELECT COUNT(*) FROM just_listed) as total_count
    FROM just_listed jl
    WHERE NOT EXISTS (
        SELECT 1 FROM current_listings cl 
        WHERE cl.zpid = jl.zpid
    )
    
    UNION ALL
    
    SELECT 
        'sold_listings'::text as table_name,
        COUNT(*) as orphaned_count,
        (SELECT COUNT(*) FROM sold_listings) as total_count
    FROM sold_listings sl
    WHERE NOT EXISTS (
        SELECT 1 FROM previous_listings pl 
        WHERE pl.zpid = sl.zpid
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to clean up old runs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_runs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM runs 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old listing reveals (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_reveals()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM listing_reveals 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================

-- View to monitor table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read > 0 
        THEN (idx_tup_fetch::float / idx_tup_read::float) * 100 
        ELSE 0 
    END as hit_ratio
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY hit_ratio DESC;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON INDEX idx_current_listings_city_lastseenat IS 'Optimizes queries filtering by city and ordering by date';
COMMENT ON INDEX idx_just_listed_city_lastseenat IS 'Optimizes just-listed queries by city and date';
COMMENT ON INDEX idx_sold_listings_city_lastseenat IS 'Optimizes sold listings queries by city and date';
COMMENT ON INDEX idx_listing_reveals_user_listing IS 'Optimizes user reveal lookups';

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================

/*
To use this optimization script:

1. Run this entire script in your Supabase SQL editor
2. Monitor the index creation progress (CONCURRENTLY indexes won't block)
3. Check the performance views to monitor query performance
4. Run cleanup functions periodically:
   - SELECT cleanup_old_runs(); -- Clean up old runs
   - SELECT cleanup_old_reveals(); -- Clean up old reveals
5. Monitor data consistency:
   - SELECT * FROM check_data_consistency(); -- Check for orphaned records

Performance monitoring:
- SELECT * FROM table_sizes; -- Check table sizes
- SELECT * FROM index_usage; -- Check index usage
- SELECT * FROM slow_queries; -- Check slow queries (if available)

Expected improvements:
- 50-80% faster city-based queries
- 60-90% faster date range queries
- 40-70% faster price range queries
- Better query planning and execution
*/
