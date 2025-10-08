# Chargeables System Documentation

## Overview

The chargeables system manages all billable items and services in the application. This includes aircraft rentals, instructor fees, membership fees, landing fees, and other custom charges. The system uses a flexible type-based architecture that allows for dynamic categorization of charges.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Table Relationships](#table-relationships)
3. [System Architecture](#system-architecture)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Usage Examples](#usage-examples)
7. [Migration Details](#migration-details)

---

## Database Schema

### `chargeable_types` Table

Defines the categories/types of charges available in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `code` | text | NOT NULL, UNIQUE | Machine-readable identifier (e.g., 'landing_fee') |
| `name` | text | NOT NULL | Human-readable name (e.g., 'Landing Fee') |
| `description` | text | NULL | Optional description of the type |
| `is_system` | boolean | DEFAULT false | System types cannot be edited/deleted |
| `is_active` | boolean | DEFAULT true | Whether this type is active |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Last update timestamp |

**System Types (Seeded):**
- `aircraft_rental` - Aircraft Rental
- `instructor_fee` - Instructor Fee
- `membership_fee` - Membership Fee
- `landing_fee` - Landing Fee
- `facility_rental` - Facility Rental
- `product_sale` - Product Sale
- `service_fee` - Service Fee
- `other` - Other
- `default_briefing` - Briefing Fee
- `airways_fees` - Airways Fees

**Indexes:**
- `idx_chargeable_types_code` on `code`
- `idx_chargeable_types_active` on `is_active`

**RLS Policies:**
- All authenticated users can view all chargeable types
- All authenticated users can insert, update chargeable types
- Only non-system types can be deleted

---

### `chargeables` Table

Individual billable items that can be added to invoices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `name` | text | NOT NULL | Name of the chargeable item |
| `description` | text | NULL | Optional description |
| `chargeable_type_id` | uuid | NOT NULL, FK | Foreign key to `chargeable_types.id` |
| `rate` | decimal | NOT NULL | Base rate/price |
| `is_taxable` | boolean | DEFAULT true | Whether tax applies |
| `is_active` | boolean | DEFAULT true | Whether this item is active |
| `voided_at` | timestamptz | NULL | Soft delete timestamp |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Last update timestamp |

**Foreign Keys:**
- `chargeable_type_id` → `chargeable_types(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_chargeables_type` on `chargeable_type_id`

**Joined Data:**
When querying, typically joined with `chargeable_types` to get type information:

```sql
SELECT
  c.*,
  ct.code,
  ct.name as type_name,
  ct.description as type_description
FROM chargeables c
LEFT JOIN chargeable_types ct ON ct.id = c.chargeable_type_id
WHERE c.voided_at IS NULL;
```

---

### `membership_types` Table

Defines membership tier configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `name` | text | NOT NULL | Membership type name |
| `description` | text | NULL | Optional description |
| `price` | decimal | NOT NULL | Membership price |
| `chargeable_id` | uuid | FK | Linked chargeable for billing |
| `is_active` | boolean | DEFAULT true | Whether this type is active |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Last update timestamp |

**Foreign Keys:**
- `chargeable_id` → `chargeables(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_membership_types_chargeable` on `chargeable_id`

**Important:** When a membership type is created, a corresponding chargeable is automatically created with type `membership_fee` and linked via `chargeable_id`.

---

### `memberships` Table

Individual member membership records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `member_id` | uuid | NOT NULL, FK | Foreign key to members |
| `membership_type_id` | uuid | NOT NULL, FK | Foreign key to membership_types |
| `start_date` | date | NOT NULL | Membership start date |
| `end_date` | date | NULL | Membership end date |
| `is_active` | boolean | DEFAULT true | Whether membership is active |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Last update timestamp |

**Foreign Keys:**
- `member_id` → `members(id)`
- `membership_type_id` → `membership_types(id)`

---

## Table Relationships

```
┌─────────────────────┐
│  chargeable_types   │
│                     │
│  - id (PK)          │
│  - code (UNIQUE)    │
│  - name             │
│  - is_system        │
│  - is_active        │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│    chargeables      │◄────────│  membership_types   │
│                     │  1:1    │                     │
│  - id (PK)          │         │  - id (PK)          │
│  - name             │         │  - name             │
│  - rate             │         │  - price            │
│  - is_taxable       │         │  - chargeable_id    │
│  - chargeable_      │         └──────────┬──────────┘
│    type_id (FK)     │                    │
└─────────────────────┘                    │ 1:N
                                           ▼
                                ┌─────────────────────┐
                                │    memberships      │
                                │                     │
                                │  - id (PK)          │
                                │  - member_id (FK)   │
                                │  - membership_      │
                                │    type_id (FK)     │
                                └─────────────────────┘
```

**Key Relationships:**

1. **Chargeable Types → Chargeables (1:N)**
   - Each chargeable type can have many chargeables
   - Each chargeable must belong to exactly one type
   - Type cannot be deleted if chargeables reference it (ON DELETE RESTRICT)

2. **Chargeables → Membership Types (1:1)**
   - Each membership type links to exactly one chargeable
   - This allows membership fees to be billed through the standard chargeables system
   - Auto-created when membership type is created

3. **Membership Types → Memberships (1:N)**
   - Each membership type can have many active memberships
   - Each membership belongs to exactly one type

---

## System Architecture

### Type-Based System

The system uses a **type-based architecture** where:

1. **Chargeable Types** define categories (landing fees, rentals, etc.)
2. **Chargeables** are specific billable items within those categories
3. **System Types** are protected and cannot be modified or deleted
4. **Custom Types** can be created by users for organization-specific needs

### System Types vs Custom Types

**System Types (`is_system = true`):**
- Created during initial migration
- Cannot be edited or deleted
- Provide standard categorization
- Code values are used in business logic (e.g., `landing_fee` for aircraft-specific rates)

**Custom Types (`is_system = false`):**
- Created by users through the UI
- Can be edited and deleted
- Provide flexibility for organization-specific categories
- Must have unique codes

### Aircraft-Specific Rates (Landing Fees)

Landing fees support **aircraft-specific pricing** through the `landing_fee_rates` table:

```
chargeables (type: landing_fee)
    ↓
landing_fee_rates
    ├── aircraft_type_id: "Cessna 172"    → rate: 50.00
    ├── aircraft_type_id: "Piper Warrior" → rate: 45.00
    └── aircraft_type_id: "Diamond DA40"  → rate: 55.00
```

When fetching landing fees, the API can filter by aircraft type to return the appropriate rate:

```
GET /api/chargeables?type=landing_fee&aircraft_type_id=<id>
```

---

## API Endpoints

### Chargeable Types API

**Base Route:** `/api/chargeable-types`

#### GET - List all chargeable types

```typescript
GET /api/chargeable-types

Response: {
  chargeable_types: ChargeableType[]
}
```

#### POST - Create new chargeable type

```typescript
POST /api/chargeable-types

Body: {
  code: string;          // lowercase, underscores only
  name: string;
  description?: string;
  is_active?: boolean;   // defaults to true
}

Response: {
  chargeable_type: ChargeableType
}
```

**Validation:**
- Code must be unique
- Code automatically sanitized to lowercase with underscores
- Cannot set `is_system = true` through API

#### PATCH - Update chargeable type

```typescript
PATCH /api/chargeable-types

Body: {
  id: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

Response: {
  chargeable_type: ChargeableType
}
```

**Restrictions:**
- Cannot edit system types (`is_system = true`)
- Cannot change `code` after creation

#### DELETE - Deactivate chargeable type

```typescript
DELETE /api/chargeable-types?id=<uuid>

Response: {
  message: "Chargeable type deactivated successfully"
}
```

**Restrictions:**
- Cannot delete system types
- Sets `is_active = false` (soft delete)

---

### Chargeables API

**Base Route:** `/api/chargeables`

#### GET - List/search chargeables

```typescript
GET /api/chargeables?q=<search>&type=<type_code>&aircraft_type_id=<uuid>

Query Parameters:
  - q: string              // Search term (optional)
  - type: string           // Filter by type code (optional)
  - aircraft_type_id: uuid // For landing fees (optional)

Response: {
  chargeables: ChargeableWithAircraftRates[]
}
```

**Features:**
- Returns joined data with `chargeable_types`
- For landing fees, returns aircraft-specific rates if `aircraft_type_id` provided
- Excludes voided items (`voided_at IS NULL`)
- Search filters by name and description

**Response Type:**
```typescript
interface ChargeableWithAircraftRates extends Chargeable {
  chargeable_types?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  };
  landing_fee_rates?: Array<{
    id: string;
    aircraft_type_id: string;
    rate: number;
  }>;
}
```

#### POST - Create new chargeable

```typescript
POST /api/chargeables

Body: {
  name: string;
  description?: string;
  chargeable_type_id: string;  // Must exist in chargeable_types
  rate: number;
  is_taxable?: boolean;        // defaults to true
  is_active?: boolean;         // defaults to true

  // For landing fees only:
  landing_fee_rates?: Array<{
    aircraft_type_id: string;
    rate: number;
  }>;
}

Response: {
  chargeable: Chargeable
}
```

**Validation:**
- `chargeable_type_id` must reference existing type
- For landing fees, validates type code is 'landing_fee'
- Landing fee rates are optional (falls back to base rate)

#### PATCH - Update chargeable

```typescript
PATCH /api/chargeables

Body: {
  id: string;
  name?: string;
  description?: string;
  rate?: number;
  is_taxable?: boolean;
  is_active?: boolean;

  // For landing fees only:
  landing_fee_rates?: Array<{
    aircraft_type_id: string;
    rate: number;
  }>;
}

Response: {
  chargeable: Chargeable
}
```

**Note:** Cannot change `chargeable_type_id` after creation

#### DELETE - Void chargeable

```typescript
DELETE /api/chargeables?id=<uuid>

Response: {
  message: "Chargeable voided successfully"
}
```

**Behavior:**
- Soft delete: Sets `voided_at = NOW()`
- Preserves historical data

---

### Membership Types API

**Base Route:** `/api/membership_types`

#### GET - List all membership types

```typescript
GET /api/membership_types

Response: {
  membership_types: Array<MembershipType & {
    chargeables?: {
      id: string;
      name: string;
      rate: number;
      is_taxable: boolean;
    }
  }>
}
```

**Features:**
- Returns joined chargeable data
- Shows linked billing information

#### POST - Create membership type

```typescript
POST /api/membership_types

Body: {
  name: string;
  description?: string;
  price: number;
  chargeable_id?: string;  // Optional: link to existing chargeable
  is_active?: boolean;
}

Response: {
  membership_type: MembershipType
}
```

**Auto-Creation Logic:**

If `chargeable_id` is not provided:
1. Fetches the `membership_fee` chargeable type
2. Creates a new chargeable with:
   - `name`: `"<membership_type_name> Fee"`
   - `chargeable_type_id`: membership_fee type ID
   - `rate`: Same as membership `price`
   - `is_taxable`: false (memberships typically tax-exempt)
3. Links the new chargeable to the membership type

#### PATCH - Update membership type

```typescript
PATCH /api/membership_types

Body: {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  is_active?: boolean;
}

Response: {
  membership_type: MembershipType
}
```

**Note:** Does not automatically update linked chargeable. Update the chargeable separately if needed.

---

### Landing Fee Rates API

**Base Route:** `/api/landing-fee-rates`

#### POST - Create/update aircraft-specific rate

```typescript
POST /api/landing-fee-rates

Body: {
  chargeable_id: string;      // Must be a landing_fee type
  aircraft_type_id: string;
  rate: number;
}

Response: {
  landing_fee_rate: LandingFeeRate
}
```

**Validation:**
- Verifies `chargeable_id` references a chargeable with type `landing_fee`
- Uses upsert logic (updates if combination exists)

---

## UI Components

### ChargeableTypesConfig

**Location:** `/src/components/settings/ChargeableTypesConfig.tsx`

**Features:**
- Split-pane layout (list + edit form)
- Search and filter types
- Create custom types via dialog
- Edit custom types
- View-only for system types
- Visual badges for system vs custom types
- Deactivation for custom types

**Usage:**
```tsx
import ChargeableTypesConfig from "@/components/settings/ChargeableTypesConfig";

<ChargeableTypesConfig />
```

---

### ChargeablesConfig

**Location:** `/src/components/settings/ChargeablesConfig.tsx`

**Features:**
- Dynamic type dropdown (fetches from `chargeable_types`)
- Create/edit chargeables
- Type-based filtering
- Search functionality
- Soft delete (voiding)

**Key Changes:**
- Type selection now uses `chargeable_type_id` instead of hardcoded enum
- Filters by `chargeable_types?.code` instead of enum value

---

### LandingFeesConfig

**Location:** `/src/components/settings/LandingFeesConfig.tsx`

**Features:**
- Automatically fetches `landing_fee` type ID
- Aircraft-specific rate management
- Base rate + overrides

**Key Changes:**
- Fetches landing fee type on mount
- Uses type ID when creating landing fees
- Validates type is `landing_fee` via code check

---

### MembershipTypesConfig

**Location:** `/src/components/settings/MembershipTypesConfig.tsx`

**Features:**
- Create/edit membership types
- Display linked chargeable information
- Shows rate and tax status from linked chargeable

**Key Changes:**
- Displays linked chargeable info in edit form
- Shows chargeable name, rate, and tax status

---

### ChargeableSearchDropdown

**Location:** `/src/components/invoices/ChargeableSearchDropdown.tsx`

**Features:**
- Searchable dropdown for invoice line items
- Dynamic grouping by chargeable type
- Shows tax-inclusive pricing
- Supports category filtering

**Key Changes:**
- Groups by `chargeable_types?.name` instead of hardcoded labels
- Dynamic categories based on database types

**Usage:**
```tsx
<ChargeableSearchDropdown
  onAdd={(item, quantity) => { /* handle */ }}
  taxRate={0.15}
  category="landing_fee"  // optional filter
  aircraftTypeId="uuid"   // optional for aircraft-specific rates
/>
```

---

## Usage Examples

### Example 1: Creating a Custom Chargeable Type

```typescript
// Create a custom type for "Catering"
POST /api/chargeable-types
{
  code: "catering",
  name: "Catering Services",
  description: "In-flight catering and refreshments",
  is_active: true
}

// Create a chargeable item under this type
POST /api/chargeables
{
  name: "Premium Lunch Package",
  description: "Includes sandwich, drink, and dessert",
  chargeable_type_id: "<catering_type_id>",
  rate: 25.00,
  is_taxable: true
}
```

### Example 2: Creating a Membership Type with Auto-Chargeable

```typescript
// Create membership type
POST /api/membership_types
{
  name: "Gold Member",
  description: "Premium membership with full access",
  price: 1200.00,
  is_active: true
  // chargeable_id omitted - will auto-create
}

// System automatically creates:
// - Chargeable named "Gold Member Fee"
// - Type: membership_fee
// - Rate: 1200.00
// - Tax: false
// - Links to membership type via chargeable_id
```

### Example 3: Landing Fee with Aircraft-Specific Rates

```typescript
// 1. Get the landing_fee type ID
GET /api/chargeable-types
// Find: { code: "landing_fee", id: "..." }

// 2. Create a landing fee chargeable
POST /api/chargeables
{
  name: "Standard Landing Fee",
  description: "Per landing charge",
  chargeable_type_id: "<landing_fee_type_id>",
  rate: 50.00,  // default rate
  is_taxable: false
}

// 3. Add aircraft-specific rates
POST /api/landing-fee-rates
{
  chargeable_id: "<landing_fee_chargeable_id>",
  aircraft_type_id: "<cessna_172_id>",
  rate: 45.00  // discounted for smaller aircraft
}

POST /api/landing-fee-rates
{
  chargeable_id: "<landing_fee_chargeable_id>",
  aircraft_type_id: "<king_air_id>",
  rate: 125.00  // premium for larger aircraft
}

// 4. Query with aircraft filter
GET /api/chargeables?type=landing_fee&aircraft_type_id=<cessna_172_id>
// Returns landing fees with rate = 45.00 for this aircraft
```

### Example 4: Searching and Adding to Invoice

```typescript
// Search for instructor fees
GET /api/chargeables?q=instructor&type=instructor_fee
// Returns all instructor-related chargeables

// Add to invoice through ChargeableSearchDropdown
<ChargeableSearchDropdown
  onAdd={(item, quantity) => {
    // item.rate = base rate
    // Calculate: (rate * quantity) * (1 + taxRate)
    const total = (item.rate * quantity) * 1.15;
    addLineItem({
      chargeable_id: item.id,
      description: item.name,
      quantity,
      unit_price: item.rate,
      total,
    });
  }}
  taxRate={0.15}
  category="instructor_fee"
/>
```

---

## Migration Details

### Migration File

**Location:** `/supabase/migrations/20250103000000_chargeable_types_refactor.sql`

**What it does:**

1. **Creates `chargeable_types` table**
   - Defines schema with id, code, name, description, is_system, is_active
   - Adds indexes for performance

2. **Seeds system types**
   - Inserts 10 predefined system types
   - All marked with `is_system = true`

3. **Migrates chargeables table**
   - Adds `chargeable_type_id` column
   - Copies data from old `type` enum to new FK
   - Updates all existing chargeables to reference correct type
   - Makes `chargeable_type_id` NOT NULL
   - Adds foreign key constraint
   - Drops old `type` column
   - Drops old `chargeable_type` enum

4. **Updates membership_types table**
   - Adds `chargeable_id` column
   - Auto-creates chargeables for existing membership types
   - Links via `chargeable_id` foreign key
   - Adds index

5. **Sets up RLS policies**
   - All authenticated users can view, insert, update types
   - Only non-system types can be deleted

6. **Adds triggers**
   - `set_updated_at_chargeable_types` for timestamp management

### Running the Migration

```bash
# Run in Supabase SQL Editor or via CLI
psql <database_url> -f supabase/migrations/20250103000000_chargeable_types_refactor.sql
```

### Verification Queries

After migration, verify with:

```sql
-- Count types created
SELECT COUNT(*) as total_types FROM chargeable_types;
-- Expected: 10

-- Verify all chargeables migrated
SELECT COUNT(*) as chargeables_migrated
FROM chargeables
WHERE chargeable_type_id IS NOT NULL;
-- Expected: Same as total chargeables

-- Verify membership types linked
SELECT COUNT(*) as membership_types_linked
FROM membership_types
WHERE chargeable_id IS NOT NULL;
-- Expected: Same as total membership_types

-- View distribution by type
SELECT
  ct.name as type_name,
  COUNT(c.id) as chargeable_count
FROM chargeable_types ct
LEFT JOIN chargeables c ON c.chargeable_type_id = ct.id AND c.voided_at IS NULL
GROUP BY ct.id, ct.name
ORDER BY ct.name;
```

### Rollback Plan

If needed, the migration can be rolled back:

```sql
BEGIN;

-- 1. Restore enum type
CREATE TYPE chargeable_type AS ENUM (
  'aircraft_rental',
  'instructor_fee',
  'membership_fee',
  'landing_fee',
  'facility_rental',
  'product_sale',
  'service_fee',
  'other',
  'default_briefing',
  'airways_fees'
);

-- 2. Add type column back to chargeables
ALTER TABLE chargeables ADD COLUMN type chargeable_type;

-- 3. Migrate data back
UPDATE chargeables c
SET type = ct.code::chargeable_type
FROM chargeable_types ct
WHERE ct.id = c.chargeable_type_id;

-- 4. Make type required
ALTER TABLE chargeables ALTER COLUMN type SET NOT NULL;

-- 5. Drop foreign key column
ALTER TABLE chargeables DROP COLUMN chargeable_type_id;

-- 6. Remove chargeable_id from membership_types
ALTER TABLE membership_types DROP COLUMN chargeable_id;

-- 7. Drop chargeable_types table
DROP TABLE chargeable_types CASCADE;

COMMIT;
```

---

## TypeScript Types

### Core Types

```typescript
// /src/types/chargeables.ts

export interface ChargeableType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chargeable {
  id: string;
  name: string;
  description: string | null;
  chargeable_type_id: string;
  rate: number;
  is_taxable: boolean;
  is_active: boolean;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChargeableWithAircraftRates extends Chargeable {
  chargeable_types?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  };
  landing_fee_rates?: Array<{
    id: string;
    aircraft_type_id: string;
    rate: number;
  }>;
}
```

### Membership Types

```typescript
// /src/types/memberships.ts

export interface MembershipType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  chargeable_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chargeables?: {
    id: string;
    name: string;
    rate: number;
    is_taxable: boolean;
  };
}

export interface Membership {
  id: string;
  member_id: string;
  membership_type_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Best Practices

### 1. Use System Types for Standard Categories

Always use the predefined system types (`landing_fee`, `aircraft_rental`, etc.) for standard billing categories. Only create custom types for organization-specific needs.

### 2. Soft Delete with `voided_at`

Never hard-delete chargeables. Use the DELETE API which sets `voided_at` to preserve historical invoice data.

### 3. Aircraft-Specific Rates

For landing fees, always define a base rate on the chargeable, then add aircraft-specific overrides in `landing_fee_rates`. This ensures a fallback rate exists.

### 4. Membership Type Chargeables

Let the system auto-create chargeables for membership types. Only specify `chargeable_id` when linking to an existing chargeable.

### 5. Type Code Naming

Use lowercase snake_case for type codes (e.g., `equipment_rental`, not `Equipment-Rental` or `equipmentRental`). The API will sanitize input.

### 6. Tax Configuration

Set `is_taxable = false` for membership fees and landing fees (typically tax-exempt). Set `is_taxable = true` for rentals and services.

### 7. Querying with Joins

Always fetch chargeables with joined `chargeable_types` data to get type information:

```typescript
const { data } = await supabase
  .from("chargeables")
  .select(`
    *,
    chargeable_types (
      id,
      code,
      name,
      description
    )
  `)
  .is("voided_at", null);
```

---

## Troubleshooting

### Issue: "chargeable_type_id cannot be null"

**Cause:** Creating a chargeable without specifying a valid `chargeable_type_id`.

**Solution:** Always specify a valid `chargeable_type_id` when creating chargeables. Query `/api/chargeable-types` to get available types.

### Issue: "Cannot delete chargeable type"

**Cause:** Attempting to delete a type that has chargeables referencing it.

**Solution:** First deactivate or void all chargeables of this type, then delete the type. System types cannot be deleted.

### Issue: "Landing fee rates not showing"

**Cause:** Not including `aircraft_type_id` in the query, or no aircraft-specific rates defined.

**Solution:**
1. Ensure `landing_fee_rates` exist for the aircraft
2. Include `aircraft_type_id` query parameter when fetching landing fees
3. Always define a base rate on the chargeable as a fallback

### Issue: "Membership type creation fails"

**Cause:** Auto-creation of chargeable failed (e.g., `membership_fee` type doesn't exist).

**Solution:** Ensure the migration ran successfully and the `membership_fee` system type exists in `chargeable_types`.

---

## Future Enhancements

Potential areas for expansion:

1. **Volume Discounts**: Add quantity-based pricing tiers
2. **Time-Based Rates**: Different rates for peak/off-peak times
3. **Package Deals**: Bundle multiple chargeables at a discounted rate
4. **Custom Fields**: Allow custom metadata on chargeable types
5. **Approval Workflows**: Require approval for high-value chargeables
6. **Rate History**: Track rate changes over time for reporting

---

## Summary

The chargeables system provides a flexible, type-based architecture for managing all billable items. Key features:

- ✅ Dynamic chargeable types (system + custom)
- ✅ Type-safe TypeScript interfaces
- ✅ Aircraft-specific landing fee rates
- ✅ Auto-linked membership chargeables
- ✅ Soft delete for historical data
- ✅ Comprehensive API endpoints
- ✅ User-friendly UI components
- ✅ Full RLS security policies
- ✅ Migration with data preservation

For questions or issues, refer to the API documentation above or review the component source code.
