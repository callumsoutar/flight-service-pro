import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";
import { Membership } from "@/types/memberships";
import { calculateDefaultMembershipExpiry } from '@/lib/membership-year-utils';
import { DEFAULT_MEMBERSHIP_YEAR_CONFIG } from '@/lib/membership-defaults';
import { MembershipYearConfig } from '@/types/settings';

const CreateMembershipSchema = z.object({
  user_id: z.string().uuid(),
  membership_type_id: z.string().uuid(),
  start_date: z.string().optional(),
  custom_expiry_date: z.string().optional(), // Override calculated expiry date
  auto_renew: z.boolean().default(false),
  notes: z.string().optional(),
  create_invoice: z.boolean().default(false),
});

const RenewMembershipSchema = z.object({
  membership_id: z.string().uuid(),
  membership_type_id: z.string().uuid().optional(),
  custom_expiry_date: z.string().optional(), // Override calculated expiry date
  auto_renew: z.boolean().optional(),
  notes: z.string().optional(),
  create_invoice: z.boolean().default(false),
});

// Helper function to calculate membership status
function calculateMembershipStatus(membership: Pick<Membership, 'expiry_date' | 'grace_period_days' | 'fee_paid'>) {
  const now = new Date();
  const expiryDate = new Date(membership.expiry_date);
  const gracePeriodEnd = new Date(expiryDate.getTime() + (membership.grace_period_days * 24 * 60 * 60 * 1000));
  
  if (!membership.fee_paid) {
    return "unpaid";
  }
  
  if (now <= expiryDate) {
    return "active";
  }
  
  if (now <= gracePeriodEnd) {
    return "grace";
  }
  
  return "expired";
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const summary = searchParams.get("summary") === "true";

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Fetch memberships with membership type details
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select(`
      *,
      membership_types!memberships_membership_type_id_fkey (
        id, name, code, description, price, duration_months, benefits
      )
    `)
    .eq("user_id", user_id)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching memberships:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (summary) {
    // Return summary with status calculation
    // Include unpaid memberships as current - they just need payment
    const current_membership = memberships?.find(m => {
      const status = calculateMembershipStatus(m);
      return status === "active" || status === "grace" || status === "unpaid";
    });

    const status = current_membership ? calculateMembershipStatus(current_membership) : "none";
    
    let days_until_expiry = null;
    let grace_period_remaining = null;
    
    if (current_membership) {
      const now = new Date();
      const expiryDate = new Date(current_membership.expiry_date);
      const gracePeriodEnd = new Date(expiryDate.getTime() + (current_membership.grace_period_days * 24 * 60 * 60 * 1000));
      
      if (status === "active") {
        days_until_expiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      } else if (status === "grace") {
        grace_period_remaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    const can_renew = current_membership && (status === "active" || status === "grace" || status === "unpaid");

    return NextResponse.json({
      summary: {
        current_membership,
        status,
        days_until_expiry,
        grace_period_remaining,
        can_renew,
        membership_history: memberships || []
      }
    });
  }

  return NextResponse.json({ memberships: memberships || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action; // 'create' or 'renew'

    if (action === "renew") {
      const validatedData = RenewMembershipSchema.parse(body);
      
      // Get the current membership
      const { data: currentMembership, error: fetchError } = await supabase
        .from("memberships")
        .select("*, membership_types!memberships_membership_type_id_fkey(*)")
        .eq("id", validatedData.membership_id)
        .single();

      if (fetchError || !currentMembership) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }

      // Get the new membership type (or use current one)
      const membershipTypeId = validatedData.membership_type_id || currentMembership.membership_type_id;
      const { data: membershipType, error: typeError } = await supabase
        .from("membership_types")
        .select("*")
        .eq("id", membershipTypeId)
        .single();

      if (typeError || !membershipType) {
        return NextResponse.json({ error: "Membership type not found" }, { status: 404 });
      }

      // Get membership year configuration from settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("setting_value")
        .eq("category", "memberships")
        .eq("setting_key", "membership_year")
        .single();

      const membershipYearConfig: MembershipYearConfig = settingsData?.setting_value as MembershipYearConfig || DEFAULT_MEMBERSHIP_YEAR_CONFIG;

      // Calculate new dates using membership year configuration or custom override
      const startDate = new Date();
      const expiryDate = validatedData.custom_expiry_date 
        ? new Date(validatedData.custom_expiry_date)
        : calculateDefaultMembershipExpiry(membershipYearConfig, startDate);

      // Create new membership record
      const newMembershipData = {
        user_id: currentMembership.user_id,
        membership_type_id: membershipTypeId,
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString().split('T')[0], // Date only
        purchased_date: startDate.toISOString(),
        renewal_of: currentMembership.id, // Link to previous membership
        auto_renew: validatedData.auto_renew ?? currentMembership.auto_renew,
        grace_period_days: currentMembership.grace_period_days,
        fee_paid: false, // New membership starts unpaid
        notes: validatedData.notes,
        updated_by: user.id,
      };

      const { data: newMembership, error: createError } = await supabase
        .from("memberships")
        .insert([newMembershipData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Deactivate old membership
      await supabase
        .from("memberships")
        .update({ is_active: false })
        .eq("id", currentMembership.id);

      // TODO: Create invoice if requested (will be implemented in future phase)
      if (validatedData.create_invoice && membershipType.price > 0) {
        // Invoice creation will be implemented here
        console.log('Invoice creation for renewal not yet implemented');
      }

      return NextResponse.json({ membership: newMembership }, { status: 201 });

    } else {
      // Create new membership
      const validatedData = CreateMembershipSchema.parse(body);

      // Get membership type
      const { data: membershipType, error: typeError } = await supabase
        .from("membership_types")
        .select("*")
        .eq("id", validatedData.membership_type_id)
        .single();

      if (typeError || !membershipType) {
        return NextResponse.json({ error: "Membership type not found" }, { status: 404 });
      }

      // Get membership year configuration from settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("setting_value")
        .eq("category", "memberships")
        .eq("setting_key", "membership_year")
        .single();

      const membershipYearConfig: MembershipYearConfig = settingsData?.setting_value as MembershipYearConfig || DEFAULT_MEMBERSHIP_YEAR_CONFIG;

      // Calculate dates using membership year configuration or custom override
      const startDate = validatedData.start_date ? new Date(validatedData.start_date) : new Date();
      const expiryDate = validatedData.custom_expiry_date
        ? new Date(validatedData.custom_expiry_date)
        : calculateDefaultMembershipExpiry(membershipYearConfig, startDate);

      const membershipData = {
        user_id: validatedData.user_id,
        membership_type_id: validatedData.membership_type_id,
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString().split('T')[0], // Date only
        purchased_date: new Date().toISOString(),
        auto_renew: validatedData.auto_renew,
        fee_paid: false, // Starts unpaid
        notes: validatedData.notes,
        updated_by: user.id,
      };

      const { data, error } = await supabase
        .from("memberships")
        .insert([membershipData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // TODO: Create invoice if requested (will be implemented in future phase)
      if (validatedData.create_invoice && membershipType.price > 0) {
        // Invoice creation will be implemented here
        console.log('Invoice creation for new membership not yet implemented');
      }

      return NextResponse.json({ membership: data }, { status: 201 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating/renewing membership:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 