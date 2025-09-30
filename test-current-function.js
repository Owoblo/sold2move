// Test script to check what's currently deployed
const testCurrentFunction = async () => {
  try {
    const response = await fetch('https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY' // Replace with your anon key
      },
      body: JSON.stringify({ priceId: 'price_1S4YXgCUfCzyitr0ECvYM6Lq' })
    });
    
    const result = await response.text();
    console.log('Response:', result);
    
    if (result.includes('No such customer')) {
      console.log('✅ Function is using LIVE mode (good!)');
      console.log('❌ But customer migration needed');
    } else if (result.includes('test mode')) {
      console.log('❌ Function is still using TEST mode');
    } else {
      console.log('🤔 Unexpected response:', result);
    }
  } catch (error) {
    console.log('Error testing function:', error.message);
  }
};

console.log('🧪 Testing Current Function...');
console.log('Run this in browser console with your anon key');
