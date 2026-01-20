/**
 * Population-Based Tier Pricing Utilities
 *
 * Pricing Formula:
 * - Tier 2 (Movers Special/Premium) = (0.00012 × Total Population) + 46
 * - Tier 1 (Basic) = Tier 2 / 2
 * - Minimum Floor: $25/month for any tier
 */

// Pricing constants
export const PRICING_CONSTANTS = {
  POPULATION_MULTIPLIER: 0.00012,
  BASE_PRICE: 46,
  TIER_1_DIVISOR: 2,
  MINIMUM_PRICE: 25,
  CURRENCY: 'CAD',
};

// Tier definitions
export const TIERS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential features for small operators',
    features: [
      'Access to leads in selected cities',
      'CSV export',
      'Email support',
      'Basic filters',
    ],
  },
  moversSpecial: {
    id: 'moversSpecial',
    name: 'Movers Special',
    description: 'Full features for serious marketers',
    features: [
      'Full access to all leads',
      'CSV + CRM export',
      'Priority support',
      'Advanced filters',
      'Lead notifications',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large teams',
    features: [
      'Everything in Movers Special',
      'Dedicated account manager',
      'Custom integrations',
      'API access',
      'White-label options',
    ],
    isCustomPricing: true,
  },
};

/**
 * Calculate monthly prices for all tiers based on total population
 * @param {number} totalPopulation - Sum of populations of all selected cities
 * @returns {Object} Prices for each tier
 */
export const calculatePrice = (totalPopulation) => {
  if (!totalPopulation || totalPopulation <= 0) {
    return {
      basic: PRICING_CONSTANTS.MINIMUM_PRICE,
      moversSpecial: PRICING_CONSTANTS.MINIMUM_PRICE,
      enterprise: null, // Custom pricing
      totalPopulation: 0,
    };
  }

  // Tier 2 formula: (0.00012 × population) + 46
  const tier2Price = (PRICING_CONSTANTS.POPULATION_MULTIPLIER * totalPopulation) + PRICING_CONSTANTS.BASE_PRICE;

  // Tier 1 is half of Tier 2
  const tier1Price = tier2Price / PRICING_CONSTANTS.TIER_1_DIVISOR;

  // Apply minimum floor and round to 2 decimal places
  const basicPrice = Math.max(PRICING_CONSTANTS.MINIMUM_PRICE, Math.round(tier1Price * 100) / 100);
  const moversSpecialPrice = Math.max(PRICING_CONSTANTS.MINIMUM_PRICE, Math.round(tier2Price * 100) / 100);

  return {
    basic: basicPrice,
    moversSpecial: moversSpecialPrice,
    enterprise: null, // Custom pricing - contact sales
    totalPopulation,
  };
};

/**
 * Format price for display
 * @param {number} price - Price in dollars
 * @param {string} currency - Currency code (default: CAD)
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = PRICING_CONSTANTS.CURRENCY) => {
  if (price === null || price === undefined) {
    return 'Contact Sales';
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Format population for display
 * @param {number} population - Population number
 * @returns {string} Formatted population string
 */
export const formatPopulation = (population) => {
  if (!population) return '0';

  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  }
  if (population >= 1000) {
    return `${(population / 1000).toFixed(0)}K`;
  }
  return population.toLocaleString();
};

/**
 * Calculate price breakdown by city
 * @param {Array} cities - Array of city objects with population
 * @returns {Object} Price breakdown including per-city contribution
 */
export const calculatePriceBreakdown = (cities) => {
  if (!cities || cities.length === 0) {
    return {
      cities: [],
      totalPopulation: 0,
      prices: calculatePrice(0),
    };
  }

  const totalPopulation = cities.reduce((sum, city) => sum + (city.population || 0), 0);
  const prices = calculatePrice(totalPopulation);

  // Calculate each city's contribution percentage
  const citiesWithContribution = cities.map(city => ({
    ...city,
    populationPercentage: totalPopulation > 0
      ? Math.round((city.population / totalPopulation) * 100)
      : 0,
    priceContribution: {
      basic: totalPopulation > 0
        ? Math.round((city.population / totalPopulation) * prices.basic * 100) / 100
        : 0,
      moversSpecial: totalPopulation > 0
        ? Math.round((city.population / totalPopulation) * prices.moversSpecial * 100) / 100
        : 0,
    },
  }));

  return {
    cities: citiesWithContribution,
    totalPopulation,
    prices,
  };
};

/**
 * Get tier by ID
 * @param {string} tierId - Tier ID
 * @returns {Object|null} Tier object or null
 */
export const getTier = (tierId) => {
  return TIERS[tierId] || null;
};

/**
 * Get all available tiers
 * @returns {Array} Array of tier objects
 */
export const getAllTiers = () => {
  return Object.values(TIERS);
};

/**
 * Convert price to cents for Stripe
 * @param {number} price - Price in dollars
 * @returns {number} Price in cents
 */
export const priceToCents = (price) => {
  return Math.round(price * 100);
};

/**
 * Convert cents to price for display
 * @param {number} cents - Price in cents
 * @returns {number} Price in dollars
 */
export const centsToPrice = (cents) => {
  return cents / 100;
};

/**
 * Validate selected cities for pricing
 * @param {Array} cities - Array of city objects
 * @returns {Object} Validation result
 */
export const validateCitiesForPricing = (cities) => {
  if (!cities || cities.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one city',
    };
  }

  const citiesWithoutPopulation = cities.filter(c => !c.population || c.population <= 0);
  if (citiesWithoutPopulation.length > 0) {
    return {
      valid: true,
      warning: `${citiesWithoutPopulation.length} city(ies) have missing population data`,
      citiesWithoutPopulation,
    };
  }

  return {
    valid: true,
  };
};

export default {
  calculatePrice,
  calculatePriceBreakdown,
  formatPrice,
  formatPopulation,
  getTier,
  getAllTiers,
  priceToCents,
  centsToPrice,
  validateCitiesForPricing,
  PRICING_CONSTANTS,
  TIERS,
};
