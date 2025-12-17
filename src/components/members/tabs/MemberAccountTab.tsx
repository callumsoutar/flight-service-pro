import { useEffect, useState, useCallback } from "react";
import { Loader2, DollarSign, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { User } from "@/types/users";
import type { Invoice } from "@/types/invoices";

interface MemberAccountTabProps {
  memberId: string;
  member?: User;
}

interface AccountStatementEntry {
  date: string;
  reference: string;
  description: string;
  amount: number;
  balance: number;
  entry_type: 'invoice' | 'payment' | 'credit_note' | 'opening_balance';
  entry_id: string;
}

export default function MemberAccountTab({ memberId, member }: MemberAccountTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Account Statement State ---
  const [statement, setStatement] = useState<AccountStatementEntry[]>([]);
  const [statementLoading, setStatementLoading] = useState(true);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  // --- Invoices State (for outstanding count) ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    setLoading(false);
  }, [memberId]);

  // Function to fetch account statement
  const fetchAccountStatement = useCallback(() => {
    if (!memberId) return;
    setStatementLoading(true);
    setStatementError(null);
    fetch(`/api/account-statement?user_id=${memberId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        setStatement(Array.isArray(data.statement) ? data.statement : []);
        setClosingBalance(data.closing_balance || 0);
      })
      .catch(e => setStatementError(e.message || "Failed to load account statement"))
      .finally(() => setStatementLoading(false));
  }, [memberId]);

  // Fetch account statement on mount and when memberId changes
  useEffect(() => {
    fetchAccountStatement();
  }, [fetchAccountStatement]);

  // Refetch when window regains focus (handles cases where invoice/payment created in another tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchAccountStatement();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAccountStatement]);

  // Fetch invoices for outstanding count
  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/invoices?user_id=${memberId}`)
      .then(res => res.json())
      .then(data => setInvoices(Array.isArray(data.invoices) ? data.invoices : []))
      .catch(e => console.error("Failed to load invoices:", e));
  }, [memberId]);

  // Use closingBalance from account statement API (calculated from transactions)
  // Balance is calculated dynamically from all transactions - no stored column needed
  // Fall back to 0 while statement is loading
  const balance = statementLoading ? 0 : closingBalance;

  // Outstanding invoices: count pending/overdue invoices
  const outstandingInvoicesCount = invoices.filter(invoice => 
    invoice.user_id === memberId && 
    (invoice.status === 'pending' || invoice.status === 'overdue')
  ).length;

  // Pagination state for statement table
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const pageCount = Math.ceil(statement.length / pageSize);
  const paginatedStatement = statement.slice(page * pageSize, (page + 1) * pageSize);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  // Helper function to get entry type badge
  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Invoice</span>;
      case 'payment':
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Payment</span>;
      case 'credit_note':
        return <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Credit Note</span>;
      case 'opening_balance':
        return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Opening</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Horizontal Info Bar */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
        <div className="flex-1 flex flex-col items-center justify-center">
          <DollarSign className="w-6 h-6 mb-1 text-green-500" />
          <div className="text-xs text-muted-foreground">Account Balance</div>
          {!member ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground my-2" />
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
            <div className="text-xl font-bold text-orange-600">{outstandingInvoicesCount}</div>
          )}
        </div>
      </div>

      {/* Account Statement Table */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          Account Statement
        </h3>
        <div className="rounded-md border overflow-x-auto bg-white shadow-sm">
          {statementLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading account statement...</p>
            </div>
          ) : statementError ? (
            <div className="p-8 text-center text-destructive">{statementError}</div>
          ) : statement.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No transactions found for this member.</div>
          ) : (
            <>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Reference</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                    <TableHead className="font-semibold text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStatement.map((entry, index) => {
                    const isOpeningBalance = entry.entry_type === 'opening_balance';
                    const isDebit = entry.amount > 0; // Positive = invoice (debit)
                    
                    return (
                      <TableRow 
                        key={`${entry.entry_id}-${index}`}
                        className={isOpeningBalance ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          <div className="flex items-center gap-2">
                            {entry.reference}
                            {!isOpeningBalance && getEntryTypeBadge(entry.entry_type)}
                          </div>
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isOpeningBalance ? (
                            <span className="text-gray-500">—</span>
                          ) : isDebit ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(entry.amount)}
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(entry.amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-semibold">
                          {entry.balance < 0 ? (
                            <span className="text-green-600">
                              ${Math.abs(entry.balance).toFixed(2)} CR
                            </span>
                          ) : entry.balance > 0 ? (
                            <span className="text-red-600">
                              ${entry.balance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-600">$0.00</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Closing Balance Row */}
                  <TableRow className="bg-blue-100 font-bold border-t-2 border-blue-300">
                    <TableCell colSpan={3} className="text-right uppercase tracking-wide">
                      Closing Balance
                    </TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right text-lg">
                      {closingBalance < 0 ? (
                        <span className="text-green-700">
                          ${Math.abs(closingBalance).toFixed(2)} CR
                        </span>
                      ) : closingBalance > 0 ? (
                        <span className="text-red-700">
                          ${closingBalance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-700">$0.00</span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {statement.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, statement.length)} of {statement.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-white transition-colors"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page + 1} of {pageCount}
                    </span>
                    <button
                      className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-white transition-colors"
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={page >= pageCount - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 