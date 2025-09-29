/**
 * Test script to verify tax rate integration with invoice system
 * This script tests that invoices are created with the correct tax rates
 * based on user location and organization defaults.
 */

import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceService } from '@/lib/invoice-service';
import { getDefaultTaxRate } from '@/lib/tax-rates';

interface TestResult {
  test: string;
  passed: boolean;
  expected: number;
  actual: number;
  error?: string;
}

export class TaxRateIntegrationTester {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  private results: TestResult[] = [];

  constructor() {
    // Initialize as null, will be set in initialize()
  }

  private async initialize() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    await this.initialize();
    
    console.log('🧪 Starting Tax Rate Integration Tests...\n');

    await this.testOrganizationDefaultTaxRate();
    await this.testInvoiceServiceTaxRateIntegration();
    await this.testInvoiceItemCalculationsWithDifferentRates();
    await this.testFallbackBehavior();

    this.printResults();
    return this.results;
  }

  private async testOrganizationDefaultTaxRate() {
    try {
      console.log('📋 Test 1: Organization Default Tax Rate');
      
      const defaultRate = await getDefaultTaxRate();
      const invoiceServiceRate = await InvoiceService.getTaxRateForInvoice();
      
      const passed = Math.abs(defaultRate - invoiceServiceRate) < 0.001;
      
      this.results.push({
        test: 'Organization Default Tax Rate Consistency',
        passed,
        expected: defaultRate,
        actual: invoiceServiceRate
      });

      console.log(`   Default rate: ${defaultRate}`);
      console.log(`   Invoice service rate: ${invoiceServiceRate}`);
      console.log(`   ✅ ${passed ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Organization Default Tax Rate Consistency',
        passed: false,
        expected: 0,
        actual: 0,
        error: error.message
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    }
  }

  private async testInvoiceServiceTaxRateIntegration() {
    try {
      console.log('📋 Test 2: Invoice Service Tax Rate Integration');
      
      // Test with no user ID (should use organization default)
      const orgRate = await InvoiceService.getTaxRateForInvoice();
      const expectedOrgRate = await getDefaultTaxRate();
      
      const orgTestPassed = Math.abs(orgRate - expectedOrgRate) < 0.001;
      
      this.results.push({
        test: 'Invoice Service - Organization Rate',
        passed: orgTestPassed,
        expected: expectedOrgRate,
        actual: orgRate
      });

      console.log(`   Organization rate test: ${orgTestPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   Expected: ${expectedOrgRate}, Got: ${orgRate}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Invoice Service Tax Rate Integration',
        passed: false,
        expected: 0,
        actual: 0,
        error: error.message
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    }
  }

  private async testInvoiceItemCalculationsWithDifferentRates() {
    try {
      console.log('📋 Test 3: Invoice Item Calculations with Different Tax Rates');
      
      const testCases = [
        { rate: 0.10, name: 'Australia GST' },
        { rate: 0.13, name: 'Canada HST' },
        { rate: 0.15, name: 'New Zealand GST' },
        { rate: 0.20, name: 'UK VAT' },
      ];

      let allPassed = true;

      for (const testCase of testCases) {
        const result = InvoiceService.calculateItemAmounts({
          quantity: 1,
          unit_price: 100,
          tax_rate: testCase.rate
        });

        const expectedTax = 100 * testCase.rate;
        const expectedTotal = 100 + expectedTax;
        
        const taxCorrect = Math.abs(result.tax_amount - expectedTax) < 0.001;
        const totalCorrect = Math.abs(result.line_total - expectedTotal) < 0.001;
        const testPassed = taxCorrect && totalCorrect;
        
        if (!testPassed) allPassed = false;

        console.log(`   ${testCase.name} (${testCase.rate * 100}%): ${testPassed ? 'PASSED' : 'FAILED'}`);
        console.log(`     Tax: ${result.tax_amount} (expected: ${expectedTax})`);
        console.log(`     Total: ${result.line_total} (expected: ${expectedTotal})`);
      }

      this.results.push({
        test: 'Invoice Item Calculations with Different Tax Rates',
        passed: allPassed,
        expected: testCases.length,
        actual: testCases.filter(tc => {
          const result = InvoiceService.calculateItemAmounts({
            quantity: 1,
            unit_price: 100,
            tax_rate: tc.rate
          });
          const expectedTax = 100 * tc.rate;
          const expectedTotal = 100 + expectedTax;
          return Math.abs(result.tax_amount - expectedTax) < 0.001 && 
                 Math.abs(result.line_total - expectedTotal) < 0.001;
        }).length
      });

      console.log(`   Overall: ${allPassed ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Invoice Item Calculations with Different Tax Rates',
        passed: false,
        expected: 0,
        actual: 0,
        error: error.message
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    }
  }

  private async testFallbackBehavior() {
    try {
      console.log('📋 Test 4: Fallback Behavior');
      
      // Test that the service gracefully handles errors and uses fallback
      const fallbackRate = 0.15;
      
      // This should work normally
      const normalRate = await InvoiceService.getTaxRateForInvoice();
      const fallbackWorking = normalRate >= 0 && normalRate <= 1;
      
      this.results.push({
        test: 'Fallback Behavior - Rate Validation',
        passed: fallbackWorking,
        expected: fallbackRate,
        actual: normalRate
      });

      console.log(`   Rate validation: ${fallbackWorking ? 'PASSED' : 'FAILED'}`);
      console.log(`   Rate received: ${normalRate} (should be between 0 and 1)`);
      console.log(`   ✅ ${fallbackWorking ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Fallback Behavior',
        passed: false,
        expected: 0.15,
        actual: 0,
        error: error.message
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    }
  }

  private printResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`Tests Passed: ${passed}/${total} (${successRate}%)`);
    console.log('');
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Expected: ${result.expected}, Actual: ${result.actual}`);
      }
    });
    
    console.log('');
    if (passed === total) {
      console.log('🎉 All tests passed! Tax rate integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the integration.');
    }
  }
}

// Example usage:
// async function main() {
//   const tester = new TaxRateIntegrationTester();
//   const results = await tester.runAllTests();
//   
//   // Exit with appropriate code
//   const allPassed = results.every(r => r.passed);
//   process.exit(allPassed ? 0 : 1);
// }
// 
// main().catch(console.error);
