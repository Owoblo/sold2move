// api/inventory-detection.js
// Vercel Serverless Function for on-demand inventory detection (MoveSense-style)
// Deploy to Vercel or run locally with: vercel dev
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from 'uuid';

// Supabase setup
const supabaseUrl = 'https://idbyrtwdeeruiutoukct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const SKIP_EXTERIOR_PHOTOS = 5;
const MAX_PHOTOS = 12;
const BATCH_SIZE = 2;
const PHOTO_TIMEOUT_MS = 45000;
const MAX_RETRIES = 4;
const CACHE_DAYS = 30;

// MoveSense-style inventory detection prompt
const INVENTORY_SYSTEM_PROMPT = `You are a professional MOVING COMPANY inventory specialist. Analyze this real estate photo and identify ONLY items that professional movers can physically move and transport.

🚚 MOVER'S INVENTORY - ONLY DETECT MOVABLE ITEMS:

✅ MOVABLE FURNITURE & ITEMS (DETECT THESE):
- SEATING: Sofas, Sectionals, Loveseats, Recliners, Chairs (Dining, Office, Accent), Ottomans, Benches, Stools
- TABLES: Dining Tables, Coffee Tables, End Tables, Console Tables, Side Tables, Kitchen Islands (if freestanding)
- BEDS: King Beds, Queen Beds, Twin Beds, Bunk Beds, Daybeds, Futons, Mattresses, Box Springs
- STORAGE: Dressers, Chests of Drawers, Nightstands, Bookshelves, Freestanding Cabinets, Wardrobes, Armoires
- APPLIANCES: Refrigerators, Stoves, Ovens, Microwaves, Dishwashers, Washers, Dryers, Toasters, Coffee Makers
- ELECTRONICS: TVs, Monitors, Computers, Laptops, Sound Systems, Gaming Consoles, Speakers
- DECOR: Floor Lamps, Table Lamps, Mirrors (wall-mounted), Artwork, Plants, Vases, Clocks, Area Rugs
- KITCHEN: Freestanding Pantries, Wine Racks, Bar Stools, Kitchen Carts
- OUTDOOR: Patio Furniture, Grills, Outdoor Chairs/Tables

❌ DO NOT DETECT (FIXED INSTALLATIONS):
- Built-in cabinets, Built-in shelving, Built-in vanities
- Chandeliers, Ceiling fans, Light fixtures
- Built-in appliances (dishwashers, built-in ovens)
- Built-in bathroom vanities, Medicine cabinets
- Built-in wardrobes, Built-in closets
- Wall-mounted items (unless easily removable)
- Built-in countertops, Built-in islands
- Fixed mirrors, Built-in mirrors
- Built-in seating, Built-in benches

CRITICAL REQUIREMENTS:
1. COUNT EXACT QUANTITIES - If you see 4 dining chairs, write qty: 4
2. BE HIGHLY SPECIFIC - "Large Oak Dining Table", "Sectional Sofa with Ottoman", "King Size Platform Bed"
3. INCLUDE ROOM CONTEXT - "Master Bedroom Dresser", "Kitchen Island Stools", "Living Room Coffee Table"
4. DISTINGUISH SIMILAR ITEMS - "Coffee Table" vs "End Table" vs "Console Table"
5. SIZE DESCRIPTORS - CRITICAL FOR MOVERS:
   - TVs: Estimate screen size in inches (e.g., "40-50 inch TV", "55-65 inch TV", "70+ inch TV")
   - Furniture: Provide dimensions or size range when possible (e.g., "Large (7-8 ft)", "Small (4-5 ft)", "Queen Size", "King Size")
   - If exact size is unclear, provide a reasonable range (e.g., "Medium-Large", "30-40 inches wide")
6. ONLY MOVABLE ITEMS - Skip anything permanently attached or built-in

Return ONLY a valid JSON array with objects containing:
- label: VERY SPECIFIC movable furniture type with descriptors (string)
- qty: EXACT quantity visible (number)
- confidence: confidence score 0-1 (number)
- notes: room location and specific details (string)
- room: room type (string)
- size: size descriptor with specific measurements or ranges
- cubicFeet: **REQUIRED** - estimated cubic feet volume for this item (number)

Return ONLY a JSON array, no other text.`;

/**
 * Vercel serverless handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const scanId = uuidv4();

  // Get API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    return res.status(500).json({
      error: 'Server configuration error: OpenAI API key not configured.'
    });
  }

  // Parse request body
  const { zpid, userId, forceRefresh } = req.body;

  if (!zpid) {
    return res.status(400).json({ error: 'zpid is required' });
  }

  console.log(`📸 Inventory scan requested for zpid: ${zpid}`);

  try {
    // Check for cached scan (within 30 days) unless force refresh
    if (!forceRefresh) {
      const cachedScan = await getCachedScan(zpid);
      if (cachedScan) {
        console.log(`✅ Returning cached scan from ${cachedScan.scanned_at}`);
        return res.status(200).json({
          cached: true,
          scan_id: cachedScan.scan_id,
          zpid: cachedScan.zpid,
          inventory: cachedScan.inventory_items,
          summary: {
            totalItems: cachedScan.total_items,
            totalCubicFeet: cachedScan.total_cubic_feet,
            roomBreakdown: cachedScan.room_breakdown
          },
          photosAnalyzed: cachedScan.photos_analyzed,
          scannedAt: cachedScan.scanned_at
        });
      }
    }

    // Fetch listing photos from database
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('zpid, address, city, carouselphotos')
      .eq('zpid', zpid)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Parse carousel photos (may be double-encoded JSON string)
    let photoUrls = [];
    try {
      let photos = listing.carouselphotos;

      // Handle double-encoded JSON (string containing escaped JSON string)
      if (typeof photos === 'string') {
        photos = JSON.parse(photos);
        // Check if still a string after first parse (double-encoded)
        if (typeof photos === 'string') {
          photos = JSON.parse(photos);
        }
      }

      // Handle array of objects with url property vs array of strings
      if (Array.isArray(photos)) {
        photoUrls = photos.map(p => typeof p === 'string' ? p : p.url);
      }
    } catch (e) {
      console.error('Failed to parse carousel photos:', e.message);
      return res.status(400).json({ error: 'Invalid photo data for listing' });
    }

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: 'No photos available for this listing' });
    }

    // Select interior photos (skip first 5 exterior shots)
    const interiorPhotos = photoUrls.slice(SKIP_EXTERIOR_PHOTOS, SKIP_EXTERIOR_PHOTOS + MAX_PHOTOS);

    if (interiorPhotos.length === 0) {
      return res.status(400).json({
        error: 'Not enough interior photos',
        detail: `Listing has ${photoUrls.length} photos total, need at least ${SKIP_EXTERIOR_PHOTOS + 1}`
      });
    }

    console.log(`📸 Processing ${interiorPhotos.length} interior photos`);

    // Create initial scan record
    await createScanRecord(scanId, zpid, userId, interiorPhotos);

    // Process photos in batches
    const allDetections = [];
    let totalCost = 0;

    for (let i = 0; i < interiorPhotos.length; i += BATCH_SIZE) {
      const batch = interiorPhotos.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} photos`);

      const batchResults = await Promise.all(
        batch.map(photoUrl => processPhotoWithRetry(photoUrl, apiKey))
      );

      batchResults.forEach(detections => {
        if (Array.isArray(detections)) {
          allDetections.push(...detections);
        }
      });

      totalCost += batch.length * 0.01;  // ~$0.01 per image

      // Cooldown between batches
      if (i + BATCH_SIZE < interiorPhotos.length) {
        await sleep(2000);
      }
    }

    // Deduplicate and merge detections
    const mergedDetections = mergeDetections(allDetections);

    // Calculate summary
    const summary = calculateSummary(mergedDetections);

    // Update scan record with results
    const processingTime = Date.now() - startTime;
    await updateScanRecord(scanId, mergedDetections, summary, interiorPhotos.length, totalCost, processingTime);

    // Also update the listing's furniture status based on inventory
    await updateListingFurnitureStatus(zpid, mergedDetections);

    console.log(`✅ Scan complete: ${mergedDetections.length} unique items, ${summary.totalCubicFeet} cu ft`);

    return res.status(200).json({
      cached: false,
      scan_id: scanId,
      zpid,
      inventory: mergedDetections,
      summary: {
        totalItems: summary.totalItems,
        totalCubicFeet: summary.totalCubicFeet,
        roomBreakdown: summary.roomBreakdown
      },
      photosAnalyzed: interiorPhotos.length,
      processingTimeMs: processingTime,
      apiCostUsd: totalCost
    });

  } catch (error) {
    console.error('❌ Inventory scan failed:', error);

    // Update scan record with error
    await supabase
      .from('listing_inventory_scans')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('scan_id', scanId);

    return res.status(500).json({
      error: 'Inventory scan failed',
      detail: error.message
    });
  }
}

/**
 * Check for cached scan within CACHE_DAYS
 */
async function getCachedScan(zpid) {
  const cacheDate = new Date();
  cacheDate.setDate(cacheDate.getDate() - CACHE_DAYS);

  const { data, error } = await supabase
    .from('listing_inventory_scans')
    .select('*')
    .eq('zpid', zpid)
    .eq('status', 'completed')
    .gte('scanned_at', cacheDate.toISOString())
    .order('scanned_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create initial scan record
 */
async function createScanRecord(scanId, zpid, userId, photoUrls) {
  await supabase
    .from('listing_inventory_scans')
    .insert({
      scan_id: scanId,
      zpid,
      scanned_by: userId || 'api',
      status: 'processing',
      photo_urls: JSON.stringify(photoUrls)
    });
}

/**
 * Update scan record with results
 */
async function updateScanRecord(scanId, detections, summary, photosAnalyzed, cost, processingTime) {
  await supabase
    .from('listing_inventory_scans')
    .update({
      status: 'completed',
      inventory_items: JSON.stringify(detections),
      total_items: summary.totalItems,
      total_cubic_feet: summary.totalCubicFeet,
      room_breakdown: JSON.stringify(summary.roomBreakdown),
      photos_analyzed: photosAnalyzed,
      api_cost_usd: cost,
      processing_time_ms: processingTime
    })
    .eq('scan_id', scanId);
}

/**
 * Update listing furniture status based on inventory
 */
async function updateListingFurnitureStatus(zpid, detections) {
  const isFurnished = detections.length > 0;
  const confidence = detections.length > 5 ? 0.95 : detections.length > 2 ? 0.8 : 0.6;
  const items = detections.slice(0, 10).map(d => d.label);

  await supabase
    .from('listings')
    .update({
      is_furnished: isFurnished,
      furniture_confidence: confidence,
      furniture_scan_date: new Date().toISOString(),
      furniture_scan_method: 'inventory-api',
      furniture_items_detected: JSON.stringify(items)
    })
    .eq('zpid', zpid);
}

/**
 * Process single photo with retry logic
 */
async function processPhotoWithRetry(photoUrl, apiKey) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
        console.log(`🔄 Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
      }

      return await analyzePhoto(photoUrl, apiKey);
    } catch (error) {
      const isRetryable =
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('429') ||
        error.status === 429 ||
        (error.status >= 502 && error.status <= 504);

      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`⚠️ Retryable error: ${error.message}`);
        continue;
      }

      console.error(`❌ Failed to process photo: ${error.message}`);
      return [];
    }
  }
  return [];
}

/**
 * Analyze single photo with OpenAI Vision
 */
async function analyzePhoto(photoUrl, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: INVENTORY_SYSTEM_PROMPT },
            { type: 'image_url', image_url: { url: photoUrl, detail: 'auto' } }
          ]
        }],
        max_tokens: 2000,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`OpenAI API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return parseDetections(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse JSON detections from OpenAI response
 */
function parseDetections(content) {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
                      content.match(/(\[[\s\S]*?\])/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const detections = JSON.parse(jsonStr);
    return Array.isArray(detections) ? detections : [];
  } catch (error) {
    console.error('❌ JSON Parse Error:', error.message);
    return [];
  }
}

/**
 * Merge and deduplicate detections from multiple photos
 */
function mergeDetections(detections) {
  return detections.reduce((acc, detection) => {
    const existing = acc.find(
      d => d.label?.toLowerCase() === detection.label?.toLowerCase() &&
           d.room?.toLowerCase() === detection.room?.toLowerCase()
    );

    if (existing) {
      existing.qty = Math.max(existing.qty || 1, detection.qty || 1);
      existing.confidence = Math.max(existing.confidence || 0, detection.confidence || 0);
      if (existing.cubicFeet && detection.cubicFeet) {
        existing.cubicFeet = Math.max(existing.cubicFeet, detection.cubicFeet);
      }
    } else {
      acc.push({ ...detection });
    }

    return acc;
  }, []);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(detections) {
  const roomBreakdown = {};

  let totalItems = 0;
  let totalCubicFeet = 0;

  for (const item of detections) {
    const qty = item.qty || 1;
    const cubicFeet = (item.cubicFeet || 10) * qty;
    const room = item.room || 'Unknown';

    totalItems += qty;
    totalCubicFeet += cubicFeet;

    if (!roomBreakdown[room]) {
      roomBreakdown[room] = { items: 0, cubicFeet: 0 };
    }
    roomBreakdown[room].items += qty;
    roomBreakdown[room].cubicFeet += cubicFeet;
  }

  return {
    totalItems,
    totalCubicFeet: Math.round(totalCubicFeet * 100) / 100,
    roomBreakdown
  };
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI test mode
if (process.argv.includes('--test')) {
  console.log('Running in test mode...');

  // Mock request/response for testing
  const mockReq = {
    method: 'POST',
    body: { zpid: process.argv[process.argv.indexOf('--test') + 1] || '20544803' }
  };

  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        console.log(`\nResponse (${code}):`);
        console.log(JSON.stringify(data, null, 2));
      },
      end: () => {}
    })
  };

  handler(mockReq, mockRes).catch(console.error);
}
