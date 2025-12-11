// Test script for signup form validation
import { signUpSchema } from './src/lib/validationSchemas.js';

// Test cases for signup validation
const testCases = [
  {
    name: "Valid signup data",
    data: {
      firstName: "John",
      lastName: "Doe", 
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
      phone: "1234567890",
      agreeToTerms: true
    },
    shouldPass: true
  },
  {
    name: "Password mismatch",
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com", 
      password: "password123",
      confirmPassword: "different123",
      phone: "1234567890",
      agreeToTerms: true
    },
    shouldPass: false
  },
  {
    name: "Invalid email",
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "invalid-email",
      password: "password123", 
      confirmPassword: "password123",
      phone: "1234567890",
      agreeToTerms: true
    },
    shouldPass: false
  },
  {
    name: "Short password",
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "123",
      confirmPassword: "123", 
      phone: "1234567890",
      agreeToTerms: true
    },
    shouldPass: false
  },
  {
    name: "Terms not agreed",
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
      phone: "1234567890", 
      agreeToTerms: false
    },
    shouldPass: false
  }
];

console.log("🧪 Testing signup form validation...");

testCases.forEach((testCase, index) => {
  try {
    const result = signUpSchema.safeParse(testCase.data);
    const passed = result.success;
    
    if (passed === testCase.shouldPass) {
      console.log(`✅ Test ${index + 1}: ${testCase.name} - PASSED`);
    } else {
      console.log(`❌ Test ${index + 1}: ${testCase.name} - FAILED`);
      if (!result.success) {
        console.log("   Errors:", result.error.errors);
      }
    }
  } catch (error) {
    console.log(`❌ Test ${index + 1}: ${testCase.name} - ERROR:`, error.message);
  }
});

console.log("🧪 Signup validation tests completed!");
