import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export interface AccountStatementEntry {
  date: string;
  reference: string;
  description: string;
  amount: number;
  balance: number;
  entry_type: 'invoice' | 'payment' | 'credit_note' | 'opening_balance';
  entry_id: string;
}

interface PaymentWithInvoice {
  invoices: { user_id: string; invoice_number?: string; id: string } | null;
  id: string;
  created_at: string;
  payment_number?: string;
  payment_reference?: string;
  payment_method: string;
  amount: number;
  notes?: string;
  invoice_id?: string | null;
}

// Type for the raw query result where invoices comes back as an array
interface PaymentQueryResult {
  id: string;
  created_at: string;
  payment_number?: string;
  payment_reference?: string;
  payment_method: string;
  amount: number;
  notes?: string;
  invoice_id?: string | null;
  invoices: { user_id: string; invoice_number?: string; id: string }[] | null;
}

interface CreditTransaction {
  created_at: string;
  amount: number;
  description?: string;
  payments?: Array<{
    id: string;
    invoice_id: string | null;
    payment_number?: string;
    payment_reference?: string;
    payment_method: string;
    notes?: string;
  }>;
}

interface Invoice {
  id: string;
  created_at: string;
  invoice_number: string;
  reference?: string;
  total_amount: number;
}

interface CreditNote {
  id: string;
  applied_date: string;
  credit_note_number: string;
  reason: string;
  total_amount: number;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - account statements require admin/owner/instructor role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner', 'instructor'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Account statement access requires instructor, admin, or owner role' 
    }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  try {
    // Fetch invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, created_at, invoice_number, reference, total_amount")
      .eq("user_id", user_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    // Fetch invoice-related payments
    const { data: invoicePayments, error: invoicePaymentsError } = await supabase
      .from("payments")
      .select(`
        id, 
        created_at, 
        payment_number, 
        payment_reference, 
        payment_method, 
        amount,
        notes,
        invoice_id,
        invoices!payments_invoice_id_fkey (
          id,
          invoice_number,
          user_id
        )
      `)
      .not("invoice_id", "is", null)
      .order("created_at", { ascending: true });

    if (invoicePaymentsError) {
      console.error("Error fetching invoice payments:", invoicePaymentsError);
      return NextResponse.json({ error: "Failed to fetch invoice payments" }, { status: 500 });
    }

    // Fetch standalone credit payments (via transactions)
    const { data: creditTransactions, error: creditTransactionsError } = await supabase
      .from("transactions")
      .select(`
        id,
        created_at,
        amount,
        description,
        metadata,
        payments!payments_transaction_id_fkey (
          id,
          payment_number,
          payment_reference,
          payment_method,
          notes,
          invoice_id
        )
      `)
      .eq("user_id", user_id)
      .eq("type", "credit")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (creditTransactionsError) {
      console.error("Error fetching credit transactions:", creditTransactionsError);
      return NextResponse.json({ error: "Failed to fetch credit transactions" }, { status: 500 });
    }

    // Filter invoice payments for this user and transform the invoices array to a single object
    const userInvoicePayments: PaymentWithInvoice[] = (invoicePayments || [])
      .filter((p: PaymentQueryResult) => {
        return p.invoices && p.invoices.length > 0 && p.invoices[0].user_id === user_id;
      })
      .map((p: PaymentQueryResult): PaymentWithInvoice => ({
        ...p,
        invoices: p.invoices && p.invoices.length > 0 ? p.invoices[0] : null
      }));

    // Extract standalone credit payments (payments without invoice_id)
    const standaloneCreditPayments = (creditTransactions || [])
      .filter((t: CreditTransaction) => {
        // Only include if it has a payment record and that payment has no invoice
        return t.payments && t.payments.length > 0 && t.payments[0].invoice_id === null;
      })
      .map((t: CreditTransaction) => ({
        id: t.payments![0].id,
        created_at: t.created_at,
        payment_number: t.payments![0].payment_number,
        payment_reference: t.payments![0].payment_reference,
        payment_method: t.payments![0].payment_method,
        amount: t.amount,
        notes: t.payments![0].notes || t.description,
        invoices: null,
      }));

    // Combine all payments
    const userPayments = [...userInvoicePayments, ...standaloneCreditPayments];

    // Fetch credit notes
    const { data: creditNotes, error: creditNotesError } = await supabase
      .from("credit_notes")
      .select("id, applied_date, credit_note_number, reason, total_amount, status")
      .eq("user_id", user_id)
      .eq("status", "applied")
      .is("deleted_at", null)
      .order("applied_date", { ascending: true });

    if (creditNotesError) {
      console.error("Error fetching credit notes:", creditNotesError);
      return NextResponse.json({ error: "Failed to fetch credit notes" }, { status: 500 });
    }

    // Fetch user's current account balance
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("account_balance")
      .eq("id", user_id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    const currentBalance = userData?.account_balance || 0;

    // Combine all entries into a unified array
    const allEntries: Omit<AccountStatementEntry, 'balance'>[] = [];

    // Add invoices (positive amounts = user owes)
    (invoices || []).forEach((invoice: Invoice) => {
      allEntries.push({
        date: invoice.created_at,
        reference: invoice.invoice_number,
        description: invoice.reference || 'Invoice',
        amount: invoice.total_amount,
        entry_type: 'invoice',
        entry_id: invoice.id,
      });
    });

    // Add payments (negative amounts = user pays/receives credit)
    userPayments.forEach((payment: PaymentWithInvoice) => {
      const invoiceRef = payment.invoices?.invoice_number || '';
      let paymentDesc = payment.notes || '';
      
      // If no notes, generate a description
      if (!paymentDesc) {
        if (invoiceRef) {
          paymentDesc = `Payment of invoice ${invoiceRef}`;
        } else {
          // Standalone credit payment
          paymentDesc = `Credit payment via ${payment.payment_method}`;
        }
      }
      
      allEntries.push({
        date: payment.created_at,
        reference: payment.payment_number || payment.payment_reference || 'Payment',
        description: paymentDesc,
        amount: -payment.amount, // Negative because it reduces balance (credits account)
        entry_type: 'payment',
        entry_id: payment.id,
      });
    });

    // Add credit notes (negative amounts = user gets credit)
    (creditNotes || []).forEach((cn: CreditNote) => {
      allEntries.push({
        date: cn.applied_date,
        reference: cn.credit_note_number,
        description: cn.reason || 'Credit Note',
        amount: -cn.total_amount, // Negative because it reduces balance
        entry_type: 'credit_note',
        entry_id: cn.id,
      });
    });

    // Sort by date
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    // Start from current balance and work backwards
    let runningBalance = currentBalance;
    
    // Cast to full AccountStatementEntry[] to add balance property
    const entriesWithBalance = allEntries as AccountStatementEntry[];
    
    // Work backwards from the end to calculate opening balance
    for (let i = entriesWithBalance.length - 1; i >= 0; i--) {
      const entry = entriesWithBalance[i];
      entry.balance = runningBalance;
      runningBalance = runningBalance - entry.amount;
    }

    const openingBalance = runningBalance;

    // Add opening balance entry if there are transactions
    if (entriesWithBalance.length > 0 && openingBalance !== 0) {
      const firstDate = entriesWithBalance[0]?.date || new Date().toISOString();
      const openingDate = new Date(firstDate);
      openingDate.setDate(openingDate.getDate() - 1); // One day before first transaction
      
      entriesWithBalance.unshift({
        date: openingDate.toISOString(),
        reference: '',
        description: 'Opening Balance',
        amount: 0,
        balance: openingBalance,
        entry_type: 'opening_balance',
        entry_id: 'opening',
      });
    }

    return NextResponse.json({ 
      statement: entriesWithBalance,
      opening_balance: openingBalance,
      closing_balance: currentBalance,
      user_id: user_id,
    });

  } catch (error) {
    console.error("Error generating account statement:", error);
    return NextResponse.json({ 
      error: "Failed to generate account statement",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

