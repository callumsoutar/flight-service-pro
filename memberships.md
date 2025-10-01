# Membership System Documentation

## Overview

The membership system in Duplicate Desk Pro is a comprehensive solution for managing flight school memberships. It supports different membership types, renewal workflows, grace periods, invoice creation, and detailed member status tracking.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Types and Interfaces](#types-and-interfaces)
3. [API Routes](#api-routes)
4. [Components](#components)
5. [Utility Functions](#utility-functions)
6. [Workflows](#workflows)
7. [Status Management](#status-management)

## Database Schema

### Current Implementation (Single Tenant)

The current database uses a **simplified single-tenant schema** with these tables:

#### `memberships` Table (Single Tenant Schema)
```sql
CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."membership_type" NOT NULL,
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
```

#### `membership_type` Enum
```sql
CREATE TYPE "public"."membership_type" AS ENUM (
    'flying_member',
    'non_flying_member',
    'staff_membership',
    'junior_member',
    'life_member'
);
```

### Advanced Schema (Complete Schema)

The system is designed to support a more advanced schema with separate `membership_types` table:

#### `memberships` Table (Advanced Schema)
```sql
CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "membership_type_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "purchased_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fee_paid" boolean DEFAULT false NOT NULL,
    "amount_paid" numeric(10,2),
    "invoice_id" "uuid",
    "renewal_of" "uuid",
    "auto_renew" boolean DEFAULT false NOT NULL,
    "grace_period_days" integer DEFAULT 30 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
```

#### `membership_types` Table
```sql
CREATE TABLE IF NOT EXISTS "public"."membership_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "duration_months" integer NOT NULL,
    "benefits" text[] DEFAULT '{}',
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
```

#### Renewal Tracking

**Note:** The system no longer uses a separate `membership_renewals` table. Renewals are tracked directly through the `memberships` table using the `renewal_of` field, which creates a self-referencing relationship between the new and old membership records.

**Audit Trail for Renewals:**
- `renewal_of` - Links to the previous membership (self-referencing FK)
- `updated_by` - Tracks who created/renewed the membership
- `created_at` - Serves as the renewal date
- `notes` - Contains renewal-specific notes

## Types and Interfaces

### Core Types

**`src/types/memberships.ts`**

```typescript
export type MembershipStatus = "active" | "expired" | "grace" | "unpaid" | "none";

export interface MembershipType {
  id: string;
  name: string; // "Flying Member", "Social Member"
  code: string; // "flying_member", "social_member"
  description?: string;
  price: number; // Annual fee
  duration_months: number; // 12 for annual, 1 for monthly
  is_active: boolean;
  benefits: string[]; // Array of membership benefits
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  membership_type_id: string;
  membership_type?: MembershipType; // Joined data
  start_date: string;
  end_date?: string;
  expiry_date: string;
  purchased_date: string;
  is_active: boolean;
  fee_paid: boolean;
  amount_paid?: number;
  invoice_id?: string; // Link to payment invoice
  renewal_of?: string; // ID of membership this renews
  auto_renew: boolean;
  grace_period_days: number;
  notes?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipSummary {
  current_membership?: Membership;
  status: MembershipStatus;
  days_until_expiry?: number;
  grace_period_remaining?: number;
  can_renew: boolean;
  membership_history: Membership[];
}

// Note: MembershipRenewal interface has been removed.
// Renewals are now tracked through the memberships.renewal_of field.
```

### Constants

```typescript
export const DEFAULT_GRACE_PERIOD_DAYS = 30;

export const MEMBERSHIP_TYPE_CODES = {
  FLYING_MEMBER: 'flying_member',
  NON_FLYING_MEMBER: 'non_flying_member',
  STAFF_MEMBERSHIP: 'staff_membership',
  JUNIOR_MEMBER: 'junior_member',
  LIFE_MEMBER: 'life_member',
} as const;
```

## API Routes

### 1. Memberships API (`/api/memberships`)

**`src/app/api/memberships/route.ts`**

#### GET Endpoint
- **Purpose**: Fetch memberships for a user, with optional summary
- **Parameters**: 
  - `user_id` (required): UUID of the user
  - `summary` (optional): Returns calculated status and summary data
- **Returns**: Membership data with joined membership type information

```typescript
// Basic fetch
GET /api/memberships?user_id=123

// With summary calculation
GET /api/memberships?user_id=123&summary=true
```

#### POST Endpoint
- **Purpose**: Create new membership or renew existing membership
- **Actions**: Determined by `action` field ("create" or "renew")

**Create Membership Schema:**
```typescript
{
  user_id: string (UUID),
  membership_type_id: string (UUID),
  start_date?: string (optional),
  auto_renew: boolean (default: false),
  notes?: string (optional),
  create_invoice: boolean
}
```

**Renew Membership Schema:**
```typescript
{
  action: "renew",
  membership_id: string (UUID),
  membership_type_id?: string (UUID, optional - can change type),
  auto_renew?: boolean (optional),
  notes?: string (optional),
  create_invoice: boolean
}
```

### 2. Membership Types API (`/api/membership_types`)

**`src/app/api/membership_types/route.ts`**

#### GET Endpoint
- **Purpose**: Fetch available membership types
- **Parameters**: 
  - `active_only=true` (optional): Only return active membership types
- **Returns**: Array of membership types

### Status Calculation Logic

The system calculates membership status based on:

1. **Payment Status**: `fee_paid` boolean
2. **Current Date**: Compared against `expiry_date`
3. **Grace Period**: `grace_period_days` after expiry

**Status Priority:**
1. `unpaid` - If `fee_paid` is false
2. `active` - If current date ≤ expiry date
3. `grace` - If current date ≤ (expiry date + grace period)
4. `expired` - If beyond grace period

## Components

### 1. MemberMembershipsTab Component

**`src/components/members/tabs/MemberMembershipsTab.tsx`**

**Purpose**: Main membership management interface within member profile

**Key Features:**
- Displays current membership status with color-coded badges
- Shows membership history
- Provides renewal and creation modals
- Calculates and displays expiry warnings
- Shows membership benefits and details

**Key Functions:**
- `loadMembershipData()`: Fetches membership summary from API
- `handleRenewMembership()`: Processes membership renewal
- `handleCreateMembership()`: Creates new membership

### 2. CreateMembershipModal Component

**`src/components/members/CreateMembershipModal.tsx`**

**Purpose**: Modal for creating new memberships

**Features:**
- Membership type selection with pricing
- Auto-renewal toggle
- Invoice creation option
- Notes field
- Expiry date calculation preview
- Benefits display

**Key Props:**
```typescript
interface CreateMembershipModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  membershipTypes: MembershipType[];
  onCreateMembership: (data: CreateMembershipRequest) => Promise<void>;
}
```

### 3. RenewMembershipModal Component

**`src/components/members/RenewMembershipModal.tsx`**

**Purpose**: Modal for renewing existing memberships

**Features:**
- Current membership information display
- Option to change membership type during renewal
- Auto-renewal settings
- Invoice creation option
- Notes field
- Renewal date calculation

**Key Props:**
```typescript
interface RenewMembershipModalProps {
  open: boolean;
  onClose: () => void;
  currentMembership: Membership;
  membershipTypes: MembershipType[];
  onRenew: (data: RenewMembershipRequest) => Promise<void>;
}
```

## Utility Functions

### Membership Utils (`src/lib/membership-utils.ts`)

#### Status Calculation Functions

```typescript
// Calculate membership status
calculateMembershipStatus(membership: Membership): MembershipStatus

// Get days until expiry (for active memberships)
getDaysUntilExpiry(membership: Membership): number | null

// Get remaining grace period days
getGracePeriodRemaining(membership: Membership): number | null

// Check if membership can be renewed
canRenewMembership(membership: Membership): boolean

// Check if membership is expiring soon (default: 30 days)
isMembershipExpiringSoon(membership: Membership, warningDays?: number): boolean
```

#### UI Helper Functions

```typescript
// Get status badge CSS classes
getStatusBadgeClasses(status: MembershipStatus): string

// Get human-readable status text
getStatusText(status: MembershipStatus): string

// Format membership benefits for display
formatMembershipBenefits(benefits: string[]): string
```

#### Date Calculation Functions

```typescript
// Calculate renewal dates
calculateRenewalDates(membershipType: MembershipType, startDate?: Date): {
  startDate: Date;
  expiryDate: Date;
}

// Create invoice data for membership payment
createMembershipInvoiceData(
  membership: Membership,
  membershipType: MembershipType,
  userId: string
)
```

## Workflows

### 1. Creating a New Membership

**Process Flow:**

1. **User Interface**: Click "Create Membership" in `MemberMembershipsTab`
2. **Modal Opens**: `CreateMembershipModal` displays
3. **User Selection**: 
   - Select membership type from dropdown
   - Configure auto-renewal
   - Choose invoice creation option
   - Add optional notes
4. **Preview**: Modal shows calculated expiry date and benefits
5. **Submission**: 
   - API call to `POST /api/memberships` with `action: "create"`
   - Server validates membership type
   - Calculates expiry date based on duration
   - Creates membership record
   - Optionally creates invoice
6. **Response**: Modal closes, membership list refreshes

**API Data Flow:**
```typescript
// Frontend sends
{
  action: "create",
  user_id: "uuid",
  membership_type_id: "uuid",
  auto_renew: boolean,
  notes?: string,
  create_invoice: boolean
}

// Server creates
{
  user_id: "uuid",
  membership_type_id: "uuid",
  start_date: "2024-01-01T00:00:00Z",
  expiry_date: "2024-12-31",
  purchased_date: "2024-01-01T00:00:00Z",
  auto_renew: boolean,
  grace_period_days: 30,
  notes?: string,
  updated_by: "current_user_id"
}
```

### 2. Renewing a Membership

**Process Flow:**

1. **User Interface**: Click "Renew Membership" in `MemberMembershipsTab`
2. **Modal Opens**: `RenewMembershipModal` displays with current membership info
3. **Membership Year Config**: System fetches configured membership year from settings
4. **User Selection**:
   - Optionally change membership type
   - Configure auto-renewal settings
   - Choose invoice creation
   - Add renewal notes
5. **Preview**: Shows new membership details with expiry date calculated from membership year config
6. **Submission**:
   - API call to `POST /api/memberships` with `action: "renew"`
   - Server fetches membership year configuration
   - Creates new membership with `start_date` = today
   - Calculates `expiry_date` using membership year config (e.g., Oct 1, 2025 → April 1, 2026)
   - Links to old membership via `renewal_of`
   - Deactivates old membership
   - Optionally creates invoice
7. **Response**: Modal closes, membership data refreshes

**API Data Flow:**
```typescript
// Frontend sends
{
  action: "renew",
  membership_id: "old_membership_uuid",
  membership_type_id?: "new_type_uuid", // Optional type change
  auto_renew?: boolean,
  notes?: string,
  create_invoice: boolean
}

// Server:
// 1. Fetches membership year config (e.g., April 1 - March 31)
// 2. Creates new membership with calculated expiry date
// 3. Links via renewal_of field
// 4. Deactivates old membership
```

### 3. Viewing Membership Status

**Process Flow:**

1. **Tab Selection**: User navigates to "Memberships" tab in member profile
2. **Data Loading**: `MemberMembershipsTab` calls `loadMembershipData()`
3. **API Request**: `GET /api/memberships?user_id=X&summary=true`
4. **Status Calculation**: Server calculates current status using utility functions
5. **Display**: Component renders:
   - Current membership card with status badge
   - Expiry warnings if applicable
   - Grace period information
   - Membership history
   - Action buttons (Renew/Create)

**Status Display Logic:**
- **Active**: Green badge, shows days until expiry
- **Grace**: Yellow badge, shows grace period remaining
- **Expired**: Red badge
- **Unpaid**: Orange badge
- **None**: Gray badge, shows "Create Membership" option

### 4. Invoice Creation (Optional)

When `create_invoice: true` is selected:

1. **Membership Creation**: Membership record is created first
2. **Invoice Generation**: System uses `createMembershipInvoiceData()` utility
3. **Invoice Data**:
   ```typescript
   {
     user_id: string,
     status: "pending",
     issue_date: current_date,
     due_date: current_date + 30_days,
     subtotal: membership_type.price,
     tax_total: 0, // Memberships typically not taxed
     total_amount: membership_type.price,
     notes: `Membership fee for ${membership_type.name}`,
     reference: `MEMBERSHIP-${membership.id.substring(0, 8)}`
   }
   ```
4. **Linking**: Invoice ID is stored in membership record

## Status Management

### Status Definitions

1. **Active**: 
   - Fee is paid
   - Current date is before expiry date
   - Full membership benefits available

2. **Grace**: 
   - Fee is paid
   - Current date is after expiry but within grace period
   - Limited or reduced benefits

3. **Expired**: 
   - Fee is paid
   - Current date is beyond grace period
   - No membership benefits

4. **Unpaid**: 
   - Fee is not paid
   - Regardless of dates
   - No membership benefits until payment

5. **None**: 
   - No membership record exists
   - Show option to create membership

### Grace Period Management

- **Default**: 30 days after membership expiry
- **Configurable**: Per membership via `grace_period_days` field
- **Purpose**: Allow members time to renew without losing benefits immediately
- **Display**: Shows countdown of remaining grace period days

### Expiry Warnings

- **Warning Threshold**: 30 days before expiry (configurable)
- **Display**: Orange warning banner in membership card
- **Purpose**: Encourage proactive renewal
- **Function**: `isMembershipExpiringSoon(membership, warningDays)`

## Key Design Decisions

### 1. Single Tenant Architecture
- No `organization_id` fields in current implementation
- Simplified schema for single flight school use
- Can be extended to multi-tenant when needed

### 2. Renewal Strategy
- Creates new membership records rather than extending existing ones
- Maintains full history and audit trail via `renewal_of` self-referencing field
- No separate renewals table needed - all data tracked in `memberships` table
- Expiry dates calculated using configurable membership year (not duration_months)

### 3. Status Calculation
- Real-time calculation based on dates and payment status
- No stored status field to avoid synchronization issues
- Consistent logic across frontend and backend

### 4. Invoice Integration
- Optional invoice creation during membership creation/renewal
- Separate invoice system handles payment processing
- Links maintained between memberships and invoices

### 5. Flexible Membership Types
- Support for predefined enum types (current) or dynamic types (future)
- Benefits stored as array for flexibility
- Duration configurable per type (monthly, annual, etc.)

### 6. Membership Year Configuration
- Expiry dates calculated using configurable membership year from settings
- Default: April 1 - March 31 (configurable via Settings > Memberships)
- Example: Membership created Oct 1, 2025 → Expires April 1, 2026 (end of membership year)
- Uses `calculateDefaultMembershipExpiry()` from `membership-year-utils.ts`
- Falls back to DEFAULT_MEMBERSHIP_YEAR_CONFIG if settings not configured

## Future Enhancements

1. **Auto-Renewal Processing**: Automated renewal for members with `auto_renew: true`
2. **Payment Integration**: Direct payment processing during membership creation
3. **Notification System**: Email reminders for expiring memberships
4. **Bulk Operations**: Mass renewal or membership type changes
5. **Reporting**: Membership analytics and financial reporting
6. **Member Portal**: Self-service membership management for members 