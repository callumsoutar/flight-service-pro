"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Mail, Download, Printer, Pencil, Loader2, Trash2, Eye, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useCurrentUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";

export default function InvoiceOptionsDropdown({
  invoiceId,
  invoiceNumber,
  bookingId,
  mode = 'view',
  onDelete,
  status,
}: {
  invoiceId: string;
  invoiceNumber: string | null;
  bookingId?: string | null;
  mode?: 'view' | 'edit';
  onDelete?: () => void;
  status?: string;
}) {
  const router = useRouter();
  const { data: userRoleData } = useCurrentUserRoles();
  const userRole = userRoleData?.role?.toLowerCase() || '';
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);

  // Check if user is admin or owner
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Invoice PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPDF = async () => {
    setIsPrinting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a blob URL
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in a new window
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        // Wait for PDF to load, then trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
          // Cleanup the blob URL after a delay to ensure print dialog has opened
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 100);
        };
      } else {
        // Fallback if popup was blocked
        window.URL.revokeObjectURL(url);
        toast.error('Please allow popups to print the invoice');
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleEmailInvoice = async () => {
    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send email' }));
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      toast.success(`Invoice emailed successfully to ${data.recipientEmail}`);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
        >
          Options
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Section 1: Invoice Actions */}
        {(mode === 'view' && isAdminOrOwner && status !== 'paid') || (mode === 'edit' && status !== 'draft') ? (
          <>
            {mode === 'view' && isAdminOrOwner && status !== 'paid' && (
              <DropdownMenuItem onClick={() => router.push(`/dashboard/invoices/edit/${invoiceId}`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {mode === 'edit' && status !== 'draft' && (
              <DropdownMenuItem onClick={() => router.push(`/dashboard/invoices/view/${invoiceId}`)}>
                <Eye className="w-4 h-4 mr-2" />
                View Invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        ) : null}

        {/* Section 2: Related Content */}
        {bookingId && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/bookings/view/${bookingId}`)}>
              <Calendar className="w-4 h-4 mr-2" />
              View Booking
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Section 3: Export & Communication */}
        {status !== 'draft' && (
          <>
            <DropdownMenuItem onClick={handleEmailInvoice} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isSendingEmail ? 'Sending...' : 'Email'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isDownloading ? 'Generating PDF...' : 'Download'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrintPDF} disabled={isPrinting}>
              {isPrinting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              {isPrinting ? 'Generating PDF...' : 'Print'}
            </DropdownMenuItem>
          </>
        )}

        {/* Section 4: Dangerous Actions */}
        {mode === 'edit' && isAdminOrOwner && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:bg-red-50 hover:bg-red-50 group"
            >
              <Trash2 className="w-4 h-4 mr-2 text-red-600 group-hover:text-red-700" />
              <span>Delete Invoice</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 