import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { Payment } from '@/types/payments';

const querySchema = z.object({
  invoice_id: z.string().uuid(),
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