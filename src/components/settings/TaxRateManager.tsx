"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import type { TaxRate } from "@/types/tax_rates";

export default function TaxRateManager() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>("");

  useEffect(() => {
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tax_rates");
      const data = await response.json();
      if (response.ok) {
        const rates = data.tax_rates || [];
        setTaxRates(rates);
        
        // Find and set the current default rate
        const defaultRate = rates.find((rate: TaxRate) => rate.is_default);
        if (defaultRate) {
          setSelectedTaxRateId(defaultRate.id);
        }
      } else {
        setError(data.error || "Failed to fetch tax rates");
      }
    } catch {
      setError("Failed to fetch tax rates");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTaxRateId) {
      setError("Please select a tax rate");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // First, unset all defaults
      for (const rate of taxRates) {
        if (rate.is_default) {
          await fetch("/api/tax_rates", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: rate.id, is_default: false }),
          });
        }
      }

      // Then set the selected one as default
      const response = await fetch("/api/tax_rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTaxRateId, is_default: true }),
      });

      if (response.ok) {
        setSuccess("Default tax rate updated successfully!");
        fetchTaxRates(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update default tax rate");
      }
    } catch {
      setError("Failed to update default tax rate");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentDefault = () => {
    return taxRates.find(rate => rate.is_default);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const currentDefault = getCurrentDefault();

  return (
    <div className="max-w-md">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {taxRates.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <div className="mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 mb-2">No Tax Rates Found</p>
            <p className="text-sm text-gray-600 mb-1">Contact your administrator to set up tax rates.</p>
            <p className="text-xs text-gray-500">Tax rates need to be configured before you can select a default.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Default Display */}
          {currentDefault && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Current Default Tax Rate</p>
                  <p className="text-sm text-blue-700">
                    {currentDefault.tax_name} ({currentDefault.country_code}
                    {currentDefault.region_code && ` - ${currentDefault.region_code}`}) • {(currentDefault.rate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selection Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tax-rate-select" className="text-sm font-semibold text-gray-900 block">
                Select Default Tax Rate
              </label>
              <Select value={selectedTaxRateId} onValueChange={setSelectedTaxRateId}>
                <SelectTrigger className="h-12 text-left">
                  <SelectValue placeholder="Choose a tax rate..." />
                </SelectTrigger>
                <SelectContent>
                  {taxRates.map((rate) => (
                    <SelectItem key={rate.id} value={rate.id} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">
                          {rate.tax_name} ({rate.country_code}
                          {rate.region_code && ` - ${rate.region_code}`})
                        </span>
                        <span className="ml-3 text-sm font-semibold text-gray-600">
                          {(rate.rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSetDefault} 
              disabled={saving || !selectedTaxRateId}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Updating Default...
                </>
              ) : (
                "Set as Default Tax Rate"
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500 leading-relaxed">
                This tax rate will be automatically applied to new invoices<br />
                unless specified otherwise.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}