import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const creditPaymentSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.string().or(z.number()),
  payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online_payment', 'other']),
  payment_reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/payments/credit
 * Process a standalone credit payment (without invoice)
 * Creates transaction and payment records atomically
 * Admin/Owner role required
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - credit payment creation requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Credit payment creation requires admin or owner role' 
    }, { status: 403 });
  }
  
  // Parse request body
  const body = await req.json();
  const parseResult = creditPaymentSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ 
      error: 'Invalid credit payment data',
      details: parseResult.error.errors
    }, { status: 400 });
  }

  const { user_id, amount, payment_method, payment_reference, notes } = parseResult.data;

  try {
    // Use atomic database function for credit payment processing
    const { data: result, error } = await supabase.rpc('process_credit_payment_atomic', {
      p_user_id: user_id,
      p_amount: Number(amount),
      p_payment_method: payment_method,
      p_payment_reference: payment_reference || null,
      p_notes: notes || null
    });
    
    if (error) {
      console.error('Credit payment processing error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!result.success) {
      console.error('Credit payment processing failed:', result.error);
      return NextResponse.json({ 
        error: result.error,
        details: result
      }, { status: 400 });
    }
    
    console.log(`Credit payment ${result.payment_number} processed atomically: ${result.payment_id} for user ${result.user_name}`);
    console.log(`Transaction ID: ${result.transaction_id}, Amount: $${result.amount}`);
    
    return NextResponse.json({ 
      id: result.payment_id,
      payment_number: result.payment_number,
      transaction_id: result.transaction_id,
      user_id: result.user_id,
      user_name: result.user_name,
      amount: result.amount,
      payment_method: result.payment_method,
      message: result.message
    });
  } catch (error) {
    console.error('Credit payment creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process credit payment' 
    }, { status: 500 });
  }
}

