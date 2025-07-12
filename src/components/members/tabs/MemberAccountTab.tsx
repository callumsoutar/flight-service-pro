import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Transaction } from "@/types/transactions";
import { useOrgContext } from "@/components/OrgContextProvider";
import { Loader2, DollarSign, FileText, CreditCard } from "lucide-react";

interface MemberAccountTabProps {
  memberId: string;
}

export default function MemberAccountTab({ memberId }: MemberAccountTabProps) {
  const { currentOrgId } = useOrgContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate account balance (sum of all completed transaction amounts)
  const balance = transactions
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Outstanding invoices: count of unique invoice_ids in debit transactions not fully paid
  const invoiceDebits = transactions.filter(t => t.type === "debit" && t.status === "completed" && t.metadata && t.metadata.invoice_id);
  const invoicePayments = transactions.filter(t => t.type === "payment" && t.status === "completed" && t.metadata && t.metadata.invoice_id);
  const outstandingInvoices = Array.from(new Set(invoiceDebits.map(d => d.metadata && d.metadata.invoice_id))).filter(invoiceId => {
    if (!invoiceId) return false;
    const totalDebits = invoiceDebits.filter(d => d.metadata && d.metadata.invoice_id === invoiceId).reduce((sum, d) => sum + Number(d.amount), 0);
    const totalPayments = invoicePayments.filter(p => p.metadata && p.metadata.invoice_id === invoiceId).reduce((sum, p) => sum + Number(p.amount), 0);
    return Math.abs(totalPayments) < Math.abs(totalDebits);
  });

  // Last payment (by date)
  const lastPayment = transactions
    .filter(t => t.type === "payment" && t.status === "completed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto mt-6">
      {/* Account Balance Card */}
      <Card className="border border-gray-200 rounded-2xl bg-white">
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <DollarSign className="w-8 h-8 mb-2 text-green-500" />
          <div className="text-xl font-semibold mb-1 text-center">Account Balance</div>
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground my-4" />
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : (
            <span className={`text-4xl font-extrabold tracking-tight ${balance < 0 ? "text-red-600" : "text-green-600"}`}>{balance < 0 ? "-" : ""}${Math.abs(balance).toFixed(2)}</span>
          )}
        </CardContent>
      </Card>
      {/* Outstanding Invoices Card */}
      <Card className="border border-gray-200 rounded-2xl bg-white">
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <FileText className="w-8 h-8 mb-2 text-orange-500" />
          <div className="text-xl font-semibold mb-1 text-center">Outstanding Invoices</div>
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground my-4" />
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : (
            <span className="text-4xl font-extrabold tracking-tight text-orange-600">{outstandingInvoices.length}</span>
          )}
        </CardContent>
      </Card>
      {/* Last Payment Card */}
      <Card className="border border-gray-200 rounded-2xl bg-white">
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <CreditCard className="w-8 h-8 mb-2 text-blue-500" />
          <div className="text-xl font-semibold mb-1 text-center">Last Payment</div>
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground my-4" />
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : lastPayment ? (
            <>
              <span className="text-4xl font-extrabold tracking-tight text-green-700">${Number(lastPayment.amount).toFixed(2)}</span>
              <span className="text-base text-muted-foreground mt-1">{new Date(lastPayment.created_at).toLocaleDateString()}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No payments</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 