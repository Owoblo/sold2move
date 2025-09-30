#!/bin/bash

# Deploy Edge Functions to Supabase
echo "🚀 Deploying Edge Functions to Supabase..."

# Set your project reference
PROJECT_REF="idbyrtwdeeruiutoukct"

# Function names
FUNCTIONS=("create-checkout-session-v2" "create-topup-session-v2" "stripe-checkout-v2")

echo "📋 Functions to deploy:"
for func in "${FUNCTIONS[@]}"; do
    echo "  - $func"
done

echo ""
echo "🔧 Manual deployment steps:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "2. For each function above:"
echo "   a. Click 'Create new function'"
echo "   b. Name it exactly as shown"
echo "   c. Copy the code from edge-functions/[function-name].ts"
echo "   d. Set environment variable: STRIPE_SECRET_KEY = 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"
echo "   e. Deploy the function"
echo ""
echo "🎯 Alternative: Use Supabase CLI with authentication"
echo "1. Run: npx supabase login"
echo "2. Run: npx supabase link --project-ref $PROJECT_REF"
echo "3. Run: npx supabase functions deploy [function-name]"
echo ""
echo "✅ After deployment, test at: http://localhost:5173/test-checkout"
