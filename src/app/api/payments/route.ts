import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { Payment } from '@/types/payments';

const querySchema = z.object({
  invoice_id: z.string().uuid(),
});

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.string().or(z.number()),
  payment_method: z.string(),
  payment_reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - payments access requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Payments access requires admin or owner role' 
    }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const parseResult = querySchema.safeParse({
    invoice_id: searchParams.get('invoice_id'),
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid or missing invoice_id' }, { status: 400 });
  }

  const { invoice_id } = parseResult.data;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoice_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Payment[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - payment creation requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Payment creation requires admin or owner role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const parseResult = paymentSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 });
  }

  const { invoice_id, amount, payment_method, payment_reference, notes } = parseResult.data;

  try {
    // Use atomic database function for payment processing
    const { data: result, error } = await supabase.rpc('process_payment_atomic', {
      p_invoice_id: invoice_id,
      p_amount: Number(amount),
      p_payment_method: payment_method,
      p_payment_reference: payment_reference || null,
      p_notes: notes || null
    });
    
    if (error) {
      console.error('Payment processing error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!result.success) {
      console.error('Payment processing failed:', result.error);
      return NextResponse.json({ 
        error: result.error,
        details: result
      }, { status: 400 });
    }
    
    console.log(`Payment processed atomically: ${result.payment_id} for invoice ${result.invoice_id}`);
    console.log(`Invoice status: ${result.new_status}, Remaining balance: ${result.remaining_balance}`);
    
    return NextResponse.json({ 
      id: result.payment_id,
      transaction_id: result.transaction_id,
      invoice_id: result.invoice_id,
      new_status: result.new_status,
      remaining_balance: result.remaining_balance,
      message: result.message
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process payment' 
    }, { status: 500 });
  }
} 