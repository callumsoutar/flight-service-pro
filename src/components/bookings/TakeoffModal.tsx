"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Plane, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface TakeoffModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  onClose: () => void;
}

export default function TakeoffModal({ isOpen, isLoading, isSuccess, onClose }: TakeoffModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess && !isLoading) {
      setShowSuccess(true);

      // Auto-close after showing success
      const closeTimer = setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 2000);

      return () => {
        clearTimeout(closeTimer);
      };
    } else {
      setShowSuccess(false);
    }
  }, [isSuccess, isLoading, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-none bg-white shadow-lg">
        <VisuallyHidden>
          <DialogTitle>
            {isLoading ? "Saving check-out" : "Check-out saved"}
          </DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col items-center justify-center py-12 px-8">
          {isLoading && !showSuccess && (
            <div className="flex flex-col items-center gap-6">
              {/* Simple spinning loader with plane icon */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <Plane className="absolute inset-0 m-auto w-10 h-10 text-blue-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">Saving check-out...</p>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="flex flex-col items-center gap-6 animate-fade-in">
              {/* Success icon */}
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-14 h-14 text-green-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Saved successfully!</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-in;
        }
      `}</style>
    </Dialog>
  );
}
