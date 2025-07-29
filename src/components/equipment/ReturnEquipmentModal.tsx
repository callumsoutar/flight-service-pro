"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Package, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Equipment, EquipmentIssuance } from '@/types/equipment';
import type { UserResult } from '@/components/invoices/MemberSelect';

interface ReturnEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
  issuance: EquipmentIssuance;
  issuedUser: UserResult;
  refresh: () => void;
}

export const ReturnEquipmentModal: React.FC<ReturnEquipmentModalProps> = ({ 
  open, 
  onClose, 
  equipment, 
  issuance, 
  issuedUser, 
  refresh 
}) => {
  const [returnDate, setReturnDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        id: issuance.id,
        returned_at: returnDate.toISOString(),
      };

      const res = await fetch('/api/equipment_issuance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`${equipment.name} returned successfully!`);
        refresh();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to return equipment');
      }
    } catch (err) {
      console.error('Return equipment error:', err);
      setError('An error occurred while returning equipment');
    } finally {
      setLoading(false);
    }
  };

  const displayUserName = () => {
    if (issuedUser.first_name || issuedUser.last_name) {
      return `${issuedUser.first_name ?? ''} ${issuedUser.last_name ?? ''}`.trim();
    }
    return issuedUser.email;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-center mb-6">Return Equipment</h3>
          
          {/* Equipment and User Info */}
          <div className="bg-muted rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-indigo-600" />
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Equipment</span>
                <span className="font-semibold">
                  {equipment.name}
                  {equipment.serial_number && (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      S/N: {equipment.serial_number}
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Currently Issued To</span>
                <span className="font-semibold">{displayUserName()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-4 h-4 text-orange-600" />
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Issued Date</span>
                <span className="font-semibold">
                  {format(new Date(issuance.issued_at), "dd MMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Return Date */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Return Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !returnDate && "text-muted-foreground"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, "dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={date => setReturnDate(date ?? new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Return Notes <span className="text-xs">(optional)</span>
            </label>
            <textarea 
              className="w-full border rounded p-2 min-h-[60px] mt-1 text-sm" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Any notes about the return condition..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-red-600 text-sm mb-4 text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button 
            variant="outline" 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="min-w-[90px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[120px] bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            {loading ? (
              "Returning..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Return Equipment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}; 