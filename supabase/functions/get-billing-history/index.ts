import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

/**
 * Get Billing History
 *
 * Fetches recent invoices from Stripe for the authenticated user.
 * Returns formatted invoice list with amounts, dates, status, and PDF links.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user's Stripe customer ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profile?.stripe_customer_id) {
      // No Stripe customer yet - return empty invoices
      return new Response(
        JSON.stringify({ invoices: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 10,
    });

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map((invoice) => {
      // Get description from line items
      let description = 'Sold2Move Subscription';
      if (invoice.lines.data.length > 0) {
        const lineItem = invoice.lines.data[0];
        description = lineItem.description || lineItem.price?.nickname || description;
      }

      // Format amount
      const amount = invoice.amount_paid || invoice.amount_due || 0;
      const amountFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: invoice.currency?.toUpperCase() || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount / 100);

      // Format date
      const date = invoice.created
        ? new Date(invoice.created * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'N/A';

      return {
        id: invoice.id,
        amount,
        amountFormatted,
        status: invoice.status || 'unknown',
        date,
        pdfUrl: invoice.invoice_pdf || null,
        hostedUrl: invoice.hosted_invoice_url || null,
        description,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      };
    });

    console.log(`Fetched ${formattedInvoices.length} invoices for user ${user.id}`);

    return new Response(
      JSON.stringify({ invoices: formattedInvoices }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching billing history:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch billing history' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
