import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const reversePaymentSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  correct_amount: z.number().optional(), // Optional: if provided, creates correcting payment
  notes: z.string().optional(),
});

/**
 * POST /api/payments/[id]/reverse
 * Reverses a payment (with optional correction)
 * 
 * - If only 'reason' is provided: Reverses the payment only
 * - If 'correct_amount' is provided: Reverses and creates correcting payment in one atomic operation
 * 
 * Admin/Owner role required
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - payment reversal requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Payment reversal requires admin or owner role' 
    }, { status: 403 });
  }
  
  // Parse request body
  const body = await req.json();
  const parseResult = reversePaymentSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ 
      error: 'Invalid request data',
      details: parseResult.error.errors
    }, { status: 400 });
  }

  const { reason, correct_amount, notes } = parseResult.data;
  const { id: paymentId } = await params;

  try {
    // Validate payment exists before reversal
    const { data: payment, error: paymentFetchError } = await supabase
      .from('payments')
      .select('id, amount, payment_method, invoice_id, metadata')
      .eq('id', paymentId)
      .single();
      
    if (paymentFetchError || !payment) {
      return NextResponse.json({ 
        error: 'Payment not found' 
      }, { status: 404 });
    }
    
    // Check if already reversed
    if (payment.metadata?.reversed_by_payment_id) {
      return NextResponse.json({ 
        error: 'Payment has already been reversed',
        reversal_payment_id: payment.metadata.reversed_by_payment_id
      }, { status: 400 });
    }
    
    let result;
    
    // Decide which function to call based on whether correct_amount is provided
    if (correct_amount !== undefined && correct_amount !== null) {
      // Reverse and replace in one atomic operation
      const { data, error } = await supabase.rpc('reverse_and_replace_payment_atomic', {
        p_original_payment_id: paymentId,
        p_correct_amount: correct_amount,
        p_reason: reason,
        p_admin_user_id: user.id,
        p_notes: notes || null
      });
      
      if (error) {
        console.error('Payment reversal and correction error:', error);
        return NextResponse.json({ 
          error: error.message 
        }, { status: 500 });
      }
      
      result = data;
    } else {
      // Only reverse the payment
      const { data, error } = await supabase.rpc('reverse_payment_atomic', {
        p_payment_id: paymentId,
        p_reason: reason,
        p_admin_user_id: user.id
      });
      
      if (error) {
        console.error('Payment reversal error:', error);
        return NextResponse.json({ 
          error: error.message 
        }, { status: 500 });
      }
      
      result = data;
    }
    
    // Check if operation was successful
    if (!result.success) {
      console.error('Payment reversal failed:', result.error);
      return NextResponse.json({ 
        error: result.error,
        details: result
      }, { status: 400 });
    }
    
    console.log(`Payment ${paymentId} reversed successfully by user ${user.id}`);
    console.log(`Reversal details:`, result);
    
    return NextResponse.json({
      success: true,
      ...result,
      reversed_by: user.email
    });
  } catch (error) {
    console.error('Payment reversal error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to reverse payment' 
    }, { status: 500 });
  }
}

