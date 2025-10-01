# Membership System Refactor Plan

## Executive Summary

After reviewing the membership system architecture, database schema, types, API routes, and components, this document outlines necessary changes to align with your requirements:

1. **Remove `membership_renewals` table** - It's redundant; the `memberships` table already tracks renewals via `renewal_of` field
2. **Integrate membership year configuration** - Use the settings-based membership year for calculating expiry dates
3. **Simplify renewal logic** - Create new membership records without separate renewal tracking
4. **Prepare for invoice integration** - Structure for future membership invoice creation using membership type codes

---

## Current State Analysis

### Database Schema (Supabase)

**`memberships` table** (Current):
- ✅ Has `id`, `user_id`, `membership_type_id` (FK to membership_types)
- ✅ Has `start_date`, `end_date`, `expiry_date`, `purchased_date`
- ✅ Has `fee_paid`, `amount_paid`, `invoice_id`
- ✅ Has `renewal_of` (self-referencing FK) - **Already supports renewal tracking!**
- ✅ Has `auto_renew`, `grace_period_days`, `is_active`
- ✅ Has `notes`, `updated_by`, `created_at`, `updated_at`

**`membership_renewals` table** (Current):
- ❌ **REDUNDANT** - Duplicates information already in `memberships.renewal_of`
- Contains: `old_membership_id`, `new_membership_id`, `renewed_by`, `renewal_date`, `notes`
- This table should be **removed** as it's unnecessary

**`membership_types` table** (Current):
- ✅ Has `id`, `name`, `code`, `description`
- ✅ Has `price`, `duration_months`
- ✅ Has `benefits` (jsonb), `is_active`
- ✅ Has `created_at`, `updated_at`

### Settings System

**Membership Year Configuration** (via Settings):
- ✅ Already implemented in `MembershipYearConfig.tsx`
- ✅ Stored in settings table under category "memberships", key "membership_year"
- ✅ Has utility functions in `membership-year-utils.ts`
- ✅ Has defaults in `membership-defaults.ts`
- ❌ **NOT YET INTEGRATED** with membership creation/renewal logic

**Current Structure:**
```typescript
interface MembershipYearConfig {
  start_month: number;  // 1-12
  start_day: number;    // 1-31
  end_month: number;    // 1-12
  end_day: number;      // 1-31
  description: string;
}
```

### API Routes

**`/api/memberships` POST endpoint** (Current issues):
1. **Renewal logic** creates entry in `membership_renewals` table (lines 186-194) - **REMOVE THIS**
2. **Date calculation** uses `duration_months` from membership type (lines 158-160) - **NEEDS UPDATE to use membership year**
3. **No invoice creation** - Currently just a flag, but no actual invoice creation logic

**`/api/memberships` GET endpoint**:
- ✅ Works well for fetching membership history
- ✅ Calculates status correctly

### Frontend Components

**Issues identified:**
1. `RenewMembershipModal.tsx` - Uses `addMonths()` for expiry calculation (line 78) - **Should use membership year config**
2. `CreateMembershipModal.tsx` - Uses `addMonths()` for expiry calculation (line 76) - **Should use membership year config**
3. Both modals have `create_invoice` toggle but no actual invoice creation

---

## Problems to Solve

### 1. Redundant Database Table
**Problem:** The `membership_renewals` table duplicates information already stored in `memberships.renewal_of`

**Impact:** 
- Extra database complexity
- Potential data inconsistency
- Unnecessary maintenance overhead

### 2. Incorrect Expiry Date Calculation
**Problem:** Current system uses `duration_months` from membership type instead of the configured membership year

**Your Requirement:**
- Today is October 1, 2025 in NZ
- If membership year ends on April 1
- Renewal should set:
  - `start_date`: October 1, 2025 (today)
  - `expiry_date`: April 1, 2026 (end of membership year in following calendar year)

**Current Behavior:**
- Uses `addMonths(new Date(), duration_months)` 
- If duration is 12 months → expiry would be October 1, 2026 ❌ **WRONG**

### 3. No Invoice Creation Logic
**Problem:** Modals have `create_invoice` toggle but no implementation

**Future Requirement:** 
- Create invoice using membership type code
- Link invoice to membership record

---

## Proposed Solution

### Phase 1: Database Schema Cleanup

#### 1.1 Remove `membership_renewals` table

**Rationale:** The `memberships` table already has:
- `renewal_of` column that links to the previous membership
- `updated_by` column that tracks who made the change
- `created_at` column that serves as the renewal date
- `notes` column for any renewal-specific notes

**Migration Steps:**
```sql
-- 1. Verify no critical data will be lost
-- Check if membership_renewals has any data not in memberships
SELECT mr.* 
FROM membership_renewals mr
LEFT JOIN memberships m ON m.id = mr.new_membership_id
WHERE m.renewal_of IS NULL OR m.renewal_of != mr.old_membership_id;

-- 2. Drop foreign key constraints
ALTER TABLE membership_renewals 
DROP CONSTRAINT IF EXISTS membership_renewals_old_membership_id_fkey;

ALTER TABLE membership_renewals 
DROP CONSTRAINT IF EXISTS membership_renewals_new_membership_id_fkey;

ALTER TABLE membership_renewals 
DROP CONSTRAINT IF EXISTS membership_renewals_renewed_by_fkey;

-- 3. Drop the table
DROP TABLE IF EXISTS membership_renewals;
```

#### 1.2 Verify `memberships` table schema

The current schema already supports everything we need:
```sql
-- No changes needed to memberships table!
-- It already has:
-- - renewal_of (tracks which membership this renews)
-- - updated_by (tracks who created/renewed)
-- - notes (renewal notes)
-- - All other fields for complete audit trail
```

### Phase 2: Update Types & Interfaces

#### 2.1 Remove `MembershipRenewal` interface

**File:** `src/types/memberships.ts`

```typescript
// REMOVE this interface (lines 40-47):
export interface MembershipRenewal {
  id: string;
  old_membership_id: string;
  new_membership_id: string;
  renewed_by: string;
  renewal_date: string;
  notes?: string;
}
```

#### 2.2 Update Request Interfaces

**File:** `src/types/memberships.ts`

```typescript
// Update CreateMembershipRequest to include membership year logic
export interface CreateMembershipRequest {
  user_id: string;
  membership_type_id: string;
  start_date?: string; // Defaults to today
  use_membership_year?: boolean; // NEW: Use configured membership year for expiry
  custom_expiry_date?: string; // NEW: Override for custom expiry
  auto_renew?: boolean;
  notes?: string;
  create_invoice?: boolean; // NEW: Flag to create invoice
}

// Update RenewMembershipRequest similarly
export interface RenewMembershipRequest {
  membership_id: string;
  membership_type_id?: string; // Can change type during renewal
  auto_renew?: boolean;
  notes?: string;
  create_invoice?: boolean; // NEW: Flag to create invoice
}
```

### Phase 3: Update API Routes

#### 3.1 Update `/api/memberships` POST endpoint

**File:** `src/app/api/memberships/route.ts`

**Changes needed:**

1. **Import membership year utilities:**
```typescript
import { calculateDefaultMembershipExpiry } from '@/lib/membership-year-utils';
import { DEFAULT_MEMBERSHIP_YEAR_CONFIG } from '@/lib/membership-defaults';
```

2. **Update renewal logic (lines 131-202):**
```typescript
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

  const membershipYearConfig = settingsData?.setting_value || DEFAULT_MEMBERSHIP_YEAR_CONFIG;

  // Calculate new dates using membership year
  const startDate = new Date(); // Today
  const expiryDate = calculateDefaultMembershipExpiry(membershipYearConfig, startDate);

  // Create new membership record
  const newMembershipData = {
    user_id: currentMembership.user_id,
    membership_type_id: membershipTypeId,
    start_date: startDate.toISOString(),
    expiry_date: expiryDate.toISOString().split('T')[0], // Date only
    purchased_date: startDate.toISOString(),
    renewal_of: currentMembership.id, // Link to old membership
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

  // REMOVE: No longer create renewal record
  // await supabase.from("membership_renewals").insert([...]);

  // Deactivate old membership
  await supabase
    .from("memberships")
    .update({ is_active: false })
    .eq("id", currentMembership.id);

  // TODO: Create invoice if requested (Phase 4)
  if (body.create_invoice) {
    // Will be implemented in Phase 4
  }

  return NextResponse.json({ membership: newMembership }, { status: 201 });
}
```

3. **Update create logic (lines 204-246):**
```typescript
else {
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

  const membershipYearConfig = settingsData?.setting_value || DEFAULT_MEMBERSHIP_YEAR_CONFIG;

  // Calculate dates using membership year
  const startDate = validatedData.start_date ? new Date(validatedData.start_date) : new Date();
  const expiryDate = calculateDefaultMembershipExpiry(membershipYearConfig, startDate);

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

  // TODO: Create invoice if requested (Phase 4)
  if (body.create_invoice) {
    // Will be implemented in Phase 4
  }

  return NextResponse.json({ membership: data }, { status: 201 });
}
```

#### 3.2 Update Validation Schemas

**File:** `src/app/api/memberships/route.ts`

```typescript
const CreateMembershipSchema = z.object({
  user_id: z.string().uuid(),
  membership_type_id: z.string().uuid(),
  start_date: z.string().optional(),
  auto_renew: z.boolean().default(false),
  notes: z.string().optional(),
  create_invoice: z.boolean().default(false), // NEW
});

const RenewMembershipSchema = z.object({
  membership_id: z.string().uuid(),
  membership_type_id: z.string().uuid().optional(),
  auto_renew: z.boolean().optional(),
  notes: z.string().optional(),
  create_invoice: z.boolean().default(false), // NEW
});
```

### Phase 4: Invoice Creation Integration (Future)

This will be implemented later, but here's the structure:

#### 4.1 Create Invoice Service Function

**File:** `src/lib/membership-invoice-service.ts` (NEW)

```typescript
import { createClient } from '@/lib/SupabaseServerClient';
import { Membership, MembershipType } from '@/types/memberships';

export async function createMembershipInvoice(
  membership: Membership,
  membershipType: MembershipType,
  userId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Get tax rate
  const { data: taxRateData } = await supabase
    .from("tax_rates")
    .select("rate")
    .eq("is_default", true)
    .eq("is_active", true)
    .single();

  const taxRate = taxRateData?.rate || 0;
  const isChargeableTaxable = true; // Memberships are typically taxable

  // Calculate amounts
  const subtotal = membershipType.price;
  const taxAmount = isChargeableTaxable ? subtotal * taxRate : 0;
  const total = subtotal + taxAmount;

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      status: "pending",
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_total: taxAmount,
      total_amount: total,
      balance_due: total,
      total_paid: 0,
      reference: `MEMBERSHIP-${membership.id.substring(0, 8)}`,
      notes: `Membership fee for ${membershipType.name}`,
    })
    .select()
    .single();

  if (invoiceError) {
    console.error("Error creating membership invoice:", invoiceError);
    return null;
  }

  // Create invoice item using chargeable
  // First, find or create chargeable for this membership type
  const { data: chargeable, error: chargeableError } = await supabase
    .from("chargeables")
    .select("id")
    .eq("type", "membership_fee")
    .eq("name", membershipType.code) // Use membership type code as identifier
    .single();

  let chargeableId = chargeable?.id;

  if (!chargeable) {
    // Create chargeable for this membership type
    const { data: newChargeable } = await supabase
      .from("chargeables")
      .insert({
        name: membershipType.code,
        type: "membership_fee",
        description: `${membershipType.name} Membership`,
        rate: membershipType.price,
        is_active: true,
        is_taxable: isChargeableTaxable,
      })
      .select()
      .single();

    chargeableId = newChargeable?.id;
  }

  // Create invoice item
  await supabase
    .from("invoice_items")
    .insert({
      invoice_id: invoice.id,
      chargeable_id: chargeableId,
      description: `${membershipType.name} Membership`,
      quantity: 1,
      unit_price: membershipType.price,
      amount: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      line_total: total,
    });

  // Link invoice to membership
  await supabase
    .from("memberships")
    .update({ invoice_id: invoice.id })
    .eq("id", membership.id);

  return invoice.id;
}
```

#### 4.2 Integrate with API Routes

In `src/app/api/memberships/route.ts`, replace the TODO comments:

```typescript
// After creating membership
if (body.create_invoice && membershipType.price > 0) {
  await createMembershipInvoice(newMembership, membershipType, user.id);
}
```

### Phase 5: Frontend Updates

#### 5.1 Update Modals to Use Membership Year

**Files:** 
- `src/components/members/CreateMembershipModal.tsx`
- `src/components/members/RenewMembershipModal.tsx`

**Changes:**

1. **Add membership year config fetch:**
```typescript
const [membershipYearConfig, setMembershipYearConfig] = useState<MembershipYearConfig | null>(null);

useEffect(() => {
  async function fetchMembershipYearConfig() {
    const response = await fetch('/api/settings/memberships/membership_year');
    const data = await response.json();
    setMembershipYearConfig(data.value || DEFAULT_MEMBERSHIP_YEAR_CONFIG);
  }
  fetchMembershipYearConfig();
}, []);
```

2. **Update expiry date calculation:**
```typescript
// REPLACE (line 75-76 in CreateMembershipModal):
const expiryDate = selectedType 
  ? addMonths(new Date(), selectedType.duration_months)
  : null;

// WITH:
const expiryDate = selectedType && membershipYearConfig
  ? calculateDefaultMembershipExpiry(membershipYearConfig, new Date())
  : null;
```

3. **Update imports:**
```typescript
import { calculateDefaultMembershipExpiry } from '@/lib/membership-year-utils';
import { DEFAULT_MEMBERSHIP_YEAR_CONFIG } from '@/lib/membership-defaults';
import { MembershipYearConfig } from '@/types/settings';
```

#### 5.2 Update Membership Tab Component

**File:** `src/components/members/tabs/MemberMembershipsTab.tsx`

No changes needed - it already handles renewals correctly by calling the API.

---

## Implementation Checklist

### ✅ Phase 1: Database Schema Cleanup
- [ ] Backup existing data
- [ ] Verify no data loss with migration query
- [ ] Drop `membership_renewals` table via Supabase MCP
- [ ] Verify `memberships` table has all needed columns
- [ ] Test existing membership queries still work

### ✅ Phase 2: Update Types
- [ ] Remove `MembershipRenewal` interface from `src/types/memberships.ts`
- [ ] Update `CreateMembershipRequest` interface
- [ ] Update `RenewMembershipRequest` interface
- [ ] Update any imports referencing `MembershipRenewal`

### ✅ Phase 3: Update API Routes
- [ ] Add imports for membership year utils in `src/app/api/memberships/route.ts`
- [ ] Update renewal logic to use membership year config
- [ ] Update create logic to use membership year config
- [ ] Remove membership_renewals insert code
- [ ] Update validation schemas
- [ ] Add settings fetch for membership_year config
- [ ] Test create membership with membership year
- [ ] Test renew membership with membership year

### ✅ Phase 4: Invoice Integration (Future)
- [ ] Create `src/lib/membership-invoice-service.ts`
- [ ] Implement `createMembershipInvoice` function
- [ ] Add chargeable creation/lookup for membership types
- [ ] Integrate with API routes
- [ ] Test invoice creation on membership create
- [ ] Test invoice creation on membership renewal

### ✅ Phase 5: Frontend Updates
- [ ] Update `CreateMembershipModal.tsx` to fetch membership year config
- [ ] Update `CreateMembershipModal.tsx` expiry calculation
- [ ] Update `RenewMembershipModal.tsx` to fetch membership year config
- [ ] Update `RenewMembershipModal.tsx` expiry calculation
- [ ] Add proper imports
- [ ] Test UI shows correct expiry dates

### ✅ Phase 6: Testing
- [ ] Test membership creation with current date
- [ ] Test membership renewal with current date
- [ ] Verify expiry dates use membership year (April 1, 2026 example)
- [ ] Test with different membership year configurations
- [ ] Test invoice creation (when implemented)
- [ ] Test membership history tracking via `renewal_of`
- [ ] Verify audit trail is complete

### ✅ Phase 7: Documentation
- [ ] Update `memberships.md` with new architecture
- [ ] Remove references to `membership_renewals` table
- [ ] Document membership year integration
- [ ] Document invoice creation process
- [ ] Add examples of renewal tracking via `renewal_of`

---

## Updated Data Flow

### Creating a New Membership

**Request:**
```typescript
POST /api/memberships
{
  "user_id": "uuid",
  "membership_type_id": "uuid",
  "auto_renew": false,
  "notes": "Initial membership",
  "create_invoice": true
}
```

**Process:**
1. Fetch membership type details
2. Fetch membership year config from settings (or use default)
3. Calculate `start_date` = today
4. Calculate `expiry_date` using `calculateDefaultMembershipExpiry(config, start_date)`
   - Example: Oct 1, 2025 → April 1, 2026 (if membership year ends April 1)
5. Create membership record with `fee_paid: false`
6. **(Future)** Create invoice if `create_invoice: true`
7. Return new membership

### Renewing a Membership

**Request:**
```typescript
POST /api/memberships
{
  "action": "renew",
  "membership_id": "old_uuid",
  "auto_renew": true,
  "notes": "Annual renewal",
  "create_invoice": true
}
```

**Process:**
1. Fetch current membership
2. Fetch membership type (same or new)
3. Fetch membership year config from settings
4. Calculate `start_date` = today
5. Calculate `expiry_date` using membership year config
6. Create new membership with `renewal_of: old_uuid`
7. Deactivate old membership (`is_active: false`)
8. **(Future)** Create invoice if requested
9. Return new membership

**NO separate `membership_renewals` entry!**

### Tracking Renewal History

Query memberships with `renewal_of` to trace the chain:

```typescript
// Get all memberships for a user, ordered by date
const { data } = await supabase
  .from("memberships")
  .select(`
    *,
    membership_types(*),
    renewed_from:memberships!renewal_of(*)
  `)
  .eq("user_id", userId)
  .order("start_date", { ascending: false });

// Current active membership
const current = data?.find(m => m.is_active);

// Previous membership (if current was a renewal)
const previous = current?.renewed_from;
```

---

## Key Benefits of This Approach

1. **Simpler Architecture:** One table (`memberships`) handles all membership records
2. **Audit Trail:** Complete history via `renewal_of` links + standard audit columns
3. **Membership Year Integration:** Expiry dates calculated based on club's fiscal year
4. **Flexible:** Can still change membership type during renewal
5. **Invoice Ready:** Structure prepared for invoice integration using membership type codes
6. **Correct Expiry Logic:** Oct 1, 2025 → April 1, 2026 (not Oct 1, 2026)

---

## Example Scenario (Your Use Case)

**Today:** October 1, 2025 (NZ)  
**Membership Year Config:** April 1 - March 31  
**Action:** Renew "Flying Member" membership

**Result:**
```javascript
{
  id: "new-uuid",
  user_id: "user-uuid",
  membership_type_id: "flying-member-uuid",
  start_date: "2025-10-01T00:00:00Z",
  expiry_date: "2026-04-01", // ← End of NEXT membership year
  purchased_date: "2025-10-01T00:00:00Z",
  renewal_of: "old-membership-uuid", // ← Links to previous membership
  auto_renew: true,
  grace_period_days: 30,
  fee_paid: false,
  is_active: true,
  notes: "Annual renewal",
  updated_by: "admin-uuid"
}
```

**Old Membership Updated:**
```javascript
{
  id: "old-membership-uuid",
  // ... other fields unchanged ...
  is_active: false, // ← Deactivated
}
```

---

## Migration Notes

### Data Integrity Checks Before Migration

```sql
-- 1. Check if any orphaned renewal records exist
SELECT COUNT(*) 
FROM membership_renewals mr
LEFT JOIN memberships new_m ON new_m.id = mr.new_membership_id
WHERE new_m.id IS NULL;

-- 2. Check if renewal_of matches membership_renewals
SELECT COUNT(*)
FROM membership_renewals mr
INNER JOIN memberships m ON m.id = mr.new_membership_id
WHERE m.renewal_of IS NULL OR m.renewal_of != mr.old_membership_id;

-- 3. Verify all renewed_by data is preserved in memberships.updated_by
SELECT COUNT(*)
FROM membership_renewals mr
INNER JOIN memberships m ON m.id = mr.new_membership_id
WHERE m.updated_by IS NULL OR m.updated_by != mr.renewed_by;
```

If any of these return > 0, investigate and fix data before dropping the table.

---

## Questions & Answers

**Q: What happens to existing membership records?**  
A: No changes needed. They remain in the `memberships` table with their current data.

**Q: What if we need to track additional renewal metadata?**  
A: Use the `notes` field in memberships, or create a `renewal_metadata` JSONB column if needed.

**Q: How do we query "who renewed this membership"?**  
A: Check `updated_by` field on the membership record.

**Q: How do we query "when was this renewed"?**  
A: Check `created_at` on the new membership or `updated_at` on the old one.

**Q: Can we still generate renewal reports?**  
A: Yes! Query memberships where `renewal_of IS NOT NULL` to get all renewals.

**Q: What about the membership type `duration_months` field?**  
A: Keep it for reference, but don't use it for expiry calculation. Always use membership year config.

---

## Final Recommendations

### Immediate Actions (Do First):
1. ✅ Drop `membership_renewals` table
2. ✅ Update API routes to use membership year config
3. ✅ Update frontend modals to show correct expiry dates
4. ✅ Test thoroughly with different dates and configurations

### Future Enhancements (Do Later):
1. ✅ Implement invoice creation for memberships
2. ✅ Add auto-renewal automation (cron job)
3. ✅ Add reminder emails for expiring memberships
4. ✅ Add bulk renewal operations
5. ✅ Add membership analytics dashboard

---

## File Changes Summary

### Files to Modify:
1. `src/types/memberships.ts` - Remove MembershipRenewal interface
2. `src/app/api/memberships/route.ts` - Update create/renew logic, remove renewals table code
3. `src/components/members/CreateMembershipModal.tsx` - Use membership year for expiry
4. `src/components/members/RenewMembershipModal.tsx` - Use membership year for expiry
5. `memberships.md` - Update documentation

### Files to Create:
1. `src/lib/membership-invoice-service.ts` - Invoice creation logic (future)

### Files to Delete:
- None (all cleanup happens in Supabase)

### Database Changes:
1. Drop table `membership_renewals` via Supabase MCP

---

**End of Plan**
