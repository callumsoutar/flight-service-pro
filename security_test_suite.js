#!/usr/bin/env node
/**
 * RBAC Security Test Suite
 * 
 * Comprehensive testing framework for API endpoint authorization
 * Tests authentication and role-based access control
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test user tokens for different roles (these would be generated in a real test environment)
const TEST_TOKENS = {
  anonymous: null,
  member: process.env.TEST_MEMBER_TOKEN,
  student: process.env.TEST_STUDENT_TOKEN,
  instructor: process.env.TEST_INSTRUCTOR_TOKEN,
  admin: process.env.TEST_ADMIN_TOKEN,
  owner: process.env.TEST_OWNER_TOKEN
};

// Define protected endpoints and their required roles
const PROTECTED_ENDPOINTS = {
  // Aircraft Management - Instructor/Admin/Owner only
  '/api/aircraft': {
    GET: ['instructor', 'admin', 'owner'],
    POST: ['admin', 'owner'],
    PATCH: ['instructor', 'admin', 'owner']
  },
  
  // Instructor Management - Instructor/Admin/Owner for read, Admin/Owner for modify
  '/api/instructors': {
    GET: ['instructor', 'admin', 'owner'],
    POST: ['admin', 'owner'],
    PATCH: ['admin', 'owner'],
    DELETE: ['admin', 'owner']
  },
  
  // Financial Data - Admin/Owner only
  '/api/invoices': {
    GET: ['admin', 'owner'],
    POST: ['admin', 'owner'],
    PATCH: ['admin', 'owner']
  },
  
  '/api/payments': {
    GET: ['admin', 'owner'],
    POST: ['admin', 'owner']
  },
  
  '/api/transactions': {
    GET: ['admin', 'owner']
  },
  
  // Equipment - Instructor/Admin/Owner
  '/api/equipment': {
    GET: ['instructor', 'admin', 'owner'],
    POST: ['instructor', 'admin', 'owner'],
    PATCH: ['instructor', 'admin', 'owner'],
    DELETE: ['admin', 'owner']
  },
  
  // Tasks - Instructor/Admin/Owner
  '/api/tasks': {
    GET: ['instructor', 'admin', 'owner'],
    POST: ['instructor', 'admin', 'owner']
  },
  
  // Settings - Admin/Owner only
  '/api/settings': {
    GET: ['admin', 'owner'],
    POST: ['admin', 'owner']
  }
};

// Role hierarchy for testing
const ROLE_HIERARCHY = ['anonymous', 'student', 'member', 'instructor', 'admin', 'owner'];

class SecurityTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: 0,
      details: []
    };
  }

  async testEndpoint(endpoint, method, allowedRoles) {
    console.log(`\\n🔍 Testing ${method} ${endpoint}`);
    console.log(`   Expected access: ${allowedRoles.join(', ')}`);
    
    for (const role of ROLE_HIERARCHY) {
      const token = TEST_TOKENS[role];
      const shouldHaveAccess = allowedRoles.includes(role);
      
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        });
        
        const hasAccess = response.status !== 401 && response.status !== 403;
        const testPassed = hasAccess === shouldHaveAccess;
        
        if (testPassed) {
          console.log(`   ✅ ${role}: ${response.status} (expected: ${shouldHaveAccess ? 'access' : 'denied'})`);
          this.results.passed++;
        } else {
          console.log(`   ❌ ${role}: ${response.status} (expected: ${shouldHaveAccess ? 'access' : 'denied'})`);
          this.results.failed++;
          this.results.details.push({
            endpoint,
            method,
            role,
            expected: shouldHaveAccess,
            actual: hasAccess,
            status: response.status
          });
        }
      } catch (error) {
        console.log(`   💥 ${role}: ERROR - ${error.message}`);
        this.results.errors++;
        this.results.details.push({
          endpoint,
          method,
          role,
          error: error.message
        });
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting RBAC Security Test Suite');
    console.log('=' * 50);
    
    // Test authentication endpoints first
    await this.testAuthenticationFlow();
    
    // Test protected endpoints
    for (const [endpoint, methods] of Object.entries(PROTECTED_ENDPOINTS)) {
      for (const [method, allowedRoles] of Object.entries(methods)) {
        await this.testEndpoint(endpoint, method, allowedRoles);
      }
    }
    
    this.printSummary();
  }

  async testAuthenticationFlow() {
    console.log('\\n🔐 Testing Authentication Flow');
    
    try {
      // Test anonymous access to protected resource
      const response = await fetch(`${API_BASE_URL}/api/aircraft`);
      if (response.status === 401) {
        console.log('   ✅ Anonymous access properly rejected (401)');
        this.results.passed++;
      } else {
        console.log(`   ❌ Anonymous access not rejected (got ${response.status})`);
        this.results.failed++;
      }
    } catch (error) {
      console.log(`   💥 Authentication test error: ${error.message}`);
      this.results.errors++;
    }
  }

  printSummary() {
    console.log('\\n' + '=' * 50);
    console.log('📊 SECURITY TEST RESULTS');
    console.log('=' * 50);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`💥 Errors: ${this.results.errors}`);
    
    const total = this.results.passed + this.results.failed + this.results.errors;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\\n🔴 FAILED TESTS:');
      this.results.details
        .filter(d => !d.error)
        .forEach(d => {
          console.log(`   ${d.method} ${d.endpoint} - ${d.role}: expected ${d.expected ? 'access' : 'denied'}, got status ${d.status}`);
        });
    }
    
    if (this.results.errors > 0) {
      console.log('\\n💥 ERROR DETAILS:');
      this.results.details
        .filter(d => d.error)
        .forEach(d => {
          console.log(`   ${d.method} ${d.endpoint} - ${d.role}: ${d.error}`);
        });
    }
    
    // Exit with error code if any tests failed
    if (this.results.failed > 0 || this.results.errors > 0) {
      console.log('\\n🚨 SECURITY VULNERABILITIES DETECTED!');
      process.exit(1);
    } else {
      console.log('\\n🛡️  ALL SECURITY TESTS PASSED!');
      process.exit(0);
    }
  }
}

// Additional utility functions for manual testing
function generateCurlCommands() {
  console.log('\\n📋 MANUAL TESTING COMMANDS:');
  console.log('=' * 50);
  
  Object.entries(PROTECTED_ENDPOINTS).forEach(([endpoint, methods]) => {
    Object.keys(methods).forEach(method => {
      console.log(`# Test ${method} ${endpoint}`);
      console.log(`curl -X ${method} "${API_BASE_URL}${endpoint}"`);
      console.log(`curl -X ${method} -H "Authorization: Bearer $MEMBER_TOKEN" "${API_BASE_URL}${endpoint}"`);
      console.log(`curl -X ${method} -H "Authorization: Bearer $ADMIN_TOKEN" "${API_BASE_URL}${endpoint}"\\n`);
    });
  });
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SecurityTester();
  
  if (process.argv.includes('--generate-curl')) {
    generateCurlCommands();
  } else {
    tester.runAllTests().catch(console.error);
  }
}

module.exports = { SecurityTester, PROTECTED_ENDPOINTS };
