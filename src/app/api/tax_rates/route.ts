import { NextRequest, NextResponse } from "next/server";
import { createClient } from '../../../lib/SupabaseServerClient';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const country_code = searchParams.get('country_code');
  const region_code = searchParams.get('region_code');
  const is_default = searchParams.get('is_default');

  let query = supabase.from('tax_rates').select('*').eq('is_active', true);
  
  if (id) {
    query = query.eq('id', id);
  }
  if (country_code) {
    query = query.eq('country_code', country_code);
  }
  if (region_code) {
    query = query.eq('region_code', region_code);
  }
  if (is_default) {
    query = query.eq('is_default', is_default === 'true');
  }
  
  query = query.order('country_code', { ascending: true })
               .order('region_code', { ascending: true })
               .order('effective_from', { ascending: false });

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ tax_rates: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tax_rates: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { country_code, region_code, tax_name, rate, is_default, effective_from } = body;
  
  if (!country_code || !tax_name || rate === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Validate rate is between 0 and 1
  if (rate < 0 || rate > 1) {
    return NextResponse.json({ error: 'Tax rate must be between 0 and 1' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('tax_rates')
    .insert([{
      country_code: country_code.toUpperCase(),
      region_code: region_code ? region_code.toUpperCase() : null,
      tax_name,
      rate,
      is_default: is_default || false,
      effective_from: effective_from || new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tax_rate: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, ...updateFields } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'Missing tax rate id' }, { status: 400 });
  }
  
  // Only allow updating certain fields
  const allowedFields = ['country_code', 'region_code', 'tax_name', 'rate', 'is_default', 'effective_from'];
  const updateData: Record<string, string | number | boolean | null> = {};
  
  for (const key of allowedFields) {
    if (updateFields[key] !== undefined) {
      if (key === 'country_code' || key === 'region_code') {
        updateData[key] = updateFields[key]?.toUpperCase();
      } else {
        updateData[key] = updateFields[key];
      }
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('tax_rates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tax_rate: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'Missing tax rate id' }, { status: 400 });
  }
  
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('tax_rates')
    .update({ is_active: false })
    .eq('id', id);
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
} 