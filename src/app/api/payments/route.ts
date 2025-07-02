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
  organization_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parseResult = querySchema.safeParse({
    invoice_id: searchParams.get('invoice_id'),
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid or missing invoice_id' }, { status: 400 });
  }

  const { invoice_id } = parseResult.data;
  const supabase = await createClient();

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
  const body = await req.json();
  const parseResult = paymentSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 });
  }

  const { invoice_id, amount, payment_method, payment_reference, notes } = parseResult.data;
  const supabase = await createClient();

  // Call the process_payment function to create transaction and payment atomically
  const { data, error } = await supabase.rpc('process_payment', {
    p_invoice_id: invoice_id,
    p_amount: Number(amount),
    p_payment_method: payment_method,
    p_payment_reference: payment_reference || null,
    p_notes: notes || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // data is the new payment id
  return NextResponse.json({ id: data });
} 