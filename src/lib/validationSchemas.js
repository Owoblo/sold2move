import { z } from 'zod';

// Signup schema - allows any valid email address
export const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Login schema (keep existing)
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// New password schema
export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Contact form schema
export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Onboarding schema
export const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  cityName: z.string().min(2, 'City name must be at least 2 characters'),
  stateCode: z.string().min(2, 'State must be at least 2 characters'),
  countryCode: z.string().min(2, 'Country must be selected'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  serviceCities: z.array(z.string()).min(1, 'Please select at least one service city'),
});

// Profile schema
export const profileSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  city_name: z.string().min(2, 'City name must be at least 2 characters'),
  state_code: z.string().min(2, 'State must be at least 2 characters'),
  country_code: z.string().min(2, 'Country must be selected'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  service_cities: z.array(z.string()).optional(), // Make service cities optional
});