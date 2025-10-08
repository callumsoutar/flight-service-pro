"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  Search, 
  Filter,
  Eye,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { CreditNote } from "@/types/credit_notes";
import ApplyCreditNoteButton from "@/components/credit-notes/ApplyCreditNoteButton";
import { useRouter } from "next/navigation";

interface CreditNotesClientPageProps {
  userRole: string;
}

export default function CreditNotesClientPage({ userRole }: CreditNotesClientPageProps) {
  const router = useRouter();
  const [creditNotes, setCreditNotes] = React.useState<(CreditNote & { 
    users?: { first_name?: string; last_name?: string; email?: string };
    invoices?: { invoice_number: string; status: string };
  })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  React.useEffect(() => {
    fetchCreditNotes();
  }, []);

  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/credit-notes");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch credit notes");
      }

      setCreditNotes(data.credit_notes || []);
    } catch (error) {
      console.error("Error fetching credit notes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load credit notes");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuccess = () => {
    toast.success("Credit note applied successfully");
    fetchCreditNotes(); // Refresh the list
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

  const getUserName = React.useCallback((creditNote: typeof creditNotes[0]) => {
    if (!creditNote.users) return "-";
    const name = `${creditNote.users.first_name || ''} ${creditNote.users.last_name || ''}`.trim();
    return name || creditNote.users.email || "-";
  }, []);

  // Filter credit notes
  const filteredCreditNotes = React.useMemo(() => {
    return creditNotes.filter((cn) => {
      // Status filter
      if (statusFilter !== "all" && cn.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesNumber = cn.credit_note_number.toLowerCase().includes(searchLower);
        const matchesReason = cn.reason.toLowerCase().includes(searchLower);
        const matchesInvoice = cn.invoices?.invoice_number.toLowerCase().includes(searchLower);
        const matchesUser = getUserName(cn).toLowerCase().includes(searchLower);

        return matchesNumber || matchesReason || matchesInvoice || matchesUser;
      }

      return true;
    });
  }, [creditNotes, statusFilter, searchTerm, getUserName]);

  const totalCredits = creditNotes.reduce((sum, cn) => {
    return cn.status === "applied" ? sum + cn.total_amount : sum;
  }, 0);

  const draftCount = creditNotes.filter(cn => cn.status === "draft").length;
  const appliedCount = creditNotes.filter(cn => cn.status === "applied").length;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Credit Notes
        </h1>
        <p className="text-muted-foreground">
          Manage credit notes for invoice corrections and adjustments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Credit Notes</CardDescription>
            <CardTitle className="text-3xl">{creditNotes.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Applied Credits</CardDescription>
            <CardTitle className="text-3xl text-green-600">${totalCredits.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <div className="flex gap-4 mt-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Draft:</span>{" "}
                <span className="font-semibold">{draftCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Applied:</span>{" "}
                <span className="font-semibold">{appliedCount}</span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search credit notes, invoices, or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Credit Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Notes List</CardTitle>
          <CardDescription>
            {filteredCreditNotes.length} credit note{filteredCreditNotes.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No credit notes match your filters"
                  : "No credit notes have been created yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreditNotes.map((creditNote) => (
                    <TableRow key={creditNote.id}>
                      <TableCell className="font-mono font-medium">
                        {creditNote.credit_note_number}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/dashboard/invoices/view/${creditNote.original_invoice_id}`)}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {creditNote.invoices?.invoice_number || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {getUserName(creditNote)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={creditNote.reason}>
                        {creditNote.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(creditNote.status)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4" />
                          {creditNote.total_amount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(creditNote.issue_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {userRole === "admin" || userRole === "owner" ? (
                            <ApplyCreditNoteButton
                              creditNoteId={creditNote.id}
                              creditNoteNumber={creditNote.credit_note_number}
                              totalAmount={creditNote.total_amount}
                              status={creditNote.status}
                              onSuccess={handleApplySuccess}
                            />
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/dashboard/invoices/view/${creditNote.original_invoice_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

