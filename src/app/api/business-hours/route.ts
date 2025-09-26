import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

// GET - Fetch business hours
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching business hours:', error);
      return NextResponse.json(
        { error: 'Failed to fetch business hours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ business_hours: data });
  } catch (error) {
    console.error('Error in GET /api/business-hours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update business hours
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { open_time, close_time, is_24_hours, is_closed } = body;

    // Validation
    if (is_closed === undefined || is_24_hours === undefined) {
      return NextResponse.json(
        { error: 'is_closed and is_24_hours fields are required' },
        { status: 400 }
      );
    }

    if (!is_closed && !is_24_hours && (!open_time || !close_time)) {
      return NextResponse.json(
        { error: 'open_time and close_time are required when not closed or 24 hours' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      is_closed: boolean;
      is_24_hours: boolean;
      open_time?: string;
      close_time?: string;
    } = {
      is_closed: Boolean(is_closed),
      is_24_hours: Boolean(is_24_hours),
    };

    if (!is_closed) {
      if (is_24_hours) {
        updateData.open_time = '00:00:00';
        updateData.close_time = '23:59:59';
      } else {
        // Ensure time format is HH:MM:SS
        updateData.open_time = open_time.length === 5 ? `${open_time}:00` : open_time;
        updateData.close_time = close_time.length === 5 ? `${close_time}:00` : close_time;
      }
    } else {
      // If closed, set default times (won't be used but required by schema)
      updateData.open_time = '09:00:00';
      updateData.close_time = '17:00:00';
    }

    // Get the existing record or use a default ID
    let recordId;
    const { data: existingRecord } = await supabase
      .from('business_hours')
      .select('id')
      .single();
    
    if (existingRecord) {
      recordId = existingRecord.id;
    }

    let result;
    if (recordId) {
      // Update existing record
      const { data, error } = await supabase
        .from('business_hours')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating business hours:', error);
        return NextResponse.json(
          { error: 'Failed to update business hours' },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('business_hours')
        .insert(updateData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating business hours:', error);
        return NextResponse.json(
          { error: 'Failed to create business hours' },
          { status: 500 }
        );
      }
      result = data;
    }

    return NextResponse.json({ business_hours: result });
  } catch (error) {
    console.error('Error in PUT /api/business-hours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}