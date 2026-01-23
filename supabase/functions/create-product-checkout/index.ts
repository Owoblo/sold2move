import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

/**
 * Create Product Checkout
 * Handles one-time purchases for design services (postcards, letters, handwritten cards)
 */

// Initialize Stripe
let stripe: Stripe;
try {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

interface ProductCheckoutRequest {
  productId: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  designNotes?: string;
  couponCode?: string;
  eSignature?: string;
  termsAgreedAt?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody: ProductCheckoutRequest;
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

    const { productId, customerInfo, designNotes, couponCode, eSignature, termsAgreedAt } = requestBody;

    // Validate required fields
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!customerInfo?.name || !customerInfo?.email) {
      return new Response(
        JSON.stringify({ error: 'Customer name and email are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase clients
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

    // Auth client for user context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    });

    // Admin client for database operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'User not authenticated',
          details: authError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing product checkout for user:', user.id);
    console.log('Product ID:', productId);

    // Fetch the product
    const { data: product, error: productError } = await supabaseAdmin
      .from('design_products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.error('Product fetch error:', productError);
      return new Response(
        JSON.stringify({
          error: 'Product not found or not available',
          details: productError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Found product:', product.name, 'Price:', product.price_cents);

    // Calculate discount if coupon provided
    let discountCents = 0;
    let validatedCoupon = null;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon && !couponError) {
        // Check if coupon is still valid
        const now = new Date();
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        if (validUntil && now > validUntil) {
          console.log('Coupon expired:', couponCode);
        } else if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          console.log('Coupon max uses reached:', couponCode);
        } else {
          validatedCoupon = coupon;
          if (coupon.discount_type === 'percentage') {
            discountCents = Math.round(product.price_cents * (coupon.discount_value / 100));
          } else {
            discountCents = Math.round(coupon.discount_value * 100);
          }
          console.log('Coupon applied:', couponCode, 'Discount:', discountCents);
        }
      }
    }

    const finalAmountCents = Math.max(0, product.price_cents - discountCents);

    // Get user profile for Stripe customer
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('stripe_customer_id, business_email, email, full_name')
      .eq('id', user.id)
      .single();

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        console.log('Using existing Stripe customer:', customerId);
      } catch (error) {
        console.log('Customer not found in Stripe, creating new one');
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerInfo.email || user.email,
        name: customerInfo.name || profile?.full_name,
        phone: customerInfo.phone,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created new Stripe customer:', customerId);

      // Update profile with customer ID
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create design order in database (pending status)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('design_orders')
      .insert({
        user_id: user.id,
        product_id: productId,
        status: 'pending',
        amount_cents: finalAmountCents,
        coupon_code: validatedCoupon?.code || null,
        discount_cents: discountCents,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        design_notes: designNotes || null,
        e_signature: eSignature || null,
        terms_agreed_at: termsAgreedAt ? new Date(termsAgreedAt).toISOString() : null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: orderError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Created order:', order.id);

    const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: finalAmountCents,
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                product_id: product.id,
                category: product.category,
              },
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/dashboard/orders?payment=success&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/products?payment=cancelled`,
      billing_address_collection: 'auto',
      metadata: {
        supabase_user_id: user.id,
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        coupon_code: validatedCoupon?.code || '',
      },
    });

    console.log('Checkout session created:', session.id);

    // Update order with Stripe session ID
    await supabaseAdmin
      .from('design_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    // Increment coupon usage if applicable
    if (validatedCoupon) {
      await supabaseAdmin
        .from('coupons')
        .update({ current_uses: validatedCoupon.current_uses + 1 })
        .eq('id', validatedCoupon.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        orderId: order.id,
        product: {
          id: product.id,
          name: product.name,
          price: product.price_cents,
        },
        discount: discountCents,
        finalAmount: finalAmountCents,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-product-checkout:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
