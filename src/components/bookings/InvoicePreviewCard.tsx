"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, CheckCircle2, FileText, Loader2, Pencil, Check, X } from "lucide-react";
import UnifiedChargeableSearch from "@/components/bookings/UnifiedChargeableSearch";
import { roundToTwoDecimals } from "@/lib/utils";
import type { Chargeable } from "@/types/chargeables";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  rate_inclusive?: number;
  amount: number;
  tax_amount: number;
  tax_rate?: number;
  line_total: number;
  chargeable_id?: string | null;
}

interface InvoicePreviewCardProps {
  invoiceItems: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: { quantity: number; unit_price: number }) => void;
  onAddChargeable: (item: Chargeable, quantity: number) => void;
  onAddLandingFee: (item: { chargeable_id: string; description: string; rate: number; is_taxable: boolean }, quantity: number) => void;
  onComplete: () => void;
  isCompleting: boolean;
  isUpdating: boolean;
  completeSuccess: boolean;
  isDualFlight: boolean;
  aircraftTypeId?: string;
}

export default function InvoicePreviewCard({
  invoiceItems,
  subtotal,
  tax,
  total,
  taxRate,
  onDeleteItem,
  onUpdateItem,
  onAddChargeable,
  onAddLandingFee,
  onComplete,
  isCompleting,
  isUpdating,
  completeSuccess,
  isDualFlight,
  aircraftTypeId,
}: InvoicePreviewCardProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  const hasItems = invoiceItems.length > 0;

  // Start editing an item
  const startEditItem = (item: InvoiceItem) => {
    setEditingItemId(item.id);
    setEditRate(item.rate_inclusive || item.unit_price);
    setEditQuantity(item.quantity);
  };

  // Cancel editing
  const cancelEditItem = () => {
    setEditingItemId(null);
  };

  // Save edited item
  const saveEditItem = (item: InvoiceItem) => {
    // Convert tax-inclusive rate back to tax-exclusive unit_price
    // editRate is displayed as tax-inclusive, but backend expects tax-exclusive unit_price
    const itemTaxRate = item.tax_rate || taxRate;
    const taxExclusiveUnitPrice = editRate / (1 + itemTaxRate);
    
    onUpdateItem(item.id, {
      quantity: editQuantity,
      unit_price: taxExclusiveUnitPrice,
    });
    
    setEditingItemId(null);
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Items Table */}
        {hasItems ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-xs font-medium text-gray-600">
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3 w-20">Qty</th>
                  <th className="text-right p-3 w-28">Rate (incl. tax)</th>
                  <th className="text-right p-3 w-24">Total</th>
                  <th className="text-center p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, idx) => (
                  <tr key={item.id} className={`border-t ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="p-3 text-sm">{item.description}</td>
                    <td className="p-3 text-center text-sm">
                      {editingItemId === item.id ? (
                        <input
                          type="number"
                          className="border rounded px-1 py-1 text-center w-14 focus:ring-2 focus:ring-blue-500"
                          style={{ appearance: 'textfield', MozAppearance: 'textfield' }}
                          value={editQuantity}
                          min={1}
                          step={1}
                          onChange={e => setEditQuantity(Number(e.target.value))}
                          disabled={isUpdating}
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-sm">
                      {editingItemId === item.id ? (
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-right w-20 focus:ring-2 focus:ring-blue-500"
                          style={{ appearance: 'textfield', MozAppearance: 'textfield' }}
                          value={editRate}
                          min={0}
                          step={0.01}
                          onChange={e => setEditRate(Number(e.target.value))}
                          disabled={isUpdating}
                        />
                      ) : (
                        <span>
                          ${roundToTwoDecimals(item.rate_inclusive || item.unit_price).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-sm font-medium">
                      ${roundToTwoDecimals(item.line_total).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {editingItemId === item.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-800 hover:bg-green-50"
                            onClick={() => saveEditItem(item)}
                            disabled={isUpdating}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            onClick={cancelEditItem}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => startEditItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No items yet. Calculate flight charges to begin.</p>
          </div>
        )}

        {/* Add Chargeables Section */}
        {hasItems && (
          <div className="space-y-4">
            <Separator />
            <UnifiedChargeableSearch
              onAddChargeable={onAddChargeable}
              onAddLandingFee={onAddLandingFee}
              taxRate={taxRate}
              aircraftTypeId={aircraftTypeId}
            />
          </div>
        )}

        {/* Totals */}
        {hasItems && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal (excl. tax)</span>
                <span className="font-medium">${roundToTwoDecimals(subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({Math.round(taxRate * 100)}%)</span>
                <span className="font-medium">${roundToTwoDecimals(tax).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-green-600">${roundToTwoDecimals(total).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        {hasItems && (
          <div className="space-y-3 pt-4">
            {/* Success message after completion */}
            {completeSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                {isDualFlight ? 'Flight charges saved!' : 'Solo flight completed successfully!'}
              </div>
            )}

            {/* Action buttons - hide after completion */}
            {!completeSuccess && (
              <button
                onClick={onComplete}
                disabled={isCompleting}
                type="button"
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save and Continue
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

