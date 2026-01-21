// User and Profile types
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_name: string;
  phone: string;
  business_email: string;
  country_code: string;
  state_code: string;
  city_name: string;
  service_cities: string[];
  onboarding_complete: boolean;
  credits_remaining: number;
  unlimited: boolean;
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled';
  created_at: string;
  updated_at: string;
}

// Listing types
export interface Listing {
  id: string;
  address: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipcode?: string;
  price: number;
  unformattedPrice?: number;
  created_at: string;
  pgapt?: string;
  beds?: number;
  baths?: number;
  area?: number;
  statustext?: string;
  imgSrc?: string;
  detailUrl?: string;
  zpid?: string;
  run_id?: string; // Updated from lastRunId
  // Removed lastPage as it's not used in new table structure
}

export interface ListingFilters {
  state_code?: string;
  city_name?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  minSqft?: number;
  maxSqft?: number;
}

export interface ListingReveal {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
}

// Homeowner Lookup types
export interface HomeownerPhoneNumber {
  number: string;
  type: string;
  carrier: string;
  score: string;
  reachable: boolean;
  dnc: boolean;
  tested: boolean;
  firstReportedDate?: string;
  lastReportedDate?: string;
}

export interface HomeownerEmail {
  email: string;
  tested?: boolean;
}

export interface HomeownerData {
  firstName: string | null;
  lastName: string | null;
  emails: HomeownerEmail[];
  phoneNumbers: HomeownerPhoneNumber[];
  isLitigator: boolean;
  hasDncPhone: boolean;
  fromCache: boolean;
  cachedAt?: string;
}

export interface HomeownerLookupResponse {
  success: boolean;
  data: HomeownerData;
  message?: string;
}

export interface HomeownerLookup {
  id: string;
  zpid?: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_hash: string;
  homeowner_first_name?: string;
  homeowner_last_name?: string;
  emails: HomeownerEmail[];
  phone_numbers: HomeownerPhoneNumber[];
  is_litigator: boolean;
  has_dnc_phone: boolean;
  raw_response?: any;
  lookup_successful: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  count?: number;
  totalPages?: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  totalPages: number;
}

// Analytics types
export interface AnalyticsEvent {
  type: 'page_view' | 'action' | 'conversion' | 'listing_interaction' | 'auth_event' | 'form_event' | 'performance' | 'error';
  action?: string;
  properties?: Record<string, any>;
  value?: number;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  email: string;
  password: string;
}

export interface ProfileForm {
  company_name: string;
  phone: string;
  business_email: string;
  country_code: string;
  state_code: string;
  city_name: string;
}

export interface OnboardingForm {
  companyName: string;
  phone: string;
  countryCode: string;
  stateCode: string;
  cityName: string;
}

export interface ContactForm {
  name: string;
  company: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  message?: string;
}

// UI Component types
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  asChild?: boolean;
}

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

// Hook types
export interface UseListingsReturn {
  data?: PaginatedResponse<Listing>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseRevealedListingsReturn {
  data: Set<string>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRevealListingReturn {
  mutateAsync: (params: { listingId: string; userId: string }) => Promise<{ listingId: string; userId: string }>;
  isLoading: boolean;
  error: Error | null;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  stack?: string;
}

// Theme types
export type Theme = 'dark' | 'light';

// Route types
export interface RouteState {
  from?: {
    pathname: string;
  };
}

// Toast types
export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: React.ReactNode;
  className?: string;
}
