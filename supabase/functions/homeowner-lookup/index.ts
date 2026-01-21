import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

// Batch Data API configuration
const BATCH_DATA_API_URL = 'https://api.batchdata.com/api/v1/property/skip-trace'

interface PropertyAddress {
  street: string
  city: string
  state: string
  zip: string
}

interface LookupRequest {
  zpid?: string
  street: string
  city: string
  state: string
  zip: string
}

interface PhoneNumber {
  number: string
  type: string
  carrier: string
  score: string
  reachable: boolean
  dnc: boolean
  tested: boolean
  firstReportedDate?: string
  lastReportedDate?: string
}

interface Email {
  email: string
  tested?: boolean
}

interface HomeownerData {
  firstName: string | null
  lastName: string | null
  emails: Email[]
  phoneNumbers: PhoneNumber[]
  isLitigator: boolean
  hasDncPhone: boolean
  fromCache: boolean
}

/**
 * Generate a normalized hash of an address for cache lookups
 */
function generateAddressHash(street: string, city: string, state: string, zip: string): string {
  const normalized = `${street.toLowerCase().trim()}|${city.toLowerCase().trim()}|${state.toLowerCase().trim()}|${zip.trim()}`
  // Simple hash using built-in crypto
  return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

/**
 * Parse the Batch Data API response into our simplified format
 */
function parseApiResponse(response: any): {
  firstName: string | null
  lastName: string | null
  emails: Email[]
  phoneNumbers: PhoneNumber[]
  isLitigator: boolean
  hasDncPhone: boolean
} {
  const persons = response?.results?.persons || []

  if (persons.length === 0) {
    return {
      firstName: null,
      lastName: null,
      emails: [],
      phoneNumbers: [],
      isLitigator: false,
      hasDncPhone: false
    }
  }

  // Use the first person (primary owner)
  const person = persons[0]

  // Parse name
  const firstName = person?.name?.first || null
  const lastName = person?.name?.last || null

  // Parse emails
  const emails: Email[] = []
  if (person?.emails && Array.isArray(person.emails)) {
    person.emails.forEach((email: any) => {
      if (typeof email === 'string') {
        emails.push({ email, tested: false })
      } else if (email?.email) {
        emails.push({ email: email.email, tested: email.tested || false })
      }
    })
  }
  // Also check enrichedEmails if available
  if (person?.enrichedEmails && Array.isArray(person.enrichedEmails)) {
    person.enrichedEmails.forEach((email: any) => {
      if (email?.email && !emails.some(e => e.email === email.email)) {
        emails.push({ email: email.email, tested: email.tested || false })
      }
    })
  }

  // Parse phone numbers
  const phoneNumbers: PhoneNumber[] = []
  if (person?.phoneNumbers && Array.isArray(person.phoneNumbers)) {
    person.phoneNumbers.forEach((phone: any) => {
      if (phone?.number) {
        phoneNumbers.push({
          number: phone.number,
          type: phone.type || 'Unknown',
          carrier: phone.carrier || 'Unknown',
          score: phone.score || '0',
          reachable: phone.reachable || false,
          dnc: phone.dnc || false,
          tested: phone.tested || false,
          firstReportedDate: phone.firstReportedDate,
          lastReportedDate: phone.lastReportedDate
        })
      }
    })
  }

  // Sort phone numbers by score (highest first)
  phoneNumbers.sort((a, b) => parseInt(b.score) - parseInt(a.score))

  // Check for litigator flag
  const isLitigator = person?.litigator || person?.dnc?.tcpa || false

  // Check if any phone is on DNC list
  const hasDncPhone = phoneNumbers.some(p => p.dnc)

  return {
    firstName,
    lastName,
    emails,
    phoneNumbers,
    isLitigator,
    hasDncPhone
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Batch Data API key
    const batchDataApiKey = Deno.env.get('BATCH_DATA_API_KEY')
    if (!batchDataApiKey) {
      console.error('BATCH_DATA_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Homeowner lookup service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { zpid, street, city, state, zip }: LookupRequest = await req.json()

    // Validate required fields
    if (!street || !city || !state || !zip) {
      return new Response(
        JSON.stringify({ error: 'Missing required address fields: street, city, state, zip' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Homeowner lookup request for: ${street}, ${city}, ${state} ${zip}`)

    // Generate address hash for cache lookup
    const addressHash = generateAddressHash(street, city, state, zip)

    // Check cache first
    let cacheQuery = supabaseClient
      .from('homeowner_lookups')
      .select('*')

    // Prefer zpid lookup if available, otherwise use address hash
    if (zpid) {
      cacheQuery = cacheQuery.eq('zpid', zpid)
    } else {
      cacheQuery = cacheQuery.eq('address_hash', addressHash)
    }

    const { data: cachedData, error: cacheError } = await cacheQuery.maybeSingle()

    if (!cacheError && cachedData && cachedData.lookup_successful) {
      console.log('Cache hit! Returning cached homeowner data')
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            firstName: cachedData.homeowner_first_name,
            lastName: cachedData.homeowner_last_name,
            emails: cachedData.emails || [],
            phoneNumbers: cachedData.phone_numbers || [],
            isLitigator: cachedData.is_litigator || false,
            hasDncPhone: cachedData.has_dnc_phone || false,
            fromCache: true,
            cachedAt: cachedData.created_at
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Cache miss. Calling Batch Data API...')

    // Call Batch Data API
    const apiResponse = await fetch(BATCH_DATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${batchDataApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            propertyAddress: {
              street,
              city,
              state,
              zip
            }
          }
        ]
      })
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error(`Batch Data API error: ${apiResponse.status} - ${errorText}`)
      return new Response(
        JSON.stringify({
          error: 'Failed to lookup homeowner information',
          details: `API returned ${apiResponse.status}`
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiData = await apiResponse.json()
    console.log('Batch Data API response received')

    // Check if we got a successful match
    const matchCount = apiData?.meta?.matchCount || 0
    const lookupSuccessful = matchCount > 0

    // Parse the response
    const parsedData = parseApiResponse(apiData)

    // Store in cache
    const cacheRecord = {
      zpid: zpid || null,
      address_street: street,
      address_city: city,
      address_state: state,
      address_zip: zip,
      address_hash: addressHash,
      homeowner_first_name: parsedData.firstName,
      homeowner_last_name: parsedData.lastName,
      emails: parsedData.emails,
      phone_numbers: parsedData.phoneNumbers,
      is_litigator: parsedData.isLitigator,
      has_dnc_phone: parsedData.hasDncPhone,
      raw_response: apiData,
      lookup_successful: lookupSuccessful,
      updated_at: new Date().toISOString()
    }

    // Upsert to handle both insert and update cases
    const { error: insertError } = await supabaseClient
      .from('homeowner_lookups')
      .upsert(cacheRecord, {
        onConflict: zpid ? 'zpid' : 'address_hash',
        ignoreDuplicates: false
      })

    if (insertError) {
      console.error('Failed to cache homeowner lookup:', insertError)
      // Don't fail the request, just log the error
    } else {
      console.log('Homeowner data cached successfully')
    }

    // Return the response
    const responseData: HomeownerData = {
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      emails: parsedData.emails,
      phoneNumbers: parsedData.phoneNumbers,
      isLitigator: parsedData.isLitigator,
      hasDncPhone: parsedData.hasDncPhone,
      fromCache: false
    }

    return new Response(
      JSON.stringify({
        success: lookupSuccessful,
        data: responseData,
        message: lookupSuccessful
          ? 'Homeowner information found'
          : 'No homeowner information found for this address'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in homeowner-lookup function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
