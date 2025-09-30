/**
 * Invoice Number Configuration
 * Centralized configuration for invoice number generation patterns
 */

export const INVOICE_CONFIG = {
  // Default prefix - can be overridden by settings
  DEFAULT_PREFIX: 'INV',
  
  // Format pattern: {PREFIX}-{YEAR-MONTH}-{SEQUENCE}
  // Example: INV-2025-01-0001
  FORMAT_PATTERN: '{PREFIX}-{YEAR_MONTH}-{SEQUENCE}',
  
  // Sequence padding (number of digits)
  SEQUENCE_PADDING: 4,
  
  // Date format for year-month
  DATE_FORMAT: 'YYYY-MM',
  
  // Fallback pattern when invoice_number is null
  // Uses a different format to distinguish from sequential numbers
  FALLBACK_PATTERN: '{PREFIX}-{ID}',
} as const;

/**
 * Generate invoice number using configurable pattern
 */
export function formatInvoiceNumber(
  prefix: string,
  yearMonth: string,
  sequence: number,
  padding: number = INVOICE_CONFIG.SEQUENCE_PADDING
): string {
  const paddedSequence = sequence.toString().padStart(padding, '0');
  return INVOICE_CONFIG.FORMAT_PATTERN
    .replace('{PREFIX}', prefix)
    .replace('{YEAR_MONTH}', yearMonth)
    .replace('{SEQUENCE}', paddedSequence);
}

/**
 * Generate fallback invoice number when sequential generation fails
 */
export function formatFallbackInvoiceNumber(prefix: string, invoiceId: string): string {
  return INVOICE_CONFIG.FALLBACK_PATTERN
    .replace('{PREFIX}', prefix)
    .replace('{ID}', invoiceId);
}

/**
 * Extract prefix from existing invoice number
 */
export function extractInvoicePrefix(invoiceNumber: string): string | null {
  const match = invoiceNumber.match(/^([A-Z]+)-/);
  return match ? match[1] : null;
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  // Check if it matches the expected pattern: PREFIX-YYYY-MM-NNNN
  const pattern = /^[A-Z]+-\d{4}-\d{2}-\d{4}$/;
  return pattern.test(invoiceNumber);
}
