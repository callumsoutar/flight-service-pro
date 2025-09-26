# 🔧 Scheduler Security Fix - Tiered Access Implementation

## Problem Identified
The initial security fixes were too restrictive and broke the scheduler functionality. Members and students need to see basic instructor and aircraft information to use the scheduler effectively, but shouldn't have access to sensitive details.

## Solution Implemented: Tiered Data Access

### **Aircraft Endpoint (`/api/aircraft`)**
- **Before**: Completely blocked for members/students  
- **After**: Tiered access based on user role

**For Privileged Users (instructor/admin/owner):**
- Full aircraft data including maintenance, financials, etc.

**For Restricted Users (member/student):**
- Filtered data for scheduling purposes only:
  ```typescript
  {
    id: string,
    registration: string,
    type: string,
    on_line: boolean,
    aircraft_type: object // Basic type info
    // Excludes: maintenance data, financial info, notes, etc.
  }
  ```

### **Instructors Endpoint (`/api/instructors`)**
- **Before**: Completely blocked for members/students
- **After**: Tiered access based on user role

**For Privileged Users (instructor/admin/owner):**
- Full instructor data including medical dates, employment details, notes, etc.

**For Restricted Users (member/student):**
- Filtered data for scheduling purposes only:
  ```typescript
  {
    id: string,
    user_id: string,
    first_name: string,
    last_name: string,
    is_actively_instructing: boolean,
    status: string,
    // Endorsements for scheduling
    night_removal: boolean,
    aerobatics_removal: boolean,
    multi_removal: boolean,
    tawa_removal: boolean,
    ifr_removal: boolean,
    // Basic user info
    users: { id, first_name, last_name, email },
    instructor_category: object,
    // Excludes: medical dates, notes, employment details, etc.
  }
  ```

## Implementation Pattern

```typescript
// Role authorization check
const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
const isPrivilegedUser = userRole && ['instructor', 'admin', 'owner'].includes(userRole);
const isRestrictedUser = userRole && ['member', 'student'].includes(userRole);

// Allow access for authenticated users
if (!isPrivilegedUser && !isRestrictedUser) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Filter data based on role
const responseData = isRestrictedUser ? filterSensitiveData(data) : data;
return NextResponse.json({ items: responseData });
```

## Updated Security Matrix

| Endpoint | Privileged Users | Restricted Users |
|----------|------------------|------------------|
| `/api/aircraft` | Full data access | Basic scheduling data only |
| `/api/instructors` | Full data access | Basic scheduling data only |
| `/api/bookings` | Full access | Full access (existing RLS protects sensitive bookings) |
| `/api/roster-rules` | Full access | Read-only for scheduling |
| `/api/shift-overrides` | Full access | Read-only for scheduling |

## Benefits of This Approach

1. **Scheduler Functionality Restored**: Members and students can see who's available and what aircraft are online
2. **Data Privacy Maintained**: Sensitive information (medical dates, notes, financial data) is filtered out
3. **Principle of Least Privilege**: Users only see data necessary for their role
4. **Backwards Compatible**: Privileged users continue to see full data as before

## Files Modified

- `src/app/api/aircraft/route.ts` - Added `filterAircraftData()` function and tiered access
- `src/app/api/instructors/route.ts` - Added `filterInstructorData()` function and tiered access

## Testing Verification

The scheduler should now work for all user roles:
- **Members/Students**: Can see basic aircraft and instructor info for scheduling
- **Instructors**: Can see full operational data for their work
- **Admins/Owners**: Can see all sensitive data for management

## Security Maintained

- Authentication is still required for all endpoints
- Sensitive data is filtered based on user role
- Database RLS policies remain in effect as additional protection
- Financial data remains admin/owner only

This fix balances security requirements with operational functionality, ensuring the scheduler works while maintaining appropriate data privacy.
