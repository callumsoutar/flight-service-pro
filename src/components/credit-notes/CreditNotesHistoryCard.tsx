"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { CreditNote } from "@/types/credit_notes";
import ApplyCreditNoteButton from "@/components/credit-notes/ApplyCreditNoteButton";

interface CreditNotesHistoryCardProps {
  invoiceId: string;
  userRole?: string;
}

export default function CreditNotesHistoryCard({ invoiceId, userRole }: CreditNotesHistoryCardProps) {
  const [creditNotes, setCreditNotes] = React.useState<CreditNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCreditNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/credit-notes?invoice_id=${invoiceId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch credit notes");
      }

      setCreditNotes(data.credit_notes || []);
    } catch (err) {
      console.error("Error fetching credit notes:", err);
      setError(err instanceof Error ? err.message : "Failed to load credit notes");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuccess = () => {
    // Refresh credit notes after applying
    fetchCreditNotes();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "applied":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Applied</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Don't render anything if loading, error, or no credit notes exist
  if (loading || error || creditNotes.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <h2 className="text-base font-semibold">Credit Notes</h2>
            <Badge variant="outline" className="text-xs">
              {creditNotes.length} {creditNotes.length !== 1 ? "issued" : "issued"}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">NUMBER</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">STATUS</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">REASON</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">DATE</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">AMOUNT</th>
              {userRole && (userRole === "admin" || userRole === "owner") && (
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">ACTIONS</th>
              )}
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((creditNote) => (
              <tr key={creditNote.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-4 text-sm font-mono">{creditNote.credit_note_number}</td>
                <td className="py-2.5 px-4">{getStatusBadge(creditNote.status)}</td>
                <td className="py-2.5 px-4 text-sm text-muted-foreground max-w-xs truncate">
                  {creditNote.reason}
                </td>
                <td className="py-2.5 px-4 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(creditNote.issue_date)}
                  {creditNote.applied_date && (
                    <span className="block text-xs text-green-600">
                      Applied: {formatDate(creditNote.applied_date)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right text-sm font-semibold text-green-600">
                  ${creditNote.total_amount.toFixed(2)}
                </td>
                {userRole && (userRole === "admin" || userRole === "owner") && (
                  <td className="py-2.5 px-4 text-right">
                    <ApplyCreditNoteButton
                      creditNoteId={creditNote.id}
                      creditNoteNumber={creditNote.credit_note_number}
                      totalAmount={creditNote.total_amount}
                      status={creditNote.status}
                      onSuccess={handleApplySuccess}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

