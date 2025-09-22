"use client";

import React from 'react';
import { AlertTriangle, FileCheck, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AuthorizationErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride: () => void;
  isLoading?: boolean;
}

export default function AuthorizationErrorDialog({
  isOpen,
  onClose,
  onOverride,
  isLoading = false
}: AuthorizationErrorDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Flight Authorization Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            This solo flight requires flight authorization to be completed before check-out.
            <br />
            <br />
            <strong>Do you want to override this requirement?</strong>
            <br />
            <br />
            <span className="text-xs text-muted-foreground">
              Use this if the authorization was completed on paper or you want to proceed without authorization.
              This action will be logged for audit purposes.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Close
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onOverride}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Overriding...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Override & Check Out
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
