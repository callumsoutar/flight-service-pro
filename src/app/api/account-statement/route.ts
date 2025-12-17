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
    // Fetch ALL transactions for this user (this is the source of truth)
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select(`
        id,
        created_at,
        type,
        amount,
        description,
        status,
        metadata
      `)
      .eq("user_id", user_id)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    // Fetch payments to get payment details (for reference numbers and methods)
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        transaction_id,
        payment_number,
        payment_reference,
        payment_method,
        notes,
        invoice_id,
        invoices!payments_invoice_id_fkey (
          invoice_number
        )
      `)
      .order("created_at", { ascending: true });

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    // Fetch invoices to get invoice details
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, invoice_number, reference")
      .eq("user_id", user_id)
      .is("deleted_at", null);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    // Fetch credit notes
    const { data: creditNotes, error: creditNotesError } = await supabase
      .from("credit_notes")
      .select("id, credit_note_number, reason")
      .eq("user_id", user_id)
      .eq("status", "applied")
      .is("deleted_at", null);

    if (creditNotesError) {
      console.error("Error fetching credit notes:", creditNotesError);
      return NextResponse.json({ error: "Failed to fetch credit notes" }, { status: 500 });
    }

    // Note: We calculate balance directly from transactions - this is the single source of truth
    // The account_balance column has been removed; all balances are calculated dynamically
    // This ensures closing_balance matches what's displayed in the transaction table

    // Create lookup maps
    const paymentMap = new Map(
      (payments || []).map(p => [p.transaction_id, p])
    );
    const invoiceMap = new Map(
      (invoices || []).map(i => [i.id, i])
    );
    const creditNoteMap = new Map(
      (creditNotes || []).map(cn => [cn.id, cn])
    );

    // Build statement entries from transactions
    const allEntries: Omit<AccountStatementEntry, 'balance'>[] = [];

    (transactions || []).forEach((transaction) => {
      let reference = '';
      let description = transaction.description || '';
      let entry_type: 'invoice' | 'payment' | 'credit_note' | 'opening_balance' = 'invoice';

      // Parse metadata to get related IDs
      const metadata = transaction.metadata as Record<string, unknown> | null;
      const invoiceId = metadata?.invoice_id as string | undefined;
      const creditNoteId = metadata?.credit_note_id as string | undefined;

      if (transaction.type === 'debit') {
        // This is an invoice transaction
        entry_type = 'invoice';
        const invoice = invoiceId ? invoiceMap.get(invoiceId) : null;
        reference = invoice?.invoice_number || 'Invoice';
        description = invoice?.reference || description || 'Invoice';
      } else if (transaction.type === 'credit') {
        // Check if this is a payment or credit note
        const payment = paymentMap.get(transaction.id);
        
        if (creditNoteId) {
          // Credit note transaction
          entry_type = 'credit_note';
          const creditNote = creditNoteMap.get(creditNoteId);
          reference = creditNote?.credit_note_number || 'Credit Note';
          description = creditNote?.reason || description || 'Credit Note';
        } else if (payment) {
          // Payment transaction
          entry_type = 'payment';
          reference = payment.payment_number || payment.payment_reference || 'Payment';
          
          // Build description
          if (payment.notes) {
            description = payment.notes;
          } else if (payment.invoice_id) {
            const invoice = invoiceMap.get(payment.invoice_id);
            const invoiceNum = invoice?.invoice_number || payment.invoice_id;
            description = `Payment for invoice ${invoiceNum}`;
          } else {
            description = `Credit payment via ${payment.payment_method}`;
          }
        } else {
          // Generic credit transaction
          entry_type = 'payment';
          reference = 'Credit';
          description = description || 'Account credit';
        }
      }

      // Add entry with correct sign convention:
      // - Debit (invoice) = positive amount (increases what user owes)
      // - Credit (payment/credit note) = negative amount (decreases what user owes)
      allEntries.push({
        date: transaction.created_at,
        reference,
        description,
        amount: transaction.type === 'debit' ? transaction.amount : -transaction.amount,
        entry_type,
        entry_id: transaction.id,
      });
    });

    // Sort by date (should already be sorted, but ensure it)
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance FORWARD from opening balance = 0
    // We assume opening balance is 0 before first transaction, or calculate it if needed
    let runningBalance = 0;
    
    // Cast to full AccountStatementEntry[] to add balance property
    const entriesWithBalance = allEntries as AccountStatementEntry[];
    
    // Calculate total changes from all transactions
    const totalChanges = allEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate opening balance: If we have transactions, opening balance is the 
    // negative of all changes before the first transaction (i.e., 0)
    // If there's historical data, we can calculate: opening = closing - total changes
    // For now, we'll start from 0 and calculate forward
    const openingBalance = 0;
    
    // Calculate forward from opening balance
    runningBalance = openingBalance;
    
    for (let i = 0; i < entriesWithBalance.length; i++) {
      const entry = entriesWithBalance[i];
      runningBalance = runningBalance + entry.amount;
      entry.balance = runningBalance;
    }
    
    // Closing balance is the final running balance (calculated from transactions)
    const closingBalance = runningBalance;

    // Add opening balance entry if there are transactions OR if opening balance is non-zero
    if (entriesWithBalance.length > 0 || openingBalance !== 0) {
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
      closing_balance: closingBalance, // Use calculated balance from transactions for consistency
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

