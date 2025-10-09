import { Decimal } from 'decimal.js';
import { roundToTwoDecimals } from '@/lib/utils';

// Configure Decimal.js for currency calculations
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export interface InvoiceItemInput {
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface InvoiceItemCalculated {
  amount: number;
  tax_amount: number;
  line_total: number;
  rate_inclusive: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_total: number;
  total_amount: number;
}

export interface InvoiceItem {
  amount: number;
  tax_amount: number | null;
  line_total: number | null;
}

/**
 * Client-side invoice calculations using currency-safe arithmetic
 * This is a client-safe version of InvoiceService calculations
 * All calculations match server-side logic for consistency
 */
export class InvoiceCalculations {
  /**
   * Calculate all amounts for an invoice item using currency-safe arithmetic
   * All values are rounded to 2 decimal places for consistency
   */
  static calculateItemAmounts(item: InvoiceItemInput): InvoiceItemCalculated {
    // Input validation
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item input: must be an object');
    }

    const { quantity, unit_price, tax_rate } = item;

    // Validate required fields
    if (quantity == null || isNaN(Number(quantity)) || quantity < 0) {
      throw new Error('Invalid quantity: must be a non-negative number');
    }

    if (unit_price == null || isNaN(Number(unit_price)) || unit_price < 0) {
      throw new Error('Invalid unit price: must be a non-negative number');
    }

    if (tax_rate != null && (isNaN(Number(tax_rate)) || tax_rate < 0 || tax_rate > 1)) {
      throw new Error('Invalid tax rate: must be between 0 and 1 (e.g., 0.15 for 15%)');
    }

    try {
      const quantityDecimal = new Decimal(quantity);
      const unitPriceDecimal = new Decimal(unit_price);
      const taxRateDecimal = new Decimal(tax_rate || 0);

      // Calculate amount (before tax) - quantity * unit_price
      const amount = quantityDecimal.mul(unitPriceDecimal);

      // Calculate tax amount
      const taxAmount = amount.mul(taxRateDecimal);

      // Calculate line total (amount + tax_amount)
      const lineTotal = amount.add(taxAmount);

      // Calculate rate_inclusive (unit_price including tax)
      const rateInclusive = unitPriceDecimal.mul(taxRateDecimal.add(1));

      // Round all values to 2 decimals for consistency across the application
      // This ensures displayed amounts match stored amounts and line items add up correctly
      const result = {
        amount: roundToTwoDecimals(amount.toNumber()),
        tax_amount: roundToTwoDecimals(taxAmount.toNumber()),
        line_total: roundToTwoDecimals(lineTotal.toNumber()),
        rate_inclusive: roundToTwoDecimals(rateInclusive.toNumber())
      };

      // Validate results are finite numbers
      Object.entries(result).forEach(([key, value]) => {
        if (!isFinite(value)) {
          throw new Error(`Calculation resulted in invalid ${key}: ${value}`);
        }
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invoice item calculation failed: ${error.message}`);
      }
      throw new Error('Invoice item calculation failed due to unknown error');
    }
  }

  /**
   * Calculate invoice totals from items with proper rounding
   */
  static calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
    // Input validation
    if (!Array.isArray(items)) {
      throw new Error('Invalid items input: must be an array');
    }

    try {
      let subtotal = new Decimal(0);
      let taxTotal = new Decimal(0);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item || typeof item !== 'object') {
          throw new Error(`Invalid item at index ${i}: must be an object`);
        }

        const { amount, tax_amount, line_total } = item;

        // Validate amounts are valid numbers
        if (amount != null) {
          if (isNaN(Number(amount)) || !isFinite(amount)) {
            throw new Error(`Invalid amount at index ${i}: ${amount}`);
          }
          subtotal = subtotal.add(amount);
        }

        if (tax_amount != null) {
          if (isNaN(Number(tax_amount)) || !isFinite(tax_amount)) {
            throw new Error(`Invalid tax_amount at index ${i}: ${tax_amount}`);
          }
          taxTotal = taxTotal.add(tax_amount);
        }
        // If tax_amount is null, it's treated as 0 (no tax)

        // Validate line_total if present (for additional integrity check)
        if (line_total != null && (isNaN(Number(line_total)) || !isFinite(line_total))) {
          throw new Error(`Invalid line_total at index ${i}: ${line_total}`);
        }
      }

      const totalAmount = subtotal.add(taxTotal);

      const result = {
        subtotal: roundToTwoDecimals(subtotal.toNumber()),
        tax_total: roundToTwoDecimals(taxTotal.toNumber()),
        total_amount: roundToTwoDecimals(totalAmount.toNumber())
      };

      // Validate final results
      Object.entries(result).forEach(([key, value]) => {
        if (!isFinite(value)) {
          throw new Error(`Total calculation resulted in invalid ${key}: ${value}`);
        }
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invoice totals calculation failed: ${error.message}`);
      }
      throw new Error('Invoice totals calculation failed due to unknown error');
    }
  }

  /**
   * Calculate invoice status based on payment state
   */
  static calculateInvoiceStatus(totalAmount: number, totalPaid: number, dueDate: Date | null, paidDate: Date | null): string {
    if (paidDate || totalPaid >= totalAmount) {
      return 'paid';
    }

    if (totalPaid > 0) {
      // Partially paid - check if overdue
      if (dueDate && new Date() > dueDate) {
        return 'overdue';
      }
      return 'pending';
    }

    // No payments made
    if (dueDate && new Date() > dueDate) {
      return 'overdue';
    }

    if (totalAmount > 0) {
      return 'pending';
    }

    return 'draft';
  }
}