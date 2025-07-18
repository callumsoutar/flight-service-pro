import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";

interface CancelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { categoryId: string; reason: string }) => void;
  categories: { id: string; name: string }[];
  loading?: boolean;
}

export function CancelBookingModal({ open, onOpenChange, onSubmit, categories, loading }: CancelBookingModalProps) {
  const { handleSubmit, control, reset } = useForm<{ categoryId: string; reason: string }>({
    defaultValues: { categoryId: "", reason: "" },
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const submitHandler = (data: { categoryId: string; reason: string }) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Cancel Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-medium text-sm" htmlFor="category">Reason</label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Please select a reason" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-sm" htmlFor="reason">Description</label>
            <Controller
              name="reason"
              control={control}
              rules={{ required: "Please provide a description" }}
              render={({ field }) => (
                <Textarea id="reason" {...field} placeholder="Describe the reason for cancellation..." className="min-h-[80px]" />
              )}
            />
          </div>
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
              Close
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 