import * as z from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
});

export const contactSchema = z.object({
  name: z.string().min(1, { message: "Full name is required." }),
  company: z.string().min(1, { message: "Company name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  message: z.string().optional(),
});

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/
);

export const profileSchema = z.object({
  company_name: z.string().min(1, { message: "Company name is required." }),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format.'),
  business_email: z.string().email({ message: "Please enter a valid email address." }),
  country_code: z.string().min(1, { message: "Country is required." }),
  state_code: z.string().min(1, { message: "State/Province is required." }),
  city_name: z.string().min(1, { message: "City is required." }),
});

export const onboardingSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required." }),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format.'),
  countryCode: z.string().min(1, { message: "Country is required." }),
  stateCode: z.string().min(1, { message: "State/Province is required." }),
  cityName: z.string().min(1, { message: "City is required." }),
});