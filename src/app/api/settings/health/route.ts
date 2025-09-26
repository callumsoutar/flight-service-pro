import { NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test database connection by checking settings table
    const { error } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 });
    }

    // Check if we have default settings
    const { data: settingsCount } = await supabase
      .from('settings')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      status: 'healthy',
      message: 'Settings system is operational',
      totalSettings: settingsCount?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Settings health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
