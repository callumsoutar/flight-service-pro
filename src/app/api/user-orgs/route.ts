import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ orgs: [] }, { status: 401 });
  }

  const { data: orgs, error } = await supabase
    .from('user_organizations')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ orgs: [] }, { status: 500 });
  }

  interface UserOrgRow {
    organization_id: string;
    organizations?: { name?: string } | { name?: string }[] | null;
  }

  const mappedOrgs = (orgs || []).map((org: UserOrgRow) => {
    let orgName: string | undefined;
    if (Array.isArray(org.organizations)) {
      orgName = org.organizations[0]?.name;
    } else {
      orgName = org.organizations?.name;
    }
    return {
      organization_id: org.organization_id,
      name: orgName || org.organization_id,
    };
  });

  return NextResponse.json({ orgs: mappedOrgs });
} 