import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { CreditNoteService } from "@/lib/credit-note-service";
import type { CreateCreditNoteParams } from "@/types/credit_notes";

/**
 * GET /api/credit-notes
 * List credit notes with optional filtering
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - credit note access requires instructor, admin, or owner role
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
  
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");
  const invoiceId = searchParams.get("invoice_id");
  const userId = searchParams.get("user_id");
  const status = searchParams.get("status");

  try {
    let query = supabase
      .from("credit_notes")
      .select(`
        *,
        users:user_id(id, first_name, last_name, email),
        invoices:original_invoice_id(invoice_number, status),
        created_by_user:created_by(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }

    if (invoiceId) {
      query = query.eq("original_invoice_id", invoiceId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Credit notes fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch credit notes" }, { status: 500 });
    }
    
    return NextResponse.json({ credit_notes: data ?? [] });
  } catch (error) {
    console.error('Credit notes fetch error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch credit notes" 
    }, { status: 500 });
  }
}

/**
 * POST /api/credit-notes
 * Create a new credit note
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - only admin/owner can create credit notes
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Only admins and owners can create credit notes' 
    }, { status: 403 });
  }

  try {
    const body = await req.json() as CreateCreditNoteParams;
    
    // Validate required fields
    if (!body.original_invoice_id) {
      return NextResponse.json({ 
        error: "Missing required field: original_invoice_id" 
      }, { status: 400 });
    }

    if (!body.user_id) {
      return NextResponse.json({ 
        error: "Missing required field: user_id" 
      }, { status: 400 });
    }

    if (!body.reason || body.reason.trim() === '') {
      return NextResponse.json({ 
        error: "Missing required field: reason" 
      }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ 
        error: "Credit note must have at least one item" 
      }, { status: 400 });
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.description || item.description.trim() === '') {
        return NextResponse.json({ 
          error: "Each item must have a description" 
        }, { status: 400 });
      }

      if (item.quantity <= 0) {
        return NextResponse.json({ 
          error: "Item quantity must be greater than zero" 
        }, { status: 400 });
      }

      if (item.tax_rate < 0 || item.tax_rate > 1) {
        return NextResponse.json({ 
          error: "Item tax rate must be between 0 and 1" 
        }, { status: 400 });
      }
    }

    // Create credit note using service
    const result = await CreditNoteService.createCreditNote(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      credit_note: result.credit_note 
    }, { status: 201 });

  } catch (error) {
    console.error('Create credit note error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create credit note" 
    }, { status: 500 });
  }
}

