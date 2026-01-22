import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

// Batch Data API endpoints
const BATCH_DATA_PROPERTY_URL = 'https://api.batchdata.com/api/v1/property/details'
const BATCH_DATA_PERSON_SEARCH_URL = 'https://api.batchdata.com/api/v1/person/property-search'

interface DetectChainRequest {
  // Can provide a listing ID to detect chains for a specific sold listing
  soldListingId?: string
  // Or provide address directly
  street?: string
  city?: string
  state?: string
  zip?: string
  // Optional: limit how many chains to detect in batch mode
  limit?: number
}

interface PropertyOwnership {
  address: string
  city: string
  state: string
  zip: string
  ownerName: string
  mailingAddress?: string
  propertyAddress?: string
  lastSaleDate?: string
}

interface ChainMatch {
  soldAddress: string
  soldCity: string
  soldState: string
  soldZip: string
  saleDate: string | null
  salePrice: number | null
  buyerName: string
  buyerNameNormalized: string
  ownedPropertyAddress: string
  ownedPropertyCity: string
  ownedPropertyState: string
  ownedPropertyZip: string
  confidenceScore: number
  matchSignals: Record<string, boolean>
}

// Normalize name for matching: lowercase, remove middle initials, trim
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+[a-z]\.?\s+/g, ' ') // Remove middle initials
    .replace(/\s+/g, ' ')
    .trim()
}

// Calculate fuzzy match score between two names (0-100)
function fuzzyNameMatch(name1: string, name2: string): number {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)

  if (n1 === n2) return 100

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 85

  // Split into parts and compare
  const parts1 = n1.split(' ').filter(p => p.length > 1)
  const parts2 = n2.split(' ').filter(p => p.length > 1)

  let matches = 0
  for (const p1 of parts1) {
    if (parts2.some(p2 => p2 === p1 || p2.startsWith(p1) || p1.startsWith(p2))) {
      matches++
    }
  }

  const matchRatio = matches / Math.max(parts1.length, parts2.length)
  return Math.round(matchRatio * 80)
}

// Calculate confidence score for a chain match
function calculateConfidence(
  buyerName: string,
  ownedPropertyOwnerName: string,
  mailingMismatch: boolean,
  sameState: boolean,
  recentSale: boolean
): { score: number; signals: Record<string, boolean> } {
  let score = 0
  const signals: Record<string, boolean> = {}

  // Name matching (up to 40 points)
  const nameScore = fuzzyNameMatch(buyerName, ownedPropertyOwnerName)
  if (nameScore >= 100) {
    score += 40
    signals.exactNameMatch = true
  } else if (nameScore >= 85) {
    score += 25
    signals.fuzzyNameMatch = true
  } else if (nameScore >= 60) {
    score += 15
    signals.partialNameMatch = true
  }

  // Mailing address doesn't match property (strong signal they don't live there)
  if (mailingMismatch) {
    score += 20
    signals.mailingMismatch = true
  }

  // Properties in same state (more likely to be same person)
  if (sameState) {
    score += 10
    signals.sameState = true
  }

  // Recent sale (within 30 days)
  if (recentSale) {
    score += 5
    signals.recentSale = true
  }

  return { score: Math.min(score, 100), signals }
}

// Get buyer info from a sold property using Batch Data property details
async function getBuyerInfo(
  apiKey: string,
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<{
  buyerName: string | null
  buyerMailingAddress: string | null
  saleDate: string | null
  salePrice: number | null
} | null> {
  console.log('Getting buyer info for:', { street, city, state, zip })

  try {
    const response = await fetch(BATCH_DATA_PROPERTY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          propertyAddress: { street, city, state, zip }
        }]
      })
    })

    if (!response.ok) {
      console.error('Property details API error:', response.status)
      return null
    }

    const data = await response.json()
    console.log('Property details response keys:', Object.keys(data?.results || {}))

    // Extract buyer info from transaction/deed data
    const property = data?.results?.property || data?.property
    const transactions = property?.transactions || property?.saleHistory || []
    const lastTransaction = transactions[0] // Most recent

    // Try to get buyer name from various possible locations
    let buyerName = lastTransaction?.buyerNames?.[0] ||
                    lastTransaction?.buyer?.name ||
                    property?.owner?.names?.[0]?.full ||
                    property?.owner?.fullName

    const buyerMailingAddress = property?.owner?.mailingAddress?.full ||
                                property?.mailingAddress?.full ||
                                null

    const saleDate = lastTransaction?.saleDate ||
                     lastTransaction?.recordingDate ||
                     property?.lastSaleDate ||
                     null

    const salePrice = lastTransaction?.salePrice ||
                      property?.lastSalePrice ||
                      null

    console.log('Extracted buyer info:', { buyerName, saleDate, salePrice })

    return {
      buyerName: buyerName || null,
      buyerMailingAddress,
      saleDate,
      salePrice
    }
  } catch (error) {
    console.error('Error getting buyer info:', error)
    return null
  }
}

// Search for other properties owned by a person
async function searchOwnedProperties(
  apiKey: string,
  ownerName: string,
  excludeAddress?: string
): Promise<PropertyOwnership[]> {
  console.log('Searching for properties owned by:', ownerName)

  try {
    const response = await fetch(BATCH_DATA_PERSON_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: ownerName,
        // Could add state filter to narrow results
      })
    })

    if (!response.ok) {
      console.error('Person property search API error:', response.status)
      return []
    }

    const data = await response.json()
    console.log('Person search response, properties found:', data?.results?.properties?.length || 0)

    const properties: PropertyOwnership[] = []
    const rawProperties = data?.results?.properties || data?.properties || []

    for (const prop of rawProperties) {
      const address = prop?.address?.full ||
                      `${prop?.address?.street || ''} ${prop?.address?.city || ''} ${prop?.address?.state || ''} ${prop?.address?.zip || ''}`.trim()

      // Skip if this is the property they just bought
      if (excludeAddress && address.toLowerCase().includes(excludeAddress.toLowerCase())) {
        continue
      }

      properties.push({
        address: prop?.address?.street || address,
        city: prop?.address?.city || '',
        state: prop?.address?.state || '',
        zip: prop?.address?.zip || '',
        ownerName: prop?.owner?.name || prop?.ownerName || ownerName,
        mailingAddress: prop?.mailingAddress?.full,
        propertyAddress: prop?.address?.full,
        lastSaleDate: prop?.lastSaleDate
      })
    }

    return properties
  } catch (error) {
    console.error('Error searching owned properties:', error)
    return []
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Chain detection request received')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const batchDataApiKey = Deno.env.get('BATCH_DATA_API_KEY')

    if (!batchDataApiKey) {
      return new Response(
        JSON.stringify({ error: 'BATCH_DATA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')

    let requestBody: DetectChainRequest
    try {
      requestBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { soldListingId, street, city, state, zip, limit = 10 } = requestBody

    const chainsDetected: ChainMatch[] = []

    // Mode 1: Detect chain for a specific sold listing
    if (soldListingId) {
      console.log('Detecting chain for listing:', soldListingId)

      const { data: listing, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', soldListingId)
        .single()

      if (error || !listing) {
        return new Response(
          JSON.stringify({ error: 'Listing not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const soldStreet = listing.addressstreet || listing.address
      const soldCity = listing.addresscity || listing.lastcity
      const soldState = listing.addressstate
      const soldZip = listing.addresszipcode

      // Get buyer info
      const buyerInfo = await getBuyerInfo(batchDataApiKey, soldStreet, soldCity, soldState, soldZip)

      if (!buyerInfo?.buyerName) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not determine buyer name from deed records',
            chainsDetected: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Search for other properties owned by buyer
      const ownedProperties = await searchOwnedProperties(
        batchDataApiKey,
        buyerInfo.buyerName,
        soldStreet
      )

      console.log('Found owned properties:', ownedProperties.length)

      // Score each potential chain
      for (const ownedProp of ownedProperties) {
        const mailingMismatch = ownedProp.mailingAddress !== ownedProp.propertyAddress
        const sameState = ownedProp.state.toLowerCase() === soldState.toLowerCase()
        const recentSale = buyerInfo.saleDate
          ? (Date.now() - new Date(buyerInfo.saleDate).getTime()) < 30 * 24 * 60 * 60 * 1000
          : false

        const { score, signals } = calculateConfidence(
          buyerInfo.buyerName,
          ownedProp.ownerName,
          mailingMismatch,
          sameState,
          recentSale
        )

        // Only include if confidence >= 60
        if (score >= 60) {
          chainsDetected.push({
            soldAddress: soldStreet,
            soldCity,
            soldState,
            soldZip,
            saleDate: buyerInfo.saleDate,
            salePrice: buyerInfo.salePrice,
            buyerName: buyerInfo.buyerName,
            buyerNameNormalized: normalizeName(buyerInfo.buyerName),
            ownedPropertyAddress: ownedProp.address,
            ownedPropertyCity: ownedProp.city,
            ownedPropertyState: ownedProp.state,
            ownedPropertyZip: ownedProp.zip,
            confidenceScore: score,
            matchSignals: signals
          })
        }
      }
    }
    // Mode 2: Detect from provided address
    else if (street && city && state && zip) {
      console.log('Detecting chain for address:', { street, city, state, zip })

      const buyerInfo = await getBuyerInfo(batchDataApiKey, street, city, state, zip)

      if (!buyerInfo?.buyerName) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not determine buyer name from deed records',
            chainsDetected: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const ownedProperties = await searchOwnedProperties(
        batchDataApiKey,
        buyerInfo.buyerName,
        street
      )

      for (const ownedProp of ownedProperties) {
        const mailingMismatch = ownedProp.mailingAddress !== ownedProp.propertyAddress
        const sameState = ownedProp.state.toLowerCase() === state.toLowerCase()
        const recentSale = buyerInfo.saleDate
          ? (Date.now() - new Date(buyerInfo.saleDate).getTime()) < 30 * 24 * 60 * 60 * 1000
          : false

        const { score, signals } = calculateConfidence(
          buyerInfo.buyerName,
          ownedProp.ownerName,
          mailingMismatch,
          sameState,
          recentSale
        )

        if (score >= 60) {
          chainsDetected.push({
            soldAddress: street,
            soldCity: city,
            soldState: state,
            soldZip: zip,
            saleDate: buyerInfo.saleDate,
            salePrice: buyerInfo.salePrice,
            buyerName: buyerInfo.buyerName,
            buyerNameNormalized: normalizeName(buyerInfo.buyerName),
            ownedPropertyAddress: ownedProp.address,
            ownedPropertyCity: ownedProp.city,
            ownedPropertyState: ownedProp.state,
            ownedPropertyZip: ownedProp.zip,
            confidenceScore: score,
            matchSignals: signals
          })
        }
      }
    }
    // Mode 3: Batch scan recent sold listings
    else {
      console.log('Batch scanning recent sold listings')

      // Get recent sold listings that haven't been processed
      const { data: soldListings, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'sold')
        .order('lastseenat', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching sold listings:', error)
      }

      // Check which ones already have chains detected
      const listingIds = soldListings?.map(l => l.id) || []
      const { data: existingChains } = await supabase
        .from('ownership_chains')
        .select('sold_listing_id')
        .in('sold_listing_id', listingIds)

      const processedIds = new Set(existingChains?.map(c => c.sold_listing_id) || [])
      const unprocessedListings = soldListings?.filter(l => !processedIds.has(l.id)) || []

      console.log(`Processing ${unprocessedListings.length} unprocessed sold listings`)

      for (const listing of unprocessedListings.slice(0, 5)) { // Process max 5 at a time
        const soldStreet = listing.addressstreet || listing.address
        const soldCity = listing.addresscity || listing.lastcity
        const soldState = listing.addressstate
        const soldZip = listing.addresszipcode

        if (!soldStreet || !soldCity || !soldState) continue

        const buyerInfo = await getBuyerInfo(batchDataApiKey, soldStreet, soldCity, soldState, soldZip || '')

        if (!buyerInfo?.buyerName) continue

        const ownedProperties = await searchOwnedProperties(
          batchDataApiKey,
          buyerInfo.buyerName,
          soldStreet
        )

        for (const ownedProp of ownedProperties) {
          const mailingMismatch = ownedProp.mailingAddress !== ownedProp.propertyAddress
          const sameState = ownedProp.state.toLowerCase() === soldState.toLowerCase()
          const recentSale = buyerInfo.saleDate
            ? (Date.now() - new Date(buyerInfo.saleDate).getTime()) < 30 * 24 * 60 * 60 * 1000
            : false

          const { score, signals } = calculateConfidence(
            buyerInfo.buyerName,
            ownedProp.ownerName,
            mailingMismatch,
            sameState,
            recentSale
          )

          if (score >= 60) {
            chainsDetected.push({
              soldAddress: soldStreet,
              soldCity,
              soldState,
              soldZip: soldZip || '',
              saleDate: buyerInfo.saleDate,
              salePrice: buyerInfo.salePrice,
              buyerName: buyerInfo.buyerName,
              buyerNameNormalized: normalizeName(buyerInfo.buyerName),
              ownedPropertyAddress: ownedProp.address,
              ownedPropertyCity: ownedProp.city,
              ownedPropertyState: ownedProp.state,
              ownedPropertyZip: ownedProp.zip,
              confidenceScore: score,
              matchSignals: signals
            })
          }
        }
      }
    }

    // Sort by confidence score
    chainsDetected.sort((a, b) => b.confidenceScore - a.confidenceScore)

    // Save detected chains to database
    if (chainsDetected.length > 0) {
      console.log(`Saving ${chainsDetected.length} detected chains`)

      for (const chain of chainsDetected) {
        const { error: insertError } = await supabase
          .from('ownership_chains')
          .upsert({
            sold_listing_id: soldListingId || null,
            sold_address: chain.soldAddress,
            sold_city: chain.soldCity,
            sold_state: chain.soldState,
            sold_zip: chain.soldZip,
            sale_date: chain.saleDate,
            sale_price: chain.salePrice,
            buyer_name: chain.buyerName,
            buyer_name_normalized: chain.buyerNameNormalized,
            owned_property_address: chain.ownedPropertyAddress,
            owned_property_city: chain.ownedPropertyCity,
            owned_property_state: chain.ownedPropertyState,
            owned_property_zip: chain.ownedPropertyZip,
            confidence_score: chain.confidenceScore,
            match_signals: chain.matchSignals,
            chain_status: 'detected'
          }, {
            onConflict: 'sold_address,owned_property_address',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error('Error saving chain:', insertError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chainsDetected: chainsDetected.length,
        chains: chainsDetected,
        message: chainsDetected.length > 0
          ? `Found ${chainsDetected.length} potential chain lead(s)`
          : 'No chains detected'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
