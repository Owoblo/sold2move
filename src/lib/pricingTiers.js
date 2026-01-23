/**
 * Fixed Tier Pricing System
 *
 * Solo: $99/mo - 1 city
 * Special: $249/mo - 2 cities
 * Premium: $999/mo - Unlimited cities
 */

export const PRICING_TIERS = {
  solo: {
    id: 'solo',
    name: 'Solo',
    slug: 'solo-mover',
    price: 99,
    priceId: null, // Will be set from Stripe
    cityLimit: 1,
    extraCityPrice: 49, // $49 per additional city
    description: 'Perfect for owner-operators just getting started',
    shortDescription: 'For: Owner-operators, 1 truck',
    features: [
      { text: 'Access to listings in 1 city', included: true },
      { text: 'Address + sale price data', included: true },
      { text: 'Basic lead list export (CSV)', included: true },
      { text: 'Email support', included: true },
      { text: 'Homeowner contact info', included: false },
      { text: 'MovSense AI inventory detection', included: false },
      { text: 'Chain detection', included: false },
    ],
    highlighted: false,
    badge: null,
  },
  special: {
    id: 'special',
    name: 'Movers Special',
    slug: 'movers-special',
    price: 249,
    priceId: null, // Will be set from Stripe
    cityLimit: 2,
    extraCityPrice: 39, // $39 per additional city
    description: 'For growing companies actively marketing',
    shortDescription: 'For: Growing companies, 2-5 trucks',
    features: [
      { text: 'Everything in Solo', included: true },
      { text: '2 cities included', included: true },
      { text: 'Homeowner contact info (name, phone, email)', included: true },
      { text: 'MovSense AI inventory detection', included: true },
      { text: 'Likely-to-move intent signals', included: true },
      { text: 'CRM integration', included: true },
      { text: 'Chain detection', included: false },
      { text: 'Priority support', included: false },
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    slug: 'premium',
    price: 999,
    priceId: null, // Will be set from Stripe
    cityLimit: null, // Unlimited
    extraCityPrice: 0, // Included
    description: 'For franchises and multi-location operators',
    shortDescription: 'For: Franchises, serious volume players',
    features: [
      { text: 'Everything in Movers Special', included: true },
      { text: 'Unlimited cities', included: true },
      { text: 'Chain detection (buyer-seller linking)', included: true },
      { text: 'Priority support', included: true },
      { text: 'Dedicated onboarding call', included: true },
      { text: 'Team seats + manager analytics', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Mailing services at discounted rates', included: true },
    ],
    highlighted: false,
    badge: 'Best Value',
  },
};

/**
 * Get tier by ID
 */
export const getTier = (tierId) => {
  return PRICING_TIERS[tierId] || null;
};

/**
 * Get all tiers as array
 */
export const getAllTiers = () => {
  return Object.values(PRICING_TIERS);
};

/**
 * Calculate total price with extra cities
 */
export const calculateTotalPrice = (tierId, extraCities = 0) => {
  const tier = getTier(tierId);
  if (!tier) return null;

  const basePrice = tier.price;
  const extraCitiesPrice = extraCities * tier.extraCityPrice;

  return {
    basePrice,
    extraCitiesPrice,
    totalPrice: basePrice + extraCitiesPrice,
    cityLimit: tier.cityLimit,
    extraCities,
    totalCities: (tier.cityLimit || 0) + extraCities,
  };
};

/**
 * Format price for display
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined) {
    return 'Contact Sales';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Get feature access for a tier
 */
export const getTierFeatureAccess = (tierId) => {
  const accessMap = {
    solo: {
      listings: true,
      export: true,
      homeownerLookup: false,
      furnitureDetection: false,
      chainLeads: false,
      crmIntegration: false,
      prioritySupport: false,
      teamSeats: false,
      apiAccess: false,
    },
    special: {
      listings: true,
      export: true,
      homeownerLookup: true,
      furnitureDetection: true,
      chainLeads: false,
      crmIntegration: true,
      prioritySupport: false,
      teamSeats: false,
      apiAccess: false,
    },
    premium: {
      listings: true,
      export: true,
      homeownerLookup: true,
      furnitureDetection: true,
      chainLeads: true,
      crmIntegration: true,
      prioritySupport: true,
      teamSeats: true,
      apiAccess: true,
    },
  };

  return accessMap[tierId] || accessMap.solo;
};

/**
 * Check if user has access to a feature based on their tier
 */
export const hasFeatureAccess = (tierId, feature) => {
  const access = getTierFeatureAccess(tierId);
  return access[feature] || false;
};

export default {
  PRICING_TIERS,
  getTier,
  getAllTiers,
  calculateTotalPrice,
  formatPrice,
  getTierFeatureAccess,
  hasFeatureAccess,
};
