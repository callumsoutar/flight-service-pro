import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { CreditNoteService } from "@/lib/credit-note-service";

/**
 * GET /api/credit-notes/[id]
 * Get a single credit note with items
 */
export async function GET(
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

  // Role authorization
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner', 'instructor'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Credit note access requires instructor, admin, or owner role' 
    }, { status: 403 });
  }

  try {
    const result = await CreditNoteService.getCreditNoteWithItems(id);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 404 });
    }

    return NextResponse.json({ credit_note: result.credit_note });
  } catch (error) {
    console.error(`Failed to fetch credit note ${id}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch credit note" 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/credit-notes/[id]
 * Update a draft credit note
 */
export async function PATCH(
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

  // Role authorization - only admin/owner can update credit notes
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Only admins and owners can update credit notes' 
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Only allow updating reason and notes for draft credit notes
    const updates: { reason?: string; notes?: string } = {};
    
    if (body.reason !== undefined) {
      updates.reason = body.reason;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: "No updatable fields provided" 
      }, { status: 400 });
    }

    const result = await CreditNoteService.updateDraftCreditNote(id, updates);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      credit_note: result.credit_note 
    });
  } catch (error) {
    console.error(`Failed to update credit note ${id}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update credit note" 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/credit-notes/[id]
 * Soft delete a draft credit note
 */
export async function DELETE(
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

  // Role authorization - only admin/owner can delete credit notes
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Only admins and owners can delete credit notes' 
    }, { status: 403 });
  }

  try {
    const result = await CreditNoteService.softDeleteCreditNote(
      id,
      'Admin/Owner initiated deletion'
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      credit_note_number: result.credit_note_number,
      items_deleted: result.items_deleted
    });
  } catch (error) {
    console.error(`Failed to delete credit note ${id}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete credit note" 
    }, { status: 500 });
  }
}

