// Quick test to check if the edge function is working
const testFunction = async () => {
  try {
    console.log('🧪 Testing edge function...');
    
    const response = await fetch('https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY' // Replace with your anon key
      },
      body: JSON.stringify({ 
        priceId: 'price_1S4YXgCUfCzyitr0ECvYM6Lq' 
      })
    });
    
    const result = await response.text();
    console.log('📡 Response status:', response.status);
    console.log('📡 Response body:', result);
    
    if (response.status === 200) {
      console.log('✅ Function is working!');
    } else {
      console.log('❌ Function error:', result);
    }
  } catch (error) {
    console.error('💥 Test error:', error);
  }
};

console.log('🚀 Run testFunction() in browser console to test the edge function');
