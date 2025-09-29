"use client";
import { useQuery } from "@tanstack/react-query";

interface UseTaxRateOptions {
  fallbackRate?: number;
}

interface UseTaxRateReturn {
  taxRate: number;
  taxRatePercent: number;
  taxRateFormatted: string;
  isLoading: boolean;
  error: Error | null;
  source: 'organization' | 'fallback';
  details?: {
    id: string;
    tax_name: string;
    country_code: string;
    region_code?: string;
    effective_from: string;
  };
}

/**
 * Hook to get the organization's tax rate
 * Single-tenant architecture: One organization = One tax rate (is_default = true)
 */
export function useTaxRate(options: UseTaxRateOptions = {}): UseTaxRateReturn {
  const { fallbackRate = 0.15 } = options;

  // Fetch organization tax rate directly from tax_rates API
  const organizationTaxQuery = useQuery({
    queryKey: ['tax-rate', 'organization'],
    queryFn: async () => {
      const response = await fetch('/api/tax_rates?is_default=true');
      if (!response.ok) {
        throw new Error('Failed to fetch organization tax rate');
      }
      const data = await response.json();
      const defaultRate = data.tax_rates?.[0];

      if (!defaultRate) {
        return {
          taxRate: 0.15,
          taxRatePercent: 15,
          source: 'fallback'
        };
      }

      return {
        taxRate: defaultRate.rate,
        taxRatePercent: Math.round(defaultRate.rate * 100),
        source: 'organization',
        details: {
          id: defaultRate.id,
          tax_name: defaultRate.tax_name,
          country_code: defaultRate.country_code,
          region_code: defaultRate.region_code,
          effective_from: defaultRate.effective_from
        }
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes (organization rates change infrequently)
    retry: 1,
  });

  // Determine final tax rate and source
  let taxRate: number;
  let taxRatePercent: number;
  let taxRateFormatted: string;
  let source: UseTaxRateReturn['source'];
  let isLoading: boolean;
  let error: Error | null = null;
  let details: UseTaxRateReturn['details'] | undefined;

  if (organizationTaxQuery.data && organizationTaxQuery.data.source === 'organization') {
    // Use organization tax rate
    taxRate = organizationTaxQuery.data.taxRate;
    taxRatePercent = organizationTaxQuery.data.taxRatePercent;
    taxRateFormatted = `${organizationTaxQuery.data.taxRatePercent}%`;
    source = 'organization';
    isLoading = false;
    error = organizationTaxQuery.error;
    details = organizationTaxQuery.data.details;
  } else if (organizationTaxQuery.isLoading) {
    // Still loading - use fallback temporarily
    taxRate = fallbackRate;
    taxRatePercent = Math.round(fallbackRate * 100);
    taxRateFormatted = `${taxRatePercent}%`;
    source = 'fallback';
    isLoading = true;
  } else {
    // Use fallback (either API returned fallback or query failed)
    const apiTaxRate = organizationTaxQuery.data?.taxRate || fallbackRate;
    taxRate = apiTaxRate;
    taxRatePercent = Math.round(apiTaxRate * 100);
    taxRateFormatted = `${taxRatePercent}%`;
    source = (organizationTaxQuery.data?.source as 'organization' | 'fallback') || 'fallback';
    isLoading = false;
    error = organizationTaxQuery.error;
  }

  // Validate tax rate is sensible (between 0 and 1)
  if (typeof taxRate !== 'number' || isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
    console.warn(`Invalid tax rate received: ${taxRate}, using fallback: ${fallbackRate}`);
    taxRate = fallbackRate;
    taxRatePercent = Math.round(fallbackRate * 100);
    taxRateFormatted = `${taxRatePercent}%`;
    source = 'fallback';
  }

  return {
    taxRate,
    taxRatePercent,
    taxRateFormatted,
    isLoading,
    error,
    source,
    details,
  };
}

/**
 * Convenience hook for getting organization tax rate
 * (same as useTaxRate since we're now organization-only)
 */
export function useOrganizationTaxRate(): UseTaxRateReturn {
  return useTaxRate();
}

/**
 * Convenience hook for formatting tax rate as percentage
 * (now built into the main hook, but kept for compatibility)
 */
export function useTaxRateFormatted(options: UseTaxRateOptions = {}) {
  return useTaxRate(options); // All formatting is now built-in
}