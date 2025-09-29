/**
 * Dual-Write Verification Script
 * 
 * This script compares invoice calculations between database triggers 
 * and application logic to ensure they produce identical results.
 */

import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceService } from '@/lib/invoice-service';
import * as fs from 'fs';

interface VerificationResult {
  invoiceId: string;
  invoiceNumber: string;
  discrepancies: string[];
  itemDiscrepancies: Array<{
    itemId: string;
    field: string;
    currentValue: number;
    expectedValue: number;
    difference: number;
  }>;
}

export class InvoiceVerificationService {
  private supabase: ReturnType<typeof createClient> | null;
  
  constructor() {
    this.supabase = null;
  }
  
  async initialize() {
    this.supabase = await createClient();
  }
  
  /**
   * Verify all invoices in the database
   */
  async verifyAllInvoices(): Promise<VerificationResult[]> {
    if (!this.supabase) await this.initialize();
    
    console.log('🔍 Starting invoice verification...');
    
    // Get all invoices
    const { data: invoices, error } = await this.supabase
      .from('invoices')
      .select('id, invoice_number')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
    
    console.log(`📊 Found ${invoices.length} invoices to verify`);
    
    const results: VerificationResult[] = [];
    
    for (const invoice of invoices) {
      try {
        const result = await this.verifyInvoice(invoice.id);
        results.push(result);
        
        if (result.discrepancies.length > 0 || result.itemDiscrepancies.length > 0) {
          console.log(`❌ Discrepancies found in invoice ${result.invoiceNumber}`);
        } else {
          console.log(`✅ Invoice ${result.invoiceNumber} verified successfully`);
        }
      } catch (error) {
        console.error(`❌ Error verifying invoice ${invoice.invoice_number}:`, error);
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number || 'Unknown',
          discrepancies: [`Verification error: ${error.message}`],
          itemDiscrepancies: []
        });
      }
    }
    
    return results;
  }
  
  /**
   * Verify a single invoice
   */
  async verifyInvoice(invoiceId: string): Promise<VerificationResult> {
    if (!this.supabase) await this.initialize();
    
    // Get invoice data
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }
    
    // Get invoice items
    const { data: items, error: itemsError } = await this.supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);
      
    if (itemsError) {
      throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
    }
    
    const result: VerificationResult = {
      invoiceId,
      invoiceNumber: invoice.invoice_number || 'Unknown',
      discrepancies: [],
      itemDiscrepancies: []
    };
    
    // Verify each item's calculations
    // Note: We use the stored tax_rate from the item, which was determined
    // when the item was created using the user's location or organization default
    for (const item of items) {
      const appCalculated = InvoiceService.calculateItemAmounts({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate // This is the tax rate that was active when item was created
      });
      
      // Check each calculated field
      const fields = ['amount', 'tax_amount', 'line_total', 'rate_inclusive'];
      for (const field of fields) {
        const currentValue = item[field];
        const expectedValue = appCalculated[field as keyof typeof appCalculated];
        const difference = Math.abs(currentValue - expectedValue);
        
        // Allow for small floating point differences (less than 0.01)
        if (difference > 0.005) {
          result.itemDiscrepancies.push({
            itemId: item.id,
            field,
            currentValue,
            expectedValue,
            difference
          });
        }
      }
    }
    
    // Verify invoice totals
    const appTotals = InvoiceService.calculateInvoiceTotals(items);
    
    const totalFields = ['subtotal', 'tax_total', 'total_amount'];
    for (const field of totalFields) {
      const currentValue = invoice[field];
      const expectedValue = appTotals[field as keyof typeof appTotals];
      const difference = Math.abs(currentValue - expectedValue);
      
      if (difference > 0.005) {
        result.discrepancies.push(
          `${field}: current=${currentValue}, expected=${expectedValue}, diff=${difference}`
        );
      }
    }
    
    // Verify balance_due calculation
    const expectedBalanceDue = invoice.total_amount - (invoice.total_paid || 0);
    const actualBalanceDue = invoice.balance_due;
    const balanceDifference = Math.abs(expectedBalanceDue - actualBalanceDue);
    
    if (balanceDifference > 0.005) {
      result.discrepancies.push(
        `balance_due: expected=${expectedBalanceDue}, actual=${actualBalanceDue}, diff=${balanceDifference}`
      );
    }
    
    return result;
  }
  
  /**
   * Generate a verification report
   */
  generateReport(results: VerificationResult[]): string {
    const totalInvoices = results.length;
    const invoicesWithDiscrepancies = results.filter(r => 
      r.discrepancies.length > 0 || r.itemDiscrepancies.length > 0
    ).length;
    const successRate = ((totalInvoices - invoicesWithDiscrepancies) / totalInvoices * 100).toFixed(2);
    
    let report = `
# Invoice Calculation Verification Report

## Summary
- **Total Invoices Verified**: ${totalInvoices}
- **Invoices with Discrepancies**: ${invoicesWithDiscrepancies}
- **Success Rate**: ${successRate}%

## Verification Details
- **Invoices verified**: ${totalInvoices}
- **Clean invoices**: ${totalInvoices - invoicesWithDiscrepancies}

`;
    
    if (invoicesWithDiscrepancies > 0) {
      report += `## Discrepancies Found\n\n`;
      
      for (const result of results) {
        if (result.discrepancies.length > 0 || result.itemDiscrepancies.length > 0) {
          report += `### Invoice ${result.invoiceNumber} (${result.invoiceId})\n`;
          
          if (result.discrepancies.length > 0) {
            report += `**Invoice-level discrepancies:**\n`;
            for (const discrepancy of result.discrepancies) {
              report += `- ${discrepancy}\n`;
            }
          }
          
          if (result.itemDiscrepancies.length > 0) {
            report += `**Item-level discrepancies:**\n`;
            for (const item of result.itemDiscrepancies) {
              report += `- Item ${item.itemId}: ${item.field} current=${item.currentValue}, expected=${item.expectedValue}, diff=${item.difference}\n`;
            }
          }
          
          report += `\n`;
        }
      }
    } else {
      report += `## ✅ All Calculations Verified Successfully!\n\nNo discrepancies found. All invoice calculations are correct.\n`;
    }
    
    return report;
  }
  
  /**
   * Fix discrepancies by updating with application-calculated values
   */
  async fixDiscrepancies(results: VerificationResult[]): Promise<void> {
    if (!this.supabase) await this.initialize();
    
    console.log('🔧 Starting to fix discrepancies...');
    
    for (const result of results) {
      if (result.discrepancies.length > 0 || result.itemDiscrepancies.length > 0) {
        console.log(`🔧 Fixing invoice ${result.invoiceNumber}...`);
        
        // Fix item discrepancies
        const itemIds = [...new Set(result.itemDiscrepancies.map(d => d.itemId))];
        for (const itemId of itemIds) {
          // Get item data
          const { data: item } = await this.supabase
            .from('invoice_items')
            .select('quantity, unit_price, tax_rate')
            .eq('id', itemId)
            .single();
            
          if (item) {
            const calculated = InvoiceService.calculateItemAmounts({
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate
            });
            
            await this.supabase
              .from('invoice_items')
              .update({
                amount: calculated.amount,
                tax_amount: calculated.tax_amount,
                line_total: calculated.line_total,
                rate_inclusive: calculated.rate_inclusive
              })
              .eq('id', itemId);
          }
        }
        
        // Fix invoice totals
        if (result.discrepancies.length > 0) {
          await InvoiceService.updateInvoiceTotals(this.supabase, result.invoiceId);
        }
        
        console.log(`✅ Fixed invoice ${result.invoiceNumber}`);
      }
    }
    
    console.log('🎉 All discrepancies fixed!');
  }
}

// CLI usage
if (require.main === module) {
  const verifier = new InvoiceVerificationService();
  
  verifier.verifyAllInvoices()
    .then(results => {
      const report = verifier.generateReport(results);
      console.log(report);
      
      // Write report to file
      fs.writeFileSync('invoice-verification-report.md', report);
      console.log('📄 Report saved to invoice-verification-report.md');
      
      // Ask if user wants to fix discrepancies
      const discrepanciesFound = results.some(r => 
        r.discrepancies.length > 0 || r.itemDiscrepancies.length > 0
      );
      
      if (discrepanciesFound) {
        console.log('\n❓ Run with --fix flag to automatically fix discrepancies');
        
        if (process.argv.includes('--fix')) {
          return verifier.fixDiscrepancies(results);
        }
      }
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}
