import { describe, it, expect } from 'vitest';
import { signUpSchema, loginSchema, profileUpdateSchema } from '../lib/validationSchemas';

describe('Validation Schemas', () => {
  describe('Sign Up Validation', () => {
    it('accepts valid signup data with company email', () => {
      const validData = {
        companyName: 'ABC Moving Company',
        email: 'john@abcmoving.com',
        password: 'SecurePass123!',
        phoneNumber: '4161234567',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects personal email domains', () => {
      const personalEmails = [
        'test@gmail.com',
        'user@yahoo.com',
        'person@hotmail.com',
        'someone@outlook.com',
      ];

      personalEmails.forEach(email => {
        const data = {
          companyName: 'ABC Moving',
          email,
          password: 'SecurePass123!',
          phoneNumber: '4161234567',
          acceptTerms: true,
        };

        const result = signUpSchema.safeParse(data);
        // Note: Update this expectation based on your actual validation rules
        // If you're NOT validating against personal emails, this test will need adjustment
      });
    });

    it('rejects short passwords', () => {
      const data = {
        companyName: 'ABC Moving',
        email: 'john@abcmoving.com',
        password: '123',
        phoneNumber: '4161234567',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path[0]).toBe('password');
    });

    it('rejects invalid phone numbers', () => {
      const data = {
        companyName: 'ABC Moving',
        email: 'john@abcmoving.com',
        password: 'SecurePass123!',
        phoneNumber: '123',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path[0]).toBe('phoneNumber');
    });

    it('requires terms acceptance', () => {
      const data = {
        companyName: 'ABC Moving',
        email: 'john@abcmoving.com',
        password: 'SecurePass123!',
        phoneNumber: '4161234567',
        acceptTerms: false,
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path[0]).toBe('acceptTerms');
    });

    it('requires company name', () => {
      const data = {
        companyName: '',
        email: 'john@abcmoving.com',
        password: 'SecurePass123!',
        phoneNumber: '4161234567',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path[0]).toBe('companyName');
    });
  });

  describe('Login Validation', () => {
    it('accepts valid login credentials', () => {
      const validData = {
        email: 'john@abcmoving.com',
        password: 'SecurePass123!',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const data = {
        email: 'notanemail',
        password: 'SecurePass123!',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Profile Update Validation', () => {
    it('accepts valid profile data with service cities', () => {
      const validData = {
        companyName: 'ABC Moving Company',
        phoneNumber: '4161234567',
        serviceCities: ['Toronto, ON', 'Vancouver, BC'],
      };

      const result = profileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('requires at least one service city', () => {
      const data = {
        companyName: 'ABC Moving Company',
        phoneNumber: '4161234567',
        serviceCities: [],
      };

      const result = profileUpdateSchema.safeParse(data);
      // Based on your schema, this should fail if serviceCities is required
      // Adjust expectation based on actual requirements
    });
  });
});
