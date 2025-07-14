import { useEffect, useState } from "react";
import { Transaction } from "@/types/transactions";
import { useOrgContext } from "@/components/OrgContextProvider";
import { Loader2, DollarSign, FileText } from "lucide-react";
import { columns as baseColumns } from "@/components/invoices/columns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoices";
import type { User } from "@/types/users";

interface MemberAccountTabProps {
  memberId: string;
}

export default function MemberAccountTab({ memberId }: MemberAccountTabProps) {
  const { currentOrgId } = useOrgContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Invoices Table State ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !currentOrgId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/transactions?user_id=${memberId}&organization_id=${currentOrgId}`)
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data.transactions) ? data.transactions : []))
      .catch(e => setError(e.message || "Failed to load transactions"))
      .finally(() => setLoading(false));
  }, [memberId, currentOrgId]);

  useEffect(() => {
    if (!memberId || !currentOrgId) return;
    setInvoicesLoading(true);
    setInvoicesError(null);
    fetch(`/api/invoices?user_id=${memberId}`)
      .then(res => res.json())
      .then(data => setInvoices(Array.isArray(data.invoices) ? data.invoices : []))
      .catch(e => setInvoicesError(e.message || "Failed to load invoices"))
      .finally(() => setInvoicesLoading(false));
  }, [memberId, currentOrgId]);

  useEffect(() => {
    if (!memberId || !currentOrgId) return;
    setUserLoading(true);
    setUserError(null);
    fetch(`/api/users?id=${memberId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUser(data.users[0]);
        } else {
          setUser(null);
        }
      })
      .catch(e => setUserError(e.message || "Failed to load user"))
      .finally(() => setUserLoading(false));
  }, [memberId, currentOrgId]);

  // Calculate account balance (sum of all completed transaction amounts)
  const balance = user?.account_balance ?? 0;

  // Outstanding invoices: count of unique invoice_ids in debit transactions not fully paid
  const invoiceDebits = transactions.filter(t => t.type === "debit" && t.status === "completed" && t.metadata && t.metadata.invoice_id);
  const invoicePayments = transactions.filter(t => t.type === "payment" && t.status === "completed" && t.metadata && t.metadata.invoice_id);
  const outstandingInvoices = Array.from(new Set(invoiceDebits.map(d => d.metadata && d.metadata.invoice_id))).filter(invoiceId => {
    if (!invoiceId) return false;
    const totalDebits = invoiceDebits.filter(d => d.metadata && d.metadata.invoice_id === invoiceId).reduce((sum, d) => sum + Number(d.amount), 0);
    const totalPayments = invoicePayments.filter(p => p.metadata && p.metadata.invoice_id === invoiceId).reduce((sum, p) => sum + Number(p.amount), 0);
    return Math.abs(totalPayments) < Math.abs(totalDebits);
  });

  // Remove the user column for this context
  const columns = baseColumns.filter(col => (col as { accessorKey?: string }).accessorKey !== "user_id");

  // Only show invoices for this member
  const memberInvoices = invoices.filter(inv => inv.user_id === memberId);

  // Pagination state for invoices table
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const pageCount = Math.ceil(memberInvoices.length / pageSize);
  const paginatedInvoices = memberInvoices.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-8">
      {/* Horizontal Info Bar */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
        <div className="flex-1 flex flex-col items-center justify-center">
          <DollarSign className="w-6 h-6 mb-1 text-green-500" />
          <div className="text-xs text-muted-foreground">Account Balance</div>
          {loading || userLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground my-2" />
          ) : error || userError ? (
            <div className="text-destructive text-sm">{error || userError}</div>
          ) : (
            <div className="flex flex-col items-center">
              {balance < 0 ? (
                <>
                  <span className="text-3xl font-bold text-green-600">${Math.abs(balance).toFixed(2)}</span>
                  <span className="text-xs mt-1 uppercase tracking-wider text-green-700 font-semibold">Credit</span>
                </>
              ) : balance > 0 ? (
                <>
                  <span className="text-3xl font-bold text-red-600">${balance.toFixed(2)}</span>
                  <span className="text-xs mt-1 uppercase tracking-wider text-red-700 font-semibold">Owing</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-gray-700">$0.00</span>
                  <span className="text-xs mt-1 uppercase tracking-wider text-gray-500 font-semibold">Settled</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:block w-px bg-gray-200 mx-2" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <FileText className="w-6 h-6 mb-1 text-orange-500" />
          <div className="text-xs text-muted-foreground">Outstanding Invoices</div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground my-2" />
          ) : error ? (
            <div className="text-destructive text-sm">{error}</div>
          ) : (
            <div className="text-xl font-bold text-orange-600">{outstandingInvoices.length}</div>
          )}
        </div>
      </div>
      {/* Invoices Table */}
      <div>
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
          Invoices
        </h3>
        <div className="rounded-md border overflow-x-auto bg-white">
          {invoicesLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading invoices...</div>
          ) : invoicesError ? (
            <div className="p-6 text-center text-destructive">{invoicesError}</div>
          ) : memberInvoices.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No invoices found for this member.</div>
          ) : (
            <>
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    {columns.map((col, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap">{typeof col.header === "function" ? (typeof (col as { accessorKey?: string }).accessorKey === 'string' ? (col as { accessorKey: string }).accessorKey : "") : col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-blue-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/invoices/view/${inv.id}`)}
                    >
                      {columns.map((col, idx) => {
                        let cell: React.ReactNode;
                        if (typeof col.cell === "function") {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          cell = col.cell({ row: { original: inv } } as any) as React.ReactNode;
                        } else if (typeof (col as { accessorKey?: string }).accessorKey === "string") {
                          cell = (inv as Record<string, unknown>)[(col as { accessorKey: string }).accessorKey] as React.ReactNode;
                        } else {
                          cell = null;
                        }
                        return <TableCell key={idx} className="whitespace-nowrap">{cell}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end space-x-2 py-4 px-4 pb-2">
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 mx-2"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {pageCount}
                </span>
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 mx-2"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 