"use client";
import React, { useState, useEffect } from "react";
import { Loader2, DollarSign, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaxRate } from "@/types/tax_rates";

export default function TaxRateManager() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>("");

  useEffect(() => {
    fetchTaxRates();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchTaxRates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tax_rates");
      const data = await response.json();
      if (response.ok) {
        const rates = data.tax_rates || [];
        setTaxRates(rates);
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

  const handleSaveDefault = async () => {
    if (!selectedTaxRateId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      for (const rate of taxRates) {
        if (rate.is_default) {
          await fetch("/api/tax_rates", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: rate.id, is_default: false }),
          });
        }
      }

      const response = await fetch("/api/tax_rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTaxRateId, is_default: true }),
      });

      if (response.ok) {
        setSuccess("Tax rate updated successfully");
        await fetchTaxRates();
        setIsEditing(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update tax rate");
      }
    } catch {
      setError("Failed to update tax rate");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const defaultRate = taxRates.find(rate => rate.is_default);
    if (defaultRate) {
      setSelectedTaxRateId(defaultRate.id);
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (taxRates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Tax Rates Found</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Contact your administrator to set up tax rates.
        </p>
      </div>
    );
  }

  const currentDefault = taxRates.find(rate => rate.is_default);

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {!isEditing && currentDefault ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{currentDefault.tax_name}</h3>
                  <span className="text-sm text-gray-500">
                    {currentDefault.country_code}{currentDefault.region_code && ` - ${currentDefault.region_code}`}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Applied to all new invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xl font-semibold text-gray-900">
                {(currentDefault.rate * 100).toFixed(2)}%
              </div>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Default Tax Rate
            </label>
            <Select value={selectedTaxRateId} onValueChange={setSelectedTaxRateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a tax rate..." />
              </SelectTrigger>
              <SelectContent>
                {taxRates.map((rate) => (
                  <SelectItem key={rate.id} value={rate.id}>
                    {rate.tax_name} ({rate.country_code}{rate.region_code && ` - ${rate.region_code}`}) - {(rate.rate * 100).toFixed(2)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveDefault} disabled={saving || !selectedTaxRateId}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button onClick={handleCancel} variant="outline" disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}