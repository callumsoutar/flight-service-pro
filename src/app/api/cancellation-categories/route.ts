import { NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cancellation categories
    const { data: categories, error } = await supabase
      .from('cancellation_categories')
      .select('*')
      .is('voided_at', null)
      .order('name');

    if (error) {
      console.error('Error fetching cancellation categories:', error);
      return NextResponse.json({ error: 'Failed to fetch cancellation categories' }, { status: 500 });
    }

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error in cancellation categories route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Insert new cancellation category
    const { data, error } = await supabase
      .from('cancellation_categories')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cancellation category:', error);
      return NextResponse.json({ error: 'Failed to create cancellation category' }, { status: 500 });
    }

    return NextResponse.json({ category: data });

  } catch (error) {
    console.error('Error in cancellation categories POST route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Update cancellation category
    const { data, error } = await supabase
      .from('cancellation_categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cancellation category:', error);
      return NextResponse.json({ error: 'Failed to update cancellation category' }, { status: 500 });
    }

    return NextResponse.json({ category: data });

  } catch (error) {
    console.error('Error in cancellation categories PUT route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if the record exists and is not already voided
    const { data: existingRecord, error: fetchError } = await supabase
      .from('cancellation_categories')
      .select('voided_at')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Cancellation category not found' }, { status: 404 });
    }

    if (existingRecord.voided_at) {
      return NextResponse.json({ error: 'Cancellation category is already voided' }, { status: 400 });
    }

    // Soft delete by setting voided_at timestamp
    const { data, error } = await supabase
      .from('cancellation_categories')
      .update({
        voided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error voiding cancellation category:', error);
      return NextResponse.json({ error: 'Failed to void cancellation category' }, { status: 500 });
    }

    return NextResponse.json({ category: data });

  } catch (error) {
    console.error('Error in cancellation categories DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
