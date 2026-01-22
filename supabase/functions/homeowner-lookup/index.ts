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
  fullName: string | null
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
 * Handles both skip-trace format (results.persons) and property lookup format (owner)
 */
function parseApiResponse(response: any): {
  firstName: string | null
  lastName: string | null
  fullName: string | null
  emails: Email[]
  phoneNumbers: PhoneNumber[]
  isLitigator: boolean
  hasDncPhone: boolean
} {
  let firstName: string | null = null
  let lastName: string | null = null
  let fullName: string | null = null
  const emails: Email[] = []
  const phoneNumbers: PhoneNumber[] = []
  let isLitigator = false
  let hasDncPhone = false

  // Try skip-trace format first (results.persons)
  const persons = response?.results?.persons || []

  if (persons.length > 0) {
    console.log('Parsing skip-trace format response')
    const person = persons[0]

    // Parse name from skip-trace format
    firstName = person?.name?.first || null
    lastName = person?.name?.last || null

    // Parse emails
    if (person?.emails && Array.isArray(person.emails)) {
      person.emails.forEach((email: any) => {
        if (typeof email === 'string') {
          emails.push({ email, tested: false })
        } else if (email?.email) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      })
    }
    if (person?.enrichedEmails && Array.isArray(person.enrichedEmails)) {
      person.enrichedEmails.forEach((email: any) => {
        if (email?.email && !emails.some(e => e.email === email.email)) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      })
    }

    // Parse phone numbers
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

    isLitigator = person?.litigator || person?.dnc?.tcpa || false
    hasDncPhone = phoneNumbers.some(p => p.dnc)
  }

  // Try property lookup format (owner object)
  const owner = response?.results?.owner || response?.owner
  if (owner) {
    console.log('Parsing property lookup format response')

    // Get owner name
    fullName = owner?.fullName || null

    // Get first/last from names array if available
    if (owner?.names && Array.isArray(owner.names) && owner.names.length > 0) {
      const primaryName = owner.names[0]
      firstName = firstName || primaryName?.first || null
      lastName = lastName || primaryName?.last || null
      fullName = fullName || primaryName?.full || null
    }

    // Check for contact info in owner object (phoneNumbers per Batch Data schema)
    if (owner?.phoneNumbers && Array.isArray(owner.phoneNumbers)) {
      console.log(`Found ${owner.phoneNumbers.length} phone numbers in owner object`)
      owner.phoneNumbers.forEach((phone: any) => {
        if (phone?.number && !phoneNumbers.some(p => p.number === phone.number)) {
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

    // Check for emails in owner object
    if (owner?.emails && Array.isArray(owner.emails)) {
      console.log(`Found ${owner.emails.length} emails in owner object`)
      owner.emails.forEach((email: any) => {
        const emailStr = typeof email === 'string' ? email : email?.email
        if (emailStr && !emails.some(e => e.email === emailStr)) {
          emails.push({ email: emailStr, tested: false })
        }
      })
    }

    // Check for enriched emails
    if (owner?.enrichedEmails && Array.isArray(owner.enrichedEmails)) {
      console.log(`Found ${owner.enrichedEmails.length} enriched emails`)
      owner.enrichedEmails.forEach((email: any) => {
        if (email?.email && !emails.some(e => e.email === email.email)) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      })
    }

    // Check for litigator/TCPA flags
    if (owner?.litigator) {
      isLitigator = true
    }
    if (owner?.dnc?.tcpa) {
      isLitigator = true
    }
  }

  // Also check top-level results for contact enrichment data
  const contactEnrichment = response?.results?.contactEnrichment || response?.contactEnrichment
  if (contactEnrichment) {
    console.log('Found contact enrichment data')

    if (contactEnrichment?.phoneNumbers && Array.isArray(contactEnrichment.phoneNumbers)) {
      contactEnrichment.phoneNumbers.forEach((phone: any) => {
        if (phone?.number && !phoneNumbers.some(p => p.number === phone.number)) {
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

    if (contactEnrichment?.emails && Array.isArray(contactEnrichment.emails)) {
      contactEnrichment.emails.forEach((email: any) => {
        const emailStr = typeof email === 'string' ? email : email?.email
        if (emailStr && !emails.some(e => e.email === emailStr)) {
          emails.push({ email: emailStr, tested: false })
        }
      })
    }

    if (contactEnrichment?.enrichedEmails && Array.isArray(contactEnrichment.enrichedEmails)) {
      contactEnrichment.enrichedEmails.forEach((email: any) => {
        if (email?.email && !emails.some(e => e.email === email.email)) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      })
    }
  }

  // Sort phone numbers by score (highest first)
  phoneNumbers.sort((a, b) => parseInt(b.score) - parseInt(a.score))

  // Update hasDncPhone
  hasDncPhone = phoneNumbers.some(p => p.dnc)

  console.log(`Parsed: firstName=${firstName}, lastName=${lastName}, fullName=${fullName}, phones=${phoneNumbers.length}, emails=${emails.length}`)

  return {
    firstName,
    lastName,
    fullName,
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

  console.log('Homeowner lookup request received')

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('SUPABASE_URL configured:', !!supabaseUrl)
    console.log('SUPABASE_SERVICE_ROLE_KEY configured:', !!supabaseKey)

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    )

    // Get Batch Data API key
    const batchDataApiKey = Deno.env.get('BATCH_DATA_API_KEY')
    console.log('BATCH_DATA_API_KEY configured:', !!batchDataApiKey)

    if (!batchDataApiKey) {
      console.error('BATCH_DATA_API_KEY not configured in environment')
      return new Response(
        JSON.stringify({ error: 'Homeowner lookup service not configured. Please add BATCH_DATA_API_KEY to Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let requestBody: LookupRequest
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { zpid, street, city, state, zip } = requestBody
    console.log('Lookup request for:', { street, city, state, zip, zpid })

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
    console.log('API Response meta:', JSON.stringify(apiData?.meta || {}))
    console.log('API Response results keys:', Object.keys(apiData?.results || {}))
    console.log('Persons found:', apiData?.results?.persons?.length || 0)

    // Parse the response first
    const parsedData = parseApiResponse(apiData)

    // Check if we got a successful match - multiple ways to determine this
    const matchCount = apiData?.meta?.matchCount || 0
    const hasOwner = !!(apiData?.results?.owner || apiData?.owner)
    const hasPersons = (apiData?.results?.persons?.length || 0) > 0
    const hasParsedData = !!(parsedData.firstName || parsedData.lastName || parsedData.fullName || parsedData.phoneNumbers.length > 0 || parsedData.emails.length > 0)

    const lookupSuccessful = matchCount > 0 || hasOwner || hasPersons || hasParsedData

    console.log(`Match indicators: matchCount=${matchCount}, hasOwner=${hasOwner}, hasPersons=${hasPersons}, hasParsedData=${hasParsedData}`)
    console.log(`Lookup successful: ${lookupSuccessful}`)

    // Log full response if no matches found for debugging
    if (!lookupSuccessful) {
      console.log('No matches found. Full API response:', JSON.stringify(apiData, null, 2))
    }

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

    // Try to insert, if conflict update instead
    console.log('Attempting to cache result...')
    const { error: insertError } = await supabaseClient
      .from('homeowner_lookups')
      .upsert(cacheRecord, {
        onConflict: 'address_hash'
      })

    if (insertError) {
      console.error('Failed to cache homeowner lookup:', JSON.stringify(insertError))
      // Don't fail the request, just log the error - caching is best effort
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
