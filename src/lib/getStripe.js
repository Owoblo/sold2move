import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) throw new Error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}