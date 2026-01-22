import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const BATCH_DATA_API_URL = 'https://api.batchdata.com/api/v1/property/skip-trace'

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

function generateAddressHash(street: string, city: string, state: string, zip: string): string {
  const normalized = `${street.toLowerCase().trim()}|${city.toLowerCase().trim()}|${state.toLowerCase().trim()}|${zip.trim()}`
  return btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

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

  const persons = response?.results?.persons || []

  if (persons.length > 0) {
    console.log('Parsing skip-trace format response, persons count:', persons.length)
    const person = persons[0]

    firstName = person?.name?.first || null
    lastName = person?.name?.last || null
    fullName = person?.name?.full || null

    if (person?.emails && Array.isArray(person.emails)) {
      for (const email of person.emails) {
        if (typeof email === 'string') {
          emails.push({ email, tested: false })
        } else if (email?.email) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      }
    }

    if (person?.enrichedEmails && Array.isArray(person.enrichedEmails)) {
      for (const email of person.enrichedEmails) {
        if (email?.email && !emails.some(e => e.email === email.email)) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      }
    }

    if (person?.phoneNumbers && Array.isArray(person.phoneNumbers)) {
      for (const phone of person.phoneNumbers) {
        if (phone?.number) {
          phoneNumbers.push({
            number: phone.number,
            type: phone.type || 'Unknown',
            carrier: phone.carrier || 'Unknown',
            score: String(phone.score || '0'),
            reachable: phone.reachable || false,
            dnc: phone.dnc || false,
            tested: phone.tested || false,
            firstReportedDate: phone.firstReportedDate,
            lastReportedDate: phone.lastReportedDate
          })
        }
      }
    }

    isLitigator = person?.litigator || person?.dnc?.tcpa || false
    hasDncPhone = phoneNumbers.some(p => p.dnc)
  }

  const owner = response?.results?.owner || response?.owner
  if (owner) {
    console.log('Parsing property lookup format response')
    fullName = fullName || owner?.fullName || null

    if (owner?.names && Array.isArray(owner.names) && owner.names.length > 0) {
      const primaryName = owner.names[0]
      firstName = firstName || primaryName?.first || null
      lastName = lastName || primaryName?.last || null
      fullName = fullName || primaryName?.full || null
    }

    if (owner?.phoneNumbers && Array.isArray(owner.phoneNumbers)) {
      for (const phone of owner.phoneNumbers) {
        if (phone?.number && !phoneNumbers.some(p => p.number === phone.number)) {
          phoneNumbers.push({
            number: phone.number,
            type: phone.type || 'Unknown',
            carrier: phone.carrier || 'Unknown',
            score: String(phone.score || '0'),
            reachable: phone.reachable || false,
            dnc: phone.dnc || false,
            tested: phone.tested || false,
            firstReportedDate: phone.firstReportedDate,
            lastReportedDate: phone.lastReportedDate
          })
        }
      }
    }

    if (owner?.emails && Array.isArray(owner.emails)) {
      for (const email of owner.emails) {
        const emailStr = typeof email === 'string' ? email : email?.email
        if (emailStr && !emails.some(e => e.email === emailStr)) {
          emails.push({ email: emailStr, tested: false })
        }
      }
    }

    if (owner?.enrichedEmails && Array.isArray(owner.enrichedEmails)) {
      for (const email of owner.enrichedEmails) {
        if (email?.email && !emails.some(e => e.email === email.email)) {
          emails.push({ email: email.email, tested: email.tested || false })
        }
      }
    }

    if (owner?.litigator) isLitigator = true
    if (owner?.dnc?.tcpa) isLitigator = true
  }

  phoneNumbers.sort((a, b) => parseInt(b.score) - parseInt(a.score))
  hasDncPhone = phoneNumbers.some(p => p.dnc)

  console.log('Parsed result:', { firstName, lastName, fullName, phonesCount: phoneNumbers.length, emailsCount: emails.length })

  return { firstName, lastName, fullName, emails, phoneNumbers, isLitigator, hasDncPhone }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Homeowner lookup request received')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const batchDataApiKey = Deno.env.get('BATCH_DATA_API_KEY')

    console.log('Environment check:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey, hasApiKey: !!batchDataApiKey })

    if (!batchDataApiKey) {
      return new Response(
        JSON.stringify({ error: 'BATCH_DATA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl ?? '', supabaseKey ?? '')

    let requestBody: LookupRequest
    try {
      requestBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { zpid, street, city, state, zip } = requestBody
    console.log('Lookup request:', { street, city, state, zip, zpid })

    if (!street || !city || !state || !zip) {
      return new Response(
        JSON.stringify({ error: 'Missing required address fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const addressHash = generateAddressHash(street, city, state, zip)

    // Check cache
    const cacheQuery = zpid
      ? supabaseClient.from('homeowner_lookups').select('*').eq('zpid', zpid)
      : supabaseClient.from('homeowner_lookups').select('*').eq('address_hash', addressHash)

    const { data: cachedData, error: cacheError } = await cacheQuery.maybeSingle()

    if (!cacheError && cachedData && cachedData.lookup_successful) {
      console.log('Cache hit!')
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            firstName: cachedData.homeowner_first_name,
            lastName: cachedData.homeowner_last_name,
            fullName: null,
            emails: cachedData.emails || [],
            phoneNumbers: cachedData.phone_numbers || [],
            isLitigator: cachedData.is_litigator || false,
            hasDncPhone: cachedData.has_dnc_phone || false,
            fromCache: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Cache miss, calling Batch Data API...')

    const apiResponse = await fetch(BATCH_DATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${batchDataApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        requests: [{ propertyAddress: { street, city, state, zip } }]
      })
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('Batch Data API error:', apiResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'API request failed', details: apiResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiData = await apiResponse.json()
    console.log('API response received')
    console.log('API results keys:', Object.keys(apiData?.results || {}))
    console.log('Persons array length:', apiData?.results?.persons?.length || 0)

    const parsedData = parseApiResponse(apiData)

    const matchCount = apiData?.results?.meta?.results?.matchCount || apiData?.meta?.matchCount || 0
    const hasPersons = (apiData?.results?.persons?.length || 0) > 0
    const hasParsedData = !!(parsedData.firstName || parsedData.lastName || parsedData.fullName || parsedData.phoneNumbers.length > 0 || parsedData.emails.length > 0)

    const lookupSuccessful = matchCount > 0 || hasPersons || hasParsedData

    console.log('Match check:', { matchCount, hasPersons, hasParsedData, lookupSuccessful })

    // Cache the result
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

    const { error: insertError } = await supabaseClient
      .from('homeowner_lookups')
      .upsert(cacheRecord, { onConflict: 'address_hash' })

    if (insertError) {
      console.error('Cache insert error:', insertError)
    } else {
      console.log('Cached successfully')
    }

    const responseData: HomeownerData = {
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      fullName: parsedData.fullName,
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
        message: lookupSuccessful ? 'Homeowner found' : 'No homeowner info found'
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
