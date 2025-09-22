import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CancellationCategory } from "@/types/bookings";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const cancelBookingSchema = z.object({
  cancellation_category_id: z.string().uuid().optional(),
  reason: z.string().min(1, "Please provide a reason for cancellation"),
  notes: z.string().optional(),
});

type CancelBookingFormData = z.infer<typeof cancelBookingSchema>;

interface CancelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CancelBookingFormData) => Promise<void>;
  categories: CancellationCategory[];
  loading?: boolean;
  error?: string | null;
  bookingId?: string;
}

export function CancelBookingModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  categories,
  loading = false,
  error
  // bookingId
}: CancelBookingModalProps) {
  const { 
    handleSubmit, 
    control, 
    reset, 
    formState: { errors, isSubmitting },
    watch 
  } = useForm<CancelBookingFormData>({
    resolver: zodResolver(cancelBookingSchema),
    defaultValues: { 
      cancellation_category_id: "", 
      reason: "", 
      notes: "" 
    },
  });

  const selectedCategoryId = watch("cancellation_category_id");
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const submitHandler = async (data: CancelBookingFormData) => {
    try {
      await onSubmit(data);
      // Only close on success
      handleClose();
    } catch (error) {
      // Error handling is done by the parent component
      console.error("Error cancelling booking:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Category Selection */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="category" className="font-medium text-sm">
              Cancellation Category
            </Label>
            <Controller
              name="cancellation_category_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {selectedCategory?.description && (
              <div className="flex items-start gap-2 p-2 bg-muted rounded-md text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedCategory.description}</span>
              </div>
            )}
          </div>

          {/* Reason Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="font-medium text-sm">
              Cancellation Reason *
            </Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Textarea 
                  id="reason" 
                  {...field} 
                  placeholder="Describe the reason for cancellation..." 
                  className="min-h-[80px]"
                />
              )}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes" className="font-medium text-sm">
              Additional Notes
            </Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea 
                  id="notes" 
                  {...field} 
                  placeholder="Any additional details or notes..." 
                  className="min-h-[60px]"
                />
              )}
            />
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleClose} 
              disabled={loading || isSubmitting}
            >
              Close
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={loading || isSubmitting}
            >
              {isSubmitting ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 