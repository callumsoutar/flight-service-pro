import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Rounds a number to 2 decimal places to avoid floating point precision issues
 * Uses the same pattern as roundToOneDecimal but for currency (2 decimal places)
 * @param amount - The amount to round
 * @returns The amount rounded to 2 decimal places
 */
export function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Formats a currency amount for display with proper locale formatting
 * Uses roundToTwoDecimals to clean up floating point precision issues
 * @param amount - The amount to format
 * @param options - Intl.NumberFormat options
 * @returns The formatted currency string
 */
export function formatCurrencyDisplay(amount: number, options?: Intl.NumberFormatOptions): string {
  const cleanAmount = roundToTwoDecimals(amount);
  return cleanAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
}

/**
 * Rounds a number to 1 decimal place (for flight time calculations)
 * Consistent with existing roundToOneDecimal pattern used throughout the codebase
 * @param value - The value to round
 * @returns The value rounded to 1 decimal place
 */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
