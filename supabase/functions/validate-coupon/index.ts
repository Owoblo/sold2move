import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Validate Coupon
 * Real-time coupon validation endpoint
 */

interface ValidateCouponRequest {
  code: string;
  productPriceCents?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody: ValidateCouponRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { code, productPriceCents } = requestBody;

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Coupon code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey
    );

    // Fetch coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid coupon code',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check expiration
    const now = new Date();
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (validUntil && now > validUntil) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Coupon has expired',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Coupon usage limit reached',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate discount amount if product price provided
    let discountCents = 0;
    let discountDisplay = '';

    if (coupon.discount_type === 'percentage') {
      discountDisplay = `${coupon.discount_value}% off`;
      if (productPriceCents) {
        discountCents = Math.round(productPriceCents * (coupon.discount_value / 100));
      }
    } else {
      discountCents = Math.round(coupon.discount_value * 100);
      discountDisplay = `$${coupon.discount_value} off`;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountCents: discountCents,
        discountDisplay: discountDisplay,
        remainingUses: coupon.max_uses ? coupon.max_uses - coupon.current_uses : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in validate-coupon:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Failed to validate coupon',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
