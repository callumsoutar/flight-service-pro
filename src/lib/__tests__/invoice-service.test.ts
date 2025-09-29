import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from '../invoice-service';

// Mock the tax-rates module
vi.mock('@/lib/tax-rates', () => ({
  getTaxRateForUser: vi.fn(),
  getDefaultTaxRate: vi.fn(),
}));

describe('InvoiceService', () => {
  describe('calculateItemAmounts', () => {
    it('should calculate amounts correctly with tax', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 2,
        unit_price: 100,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(200);
      expect(result.tax_amount).toBe(30);
      expect(result.line_total).toBe(230);
      expect(result.rate_inclusive).toBe(115);
    });
    
    it('should handle zero tax rate', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 1,
        unit_price: 50,
        tax_rate: 0
      });
      
      expect(result.amount).toBe(50);
      expect(result.tax_amount).toBe(0);
      expect(result.line_total).toBe(50);
      expect(result.rate_inclusive).toBe(50);
    });
    
    it('should handle decimal quantities', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 1.5,
        unit_price: 100,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(150);
      expect(result.tax_amount).toBe(22.5);
      expect(result.line_total).toBe(172.5);
      expect(result.rate_inclusive).toBe(115);
    });
    
    it('should handle decimal unit prices', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 2,
        unit_price: 99.99,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(199.98);
      expect(result.tax_amount).toBe(29.997);
      expect(result.line_total).toBe(229.977);
      expect(result.rate_inclusive).toBe(114.9885);
    });
    
    it('should handle high precision tax rates', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 1,
        unit_price: 100,
        tax_rate: 0.125 // 12.5%
      });
      
      expect(result.amount).toBe(100);
      expect(result.tax_amount).toBe(12.5);
      expect(result.line_total).toBe(112.5);
      expect(result.rate_inclusive).toBe(112.5);
    });
    
    it('should handle undefined tax rate as zero', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 1,
        unit_price: 100,
        tax_rate: undefined as number | null | undefined
      });
      
      expect(result.amount).toBe(100);
      expect(result.tax_amount).toBe(0);
      expect(result.line_total).toBe(100);
      expect(result.rate_inclusive).toBe(100);
    });
  });
  
  describe('calculateInvoiceTotals', () => {
    it('should sum multiple items correctly', () => {
      const items = [
        { id: '1', amount: 100, tax_amount: 15, line_total: 115, rate_inclusive: 115 },
        { id: '2', amount: 200, tax_amount: 30, line_total: 230, rate_inclusive: 230 }
      ];
      
      const result = InvoiceService.calculateInvoiceTotals(items);
      
      expect(result.subtotal).toBe(300);
      expect(result.tax_total).toBe(45);
      expect(result.total_amount).toBe(345);
    });
    
    it('should handle empty items array', () => {
      const result = InvoiceService.calculateInvoiceTotals([]);
      
      expect(result.subtotal).toBe(0);
      expect(result.tax_total).toBe(0);
      expect(result.total_amount).toBe(0);
    });
    
    it('should handle single item', () => {
      const items = [
        { id: '1', amount: 150, tax_amount: 22.5, line_total: 172.5, rate_inclusive: 115 }
      ];
      
      const result = InvoiceService.calculateInvoiceTotals(items);
      
      expect(result.subtotal).toBe(150);
      expect(result.tax_total).toBe(22.5);
      expect(result.total_amount).toBe(172.5);
    });
    
    it('should handle decimal amounts', () => {
      const items = [
        { id: '1', amount: 99.99, tax_amount: 14.9985, line_total: 114.9885, rate_inclusive: 114.9885 },
        { id: '2', amount: 50.01, tax_amount: 7.5015, line_total: 57.5115, rate_inclusive: 57.5115 }
      ];
      
      const result = InvoiceService.calculateInvoiceTotals(items);
      
      expect(result.subtotal).toBe(150);
      expect(result.tax_total).toBe(22.5);
      expect(result.total_amount).toBe(172.5);
    });
  });
  
  describe('calculateInvoiceStatus', () => {
    const today = new Date();
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    it('should return "paid" when fully paid', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 100, futureDate, today);
      expect(status).toBe('paid');
    });
    
    it('should return "paid" when overpaid', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 150, futureDate, null);
      expect(status).toBe('paid');
    });
    
    it('should return "paid" when paid_date is set', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 100, futureDate, today);
      expect(status).toBe('paid');
    });
    
    it('should return "pending" when partially paid and not overdue', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 50, futureDate, null);
      expect(status).toBe('pending');
    });
    
    it('should return "overdue" when partially paid and past due', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 50, pastDate, null);
      expect(status).toBe('overdue');
    });
    
    it('should return "pending" when unpaid and not overdue', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 0, futureDate, null);
      expect(status).toBe('pending');
    });
    
    it('should return "overdue" when unpaid and past due', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 0, pastDate, null);
      expect(status).toBe('overdue');
    });
    
    it('should return "draft" when total amount is zero', () => {
      const status = InvoiceService.calculateInvoiceStatus(0, 0, futureDate, null);
      expect(status).toBe('draft');
    });
    
    it('should return "pending" when no due date is set and amount > 0', () => {
      const status = InvoiceService.calculateInvoiceStatus(100, 0, null, null);
      expect(status).toBe('pending');
    });
  });
  
  describe('Currency-safe arithmetic', () => {
    it('should handle floating point precision issues', () => {
      // This would fail with regular JavaScript arithmetic: 0.1 + 0.2 !== 0.3
      const result = InvoiceService.calculateItemAmounts({
        quantity: 0.1,
        unit_price: 0.2,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(0.02);
      expect(result.tax_amount).toBe(0.003);
      expect(result.line_total).toBe(0.023);
    });
    
    it('should handle large numbers correctly', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 1000000,
        unit_price: 999.99,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(999990000);
      expect(result.tax_amount).toBe(149998500);
      expect(result.line_total).toBe(1149988500);
    });
    
    it('should handle very small numbers correctly', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 0.001,
        unit_price: 0.01,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(0.00001);
      expect(result.tax_amount).toBe(0.0000015);
      expect(result.line_total).toBe(0.0000115);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle zero quantity', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 0,
        unit_price: 100,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(0);
      expect(result.tax_amount).toBe(0);
      expect(result.line_total).toBe(0);
      expect(result.rate_inclusive).toBe(115);
    });
    
    it('should handle zero unit price', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 5,
        unit_price: 0,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(0);
      expect(result.tax_amount).toBe(0);
      expect(result.line_total).toBe(0);
      expect(result.rate_inclusive).toBe(0);
    });
    
    it('should handle negative quantities (refunds)', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: -1,
        unit_price: 100,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(-100);
      expect(result.tax_amount).toBe(-15);
      expect(result.line_total).toBe(-115);
      expect(result.rate_inclusive).toBe(115);
    });
  });

  describe('getTaxRateForInvoice', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should get user-specific tax rate when userId provided', async () => {
      const { getTaxRateForUser } = await import('@/lib/tax-rates');
      vi.mocked(getTaxRateForUser).mockResolvedValue(0.20); // 20% tax rate

      const result = await InvoiceService.getTaxRateForInvoice('user-123');
      
      expect(getTaxRateForUser).toHaveBeenCalledWith('user-123');
      expect(result).toBe(0.20);
    });

    it('should get organization default tax rate when no userId provided', async () => {
      const { getDefaultTaxRate } = await import('@/lib/tax-rates');
      vi.mocked(getDefaultTaxRate).mockResolvedValue(0.15); // 15% tax rate

      const result = await InvoiceService.getTaxRateForInvoice();
      
      expect(getDefaultTaxRate).toHaveBeenCalled();
      expect(result).toBe(0.15);
    });

    it('should fallback to 0.15 when tax rate service fails', async () => {
      const { getTaxRateForUser } = await import('@/lib/tax-rates');
      vi.mocked(getTaxRateForUser).mockRejectedValue(new Error('Service unavailable'));

      const result = await InvoiceService.getTaxRateForInvoice('user-123');
      
      expect(result).toBe(0.15); // Fallback rate
    });
  });

  describe('Integration with dynamic tax rates', () => {
    it('should calculate correctly with different tax rates', () => {
      // Test with various tax rates that might come from the tax rate system
      const testCases = [
        { rate: 0.10, expected: { amount: 100, tax: 10, total: 110 } }, // 10% (some regions)
        { rate: 0.13, expected: { amount: 100, tax: 13, total: 113 } }, // 13% (HST in some Canadian provinces)
        { rate: 0.15, expected: { amount: 100, tax: 15, total: 115 } }, // 15% (GST in NZ)
        { rate: 0.20, expected: { amount: 100, tax: 20, total: 120 } }, // 20% (VAT in UK)
        { rate: 0.25, expected: { amount: 100, tax: 25, total: 125 } }, // 25% (VAT in some countries)
      ];

      testCases.forEach(({ rate, expected }) => {
        const result = InvoiceService.calculateItemAmounts({
          quantity: 1,
          unit_price: 100,
          tax_rate: rate
        });

        expect(result.amount).toBe(expected.amount);
        expect(result.tax_amount).toBe(expected.tax);
        expect(result.line_total).toBe(expected.total);
        expect(result.rate_inclusive).toBe(100 * (1 + rate));
      });
    });

    it('should handle region-specific tax rates correctly', () => {
      // Simulate different regional tax rates
      const regions = [
        { name: 'New Zealand GST', rate: 0.15 },
        { name: 'UK VAT', rate: 0.20 },
        { name: 'Canada HST Ontario', rate: 0.13 },
        { name: 'US Sales Tax (varies)', rate: 0.0875 }, // 8.75%
        { name: 'Australia GST', rate: 0.10 },
      ];

      regions.forEach(({ name, rate }) => {
        const result = InvoiceService.calculateItemAmounts({
          quantity: 2,
          unit_price: 50,
          tax_rate: rate
        });

        const expectedAmount = 100; // 2 * 50
        const expectedTax = expectedAmount * rate;
        const expectedTotal = expectedAmount + expectedTax;

        expect(result.amount).toBe(expectedAmount);
        expect(result.tax_amount).toBe(expectedTax);
        expect(result.line_total).toBe(expectedTotal);
        
        // Log for manual verification
        console.log(`${name}: Amount=${result.amount}, Tax=${result.tax_amount}, Total=${result.line_total}`);
      });
    });
  });
});
