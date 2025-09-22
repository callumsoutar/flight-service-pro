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
