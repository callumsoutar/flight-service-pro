/**
 * Test script to verify the complete organization-based tax rate system
 * This script tests the integration between the new organization endpoint,
 * hooks, and invoice system to ensure everything works seamlessly.
 */

import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceService } from '@/lib/invoice-service';
import { getOrganizationTaxRate } from '@/lib/tax-rates';

interface TestResult {
  test: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
}

export class OrganizationTaxRateSystemTester {
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
    
    console.log('🧪 Starting Organization Tax Rate System Tests...\n');

    await this.testOrganizationEndpoint();
    await this.testLibraryFunctions();
    await this.testInvoiceServiceIntegration();
    await this.testConsistencyAcrossSystem();

    this.printResults();
    return this.results;
  }

  private async testOrganizationEndpoint() {
    try {
      console.log('📋 Test 1: Organization Tax Rate Endpoint');
      
      // Test the new semantic endpoint
      const response = await fetch('/api/organization/tax-rate');
      const data = await response.json();
      
      const endpointWorking = response.ok;
      const hasCorrectStructure = data.taxRate !== undefined && 
                                  data.taxRatePercent !== undefined && 
                                  data.source !== undefined;
      const taxRateValid = typeof data.taxRate === 'number' && 
                          data.taxRate >= 0 && 
                          data.taxRate <= 1;
      
      this.results.push({
        test: 'Organization Endpoint - Response Structure',
        passed: endpointWorking && hasCorrectStructure,
        expected: 'Valid response with taxRate, taxRatePercent, source',
        actual: `Status: ${response.status}, Structure: ${hasCorrectStructure}`
      });

      this.results.push({
        test: 'Organization Endpoint - Tax Rate Validation',
        passed: taxRateValid,
        expected: 'Tax rate between 0 and 1',
        actual: data.taxRate
      });

      console.log(`   Endpoint status: ${response.ok ? 'OK' : 'FAILED'}`);
      console.log(`   Tax rate: ${data.taxRate} (${data.taxRatePercent}%)`);
      console.log(`   Source: ${data.source}`);
      console.log(`   ✅ ${endpointWorking && hasCorrectStructure && taxRateValid ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Organization Endpoint',
        passed: false,
        expected: 'Working endpoint',
        actual: 'Error',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  private async testLibraryFunctions() {
    try {
      console.log('📋 Test 2: Library Functions');
      
      // Test the organization tax rate function
      const orgRate = await getOrganizationTaxRate();
      const orgRateValid = typeof orgRate === 'number' && orgRate >= 0 && orgRate <= 1;
      
      this.results.push({
        test: 'Library - getOrganizationTaxRate',
        passed: orgRateValid,
        expected: 'Valid tax rate number',
        actual: orgRate
      });

      // Test InvoiceService tax rate method
      const invoiceServiceRate = await InvoiceService.getTaxRateForInvoice();
      const invoiceServiceRateValid = typeof invoiceServiceRate === 'number' && 
                                     invoiceServiceRate >= 0 && 
                                     invoiceServiceRate <= 1;
      
      this.results.push({
        test: 'InvoiceService - getTaxRateForInvoice',
        passed: invoiceServiceRateValid,
        expected: 'Valid tax rate number',
        actual: invoiceServiceRate
      });

      console.log(`   Organization rate: ${orgRate}`);
      console.log(`   Invoice service rate: ${invoiceServiceRate}`);
      console.log(`   ✅ ${orgRateValid && invoiceServiceRateValid ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Library Functions',
        passed: false,
        expected: 'Working functions',
        actual: 'Error',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  private async testInvoiceServiceIntegration() {
    try {
      console.log('📋 Test 3: Invoice Service Integration');
      
      // Test invoice calculations with organization tax rate
      const taxRate = await InvoiceService.getTaxRateForInvoice();
      
      const testItem = {
        quantity: 2,
        unit_price: 50,
        tax_rate: taxRate
      };
      
      const calculated = InvoiceService.calculateItemAmounts(testItem);
      
      const expectedAmount = 100; // 2 * 50
      const expectedTax = expectedAmount * taxRate;
      const expectedTotal = expectedAmount + expectedTax;
      
      const calculationCorrect = Math.abs(calculated.amount - expectedAmount) < 0.001 &&
                                Math.abs(calculated.tax_amount - expectedTax) < 0.001 &&
                                Math.abs(calculated.line_total - expectedTotal) < 0.001;
      
      this.results.push({
        test: 'Invoice Service - Calculation Integration',
        passed: calculationCorrect,
        expected: `Amount: ${expectedAmount}, Tax: ${expectedTax}, Total: ${expectedTotal}`,
        actual: `Amount: ${calculated.amount}, Tax: ${calculated.tax_amount}, Total: ${calculated.line_total}`
      });

      console.log(`   Tax rate used: ${taxRate}`);
      console.log(`   Amount: ${calculated.amount} (expected: ${expectedAmount})`);
      console.log(`   Tax: ${calculated.tax_amount} (expected: ${expectedTax.toFixed(2)})`);
      console.log(`   Total: ${calculated.line_total} (expected: ${expectedTotal.toFixed(2)})`);
      console.log(`   ✅ ${calculationCorrect ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'Invoice Service Integration',
        passed: false,
        expected: 'Correct calculations',
        actual: 'Error',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  private async testConsistencyAcrossSystem() {
    try {
      console.log('📋 Test 4: System-Wide Consistency');
      
      // Get tax rate from different sources
      const orgRate = await getOrganizationTaxRate();
      const invoiceServiceRate = await InvoiceService.getTaxRateForInvoice();
      
      // Test endpoint consistency
      const endpointResponse = await fetch('/api/organization/tax-rate');
      const endpointData = await endpointResponse.json();
      const endpointRate = endpointData.taxRate;
      
      // Check if all sources return the same rate
      const tolerance = 0.001;
      const allRatesConsistent = Math.abs(orgRate - invoiceServiceRate) < tolerance &&
                                Math.abs(orgRate - endpointRate) < tolerance &&
                                Math.abs(invoiceServiceRate - endpointRate) < tolerance;
      
      this.results.push({
        test: 'System Consistency - All Sources Match',
        passed: allRatesConsistent,
        expected: 'All sources return same tax rate',
        actual: `Org: ${orgRate}, Invoice: ${invoiceServiceRate}, Endpoint: ${endpointRate}`
      });

      // Test that the rate matches what's in the database
      const { data: dbRate } = await this.supabase!
        .from('tax_rates')
        .select('rate')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();
      
      const dbConsistent = !!(dbRate && Math.abs(orgRate - dbRate.rate) < tolerance);
      
      this.results.push({
        test: 'Database Consistency - Matches DB Default',
        passed: dbConsistent,
        expected: `Database rate: ${dbRate?.rate}`,
        actual: `System rate: ${orgRate}`
      });

      console.log(`   Organization lib: ${orgRate}`);
      console.log(`   Invoice service: ${invoiceServiceRate}`);
      console.log(`   API endpoint: ${endpointRate}`);
      console.log(`   Database: ${dbRate?.rate}`);
      console.log(`   ✅ ${allRatesConsistent && dbConsistent ? 'PASSED' : 'FAILED'}\n`);
      
    } catch (error: unknown) {
      this.results.push({
        test: 'System Consistency',
        passed: false,
        expected: 'Consistent rates across system',
        actual: 'Error',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  private printResults() {
    console.log('📊 ORGANIZATION TAX RATE SYSTEM TEST RESULTS');
    console.log('==============================================');
    
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
        console.log(`   Expected: ${result.expected}`);
        console.log(`   Actual: ${result.actual}`);
      }
      console.log('');
    });
    
    if (passed === total) {
      console.log('🎉 All tests passed! Organization tax rate system is working correctly.');
      console.log('');
      console.log('✅ System Benefits Achieved:');
      console.log('   • Simplified tax rate management (organization-only)');
      console.log('   • Semantic API endpoint (/api/organization/tax-rate)');
      console.log('   • Consistent rates across all components');
      console.log('   • Proper fallback handling');
      console.log('   • Single-tenant architecture alignment');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
  }
}

// Example usage:
// async function main() {
//   const tester = new OrganizationTaxRateSystemTester();
//   const results = await tester.runAllTests();
//   
//   // Exit with appropriate code
//   const allPassed = results.every(r => r.passed);
//   process.exit(allPassed ? 0 : 1);
// }
// 
// main().catch(console.error);
