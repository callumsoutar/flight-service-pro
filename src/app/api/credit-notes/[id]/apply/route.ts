import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { CreditNoteService } from "@/lib/credit-note-service";

/**
 * POST /api/credit-notes/[id]/apply
 * Apply a credit note to user's account
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - only admin/owner can apply credit notes
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Only admins and owners can apply credit notes' 
    }, { status: 403 });
  }

  try {
    const result = await CreditNoteService.applyCreditNote(id);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      credit_note_id: result.credit_note_id,
      credit_note_number: result.credit_note_number,
      transaction_id: result.transaction_id,
      amount_credited: result.amount_credited,
      new_balance: result.new_balance,
      applied_date: result.applied_date,
      message: result.message
    });
  } catch (error) {
    console.error(`Failed to apply credit note ${id}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to apply credit note" 
    }, { status: 500 });
  }
}

