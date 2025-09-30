# 🚀 CLI Deployment Commands

## **Step 1: Authenticate**
```bash
npx supabase login
```

## **Step 2: Link Project**
```bash
npx supabase link --project-ref idbyrtwdeeruiutoukct
```

## **Step 3: Deploy Functions**
```bash
# Deploy each function
npx supabase functions deploy create-checkout-session-v2
npx supabase functions deploy create-topup-session-v2
npx supabase functions deploy stripe-checkout-v2
```

## **Step 4: Set Environment Variables**
```bash
# Set the Stripe secret key for each function
npx supabase secrets set STRIPE_SECRET_KEY=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
```

## **Alternative: Deploy All at Once**
```bash
# Deploy all functions in the edge-functions directory
npx supabase functions deploy
```

## **Verify Deployment**
```bash
# List deployed functions
npx supabase functions list
```
