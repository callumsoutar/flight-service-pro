"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import type { TaxRate } from "@/types/tax_rates";

export default function TaxRateManager() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState({
    country_code: "",
    region_code: "",
    tax_name: "",
    rate: "",
    is_default: false,
  });

  useEffect(() => {
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tax_rates");
      const data = await response.json();
      if (response.ok) {
        setTaxRates(data.tax_rates || []);
      } else {
        setError(data.error || "Failed to fetch tax rates");
      }
    } catch {
      setError("Failed to fetch tax rates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRate ? "/api/tax_rates" : "/api/tax_rates";
      const method = editingRate ? "PATCH" : "POST";
      const body = editingRate 
        ? { id: editingRate.id, ...formData, rate: parseFloat(formData.rate) }
        : { ...formData, rate: parseFloat(formData.rate) };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingRate(null);
        setFormData({ country_code: "", region_code: "", tax_name: "", rate: "", is_default: false });
        fetchTaxRates();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save tax rate");
      }
    } catch {
      setError("Failed to save tax rate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax rate?")) return;
    
    try {
      const response = await fetch("/api/tax_rates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        fetchTaxRates();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete tax rate");
      }
    } catch {
      setError("Failed to delete tax rate");
    }
  };

  const handleEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({
      country_code: rate.country_code,
      region_code: rate.region_code || "",
      tax_name: rate.tax_name,
      rate: rate.rate.toString(),
      is_default: rate.is_default,
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tax Rate Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tax Rate
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRate ? "Edit Tax Rate" : "Add New Tax Rate"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country_code" className="block text-sm font-medium mb-1">Country Code</label>
                  <Input
                    id="country_code"
                    value={formData.country_code}
                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                    placeholder="e.g., US, CA, AU"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="region_code" className="block text-sm font-medium mb-1">Region Code (Optional)</label>
                  <Input
                    id="region_code"
                    value={formData.region_code}
                    onChange={(e) => setFormData({ ...formData, region_code: e.target.value })}
                    placeholder="e.g., CA, NY, ON"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="tax_name" className="block text-sm font-medium mb-1">Tax Name</label>
                <Input
                  id="tax_name"
                  value={formData.tax_name}
                  onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
                  placeholder="e.g., GST, VAT, Sales Tax"
                  required
                />
              </div>
              <div>
                <label htmlFor="rate" className="block text-sm font-medium mb-1">Tax Rate (0-1)</label>
                <Input
                  id="rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="e.g., 0.15 for 15%"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                />
                <label htmlFor="is_default" className="text-sm font-medium">Default Tax Rate</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingRate ? "Update" : "Create"} Tax Rate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRate(null);
                    setFormData({ country_code: "", region_code: "", tax_name: "", rate: "", is_default: false });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {taxRates.map((rate) => (
          <Card key={rate.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{rate.tax_name}</h3>
                    {rate.is_default && <Badge variant="default">Default</Badge>}
                    {!rate.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rate.country_code}
                    {rate.region_code && ` - ${rate.region_code}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rate: {(rate.rate * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(rate)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(rate.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {taxRates.length === 0 && !loading && (
        <div className="text-center text-muted-foreground py-8">
          No tax rates found. Create your first tax rate to get started.
        </div>
      )}
    </div>
  );
} 