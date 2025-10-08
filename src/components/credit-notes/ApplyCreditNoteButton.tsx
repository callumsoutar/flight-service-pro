"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ApplyCreditNoteButtonProps {
  creditNoteId: string;
  creditNoteNumber: string;
  totalAmount: number;
  status: string;
  onSuccess: () => void;
}

export default function ApplyCreditNoteButton({
  creditNoteId,
  creditNoteNumber,
  totalAmount,
  status,
  onSuccess,
}: ApplyCreditNoteButtonProps) {
  const [isApplying, setIsApplying] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Only show for draft credit notes
  if (status !== "draft") {
    return null;
  }

  const handleApply = async () => {
    setIsApplying(true);

    try {
      const response = await fetch(`/api/credit-notes/${creditNoteId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply credit note");
      }

      toast.success(
        `Credit note ${creditNoteNumber} applied successfully! $${data.amount_credited.toFixed(2)} credited to account.`
      );
      
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Apply credit note error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to apply credit note");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          Apply Credit Note
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Credit Note?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                Are you sure you want to apply credit note <strong>{creditNoteNumber}</strong>?
              </div>
              <div>
                This will:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Credit <strong>${totalAmount.toFixed(2)}</strong> to the user&apos;s account</li>
                <li>Create a credit transaction in the system</li>
                <li>Update the user&apos;s account balance</li>
                <li>Make the credit note immutable (cannot be edited or deleted)</li>
              </ul>
              <div className="text-amber-600 font-medium mt-2">
                ⚠️ This action cannot be undone.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isApplying}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleApply();
            }}
            disabled={isApplying}
            className="bg-green-600 hover:bg-green-700"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Credit Note"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

