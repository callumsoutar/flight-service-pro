'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CreditCard, Banknote, Calendar, Hash } from 'lucide-react';
import type { Payment } from '@/types/payments';

interface PaymentHistoryProps {
  invoiceId: string;
}

const methodIcon = (method: string) => {
  switch (method) {
    case 'credit_card':
      return <CreditCard className="w-4 h-4 text-blue-500" />;
    case 'bank_transfer':
      return <Banknote className="w-4 h-4 text-green-500" />;
    case 'cash':
      return <DollarSign className="w-4 h-4 text-yellow-500" />;
    default:
      return <Hash className="w-4 h-4 text-gray-400" />;
  }
};

export function PaymentHistory({ invoiceId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/payments?invoice_id=${invoiceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPayments(data);
        } else {
          setError(data.error || 'Failed to load payments');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load payments');
        setLoading(false);
      });
  }, [invoiceId]);

  return (
    <Card className="mt-10 p-6 border-t-4 border-blue-200 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold tracking-tight">Payment History</h2>
        <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-700 border-green-200">
          {payments.length} payment{payments.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Reference</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">Loading payments...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-destructive">{error}</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No payments recorded.</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    {new Date(p.created_at).toLocaleDateString()}<span className="ml-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-base font-semibold text-green-700">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 flex items-center gap-2 text-sm">
                    {methodIcon(p.payment_method)}
                    <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.payment_reference}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default PaymentHistory; 