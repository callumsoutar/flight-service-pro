# Scheduler Permissions & Security Guide

## Overview

This document provides a comprehensive guide to the Row Level Security (RLS) policies, Role-Based Access Control (RBAC), and permission systems that protect the Flight Desk Pro scheduler functionality. The scheduler allows users to view, create, and manage flight bookings while maintaining strict security boundaries based on user roles.

## Role Hierarchy

The system uses a hierarchical role structure with the following roles (from most to least privileged):

1. **Owner** - Full system access, can manage all aspects
2. **Admin** - Administrative access, user management, can manage most resources
3. **Instructor** - Teaching and flight operations access, can manage bookings and view member data
4. **Member** - Standard member booking access, can view all bookings but with limited editing rights
5. **Student** - Learning and basic booking access, can view all bookings but with limited editing rights

## Core Security Principles

### 1. Defense in Depth
- **Frontend Controls**: UI elements are hidden/disabled based on roles (UX layer)
- **Backend Validation**: All API endpoints enforce permissions (API layer)
- **Database RLS**: Row Level Security policies prevent unauthorized data access (Database layer)

### 2. Never Trust the Frontend
- Frontend role checks are **ONLY** for user experience
- All security enforcement happens server-side
- API endpoints must validate permissions independently

### 3. Fail Secure
- Default behavior is to deny access
- If role information is unavailable, restrict access
- Graceful degradation when permission checks fail

## Database Functions

### Role Checking Functions

#### `get_user_role(user_id UUID)`
Returns the user's primary role based on hierarchy:
```sql
-- Prioritizes roles: owner > admin > instructor > member > student
-- Returns 'member' as default if no role found
```

#### `check_user_role_simple(user_id UUID, allowed_roles user_role[])`
Checks if user has any of the specified roles:
```sql
-- Returns true if user has any allowed role
-- Uses direct query without RLS to avoid circular dependencies
-- Returns false on any error for security
```

#### `check_user_role(user_id UUID, allowed_roles user_role[])`
Similar to `check_user_role_simple` but with RLS enabled.

## RLS Policies by Table

### Bookings Table

The bookings table is the core of the scheduler functionality. It has multiple policies to handle different access patterns:

#### `bookings_scheduler_view` (SELECT)
- **Scope**: All authenticated users
- **Purpose**: Allows all authenticated users to view bookings for scheduler display
- **Policy**: `true` (no restrictions)
- **Use Case**: Enables cross-member visibility in scheduler

#### `bookings_insert` (INSERT)
- **Scope**: Booking owner OR admin/owner/instructor roles
- **Policy**: `(auth.uid() = user_id) OR check_user_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Members can create their own bookings, privileged users can create any booking

#### `bookings_update` (UPDATE)
- **Scope**: Booking owner OR admin/owner/instructor roles
- **Policy**: `(auth.uid() = user_id) OR check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Members can edit their own bookings, privileged users can edit any booking

#### `bookings_delete` (DELETE)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can permanently delete bookings

#### `Users can override flight authorization` (UPDATE)
- **Scope**: Instructor/admin roles
- **Policy**: Complex role check for authorization overrides
- **Use Case**: Allows instructors to override flight authorization requirements

### Users Table

The users table has multiple policies to control member data visibility:

#### `users_view_all` (SELECT)
- **Scope**: Admin/owner/instructor roles
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Privileged users can view all user data

#### `users_view_own` (SELECT)
- **Scope**: All authenticated users
- **Policy**: `(auth.uid() = id)`
- **Use Case**: Users can always view their own data

#### `users_view_for_scheduler` (SELECT) ⭐ **NEW**
- **Scope**: All authenticated users
- **Policy**: `(EXISTS (SELECT 1 FROM bookings WHERE bookings.user_id = users.id))`
- **Use Case**: **Enables cross-member visibility in scheduler** - allows all users to see basic user info (name, email) for users who have bookings

#### `users_update_all` (UPDATE)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can update any user data

#### `users_update_own` (UPDATE)
- **Scope**: All authenticated users
- **Policy**: `(auth.uid() = id)`
- **Use Case**: Users can update their own data

### Aircraft Table

Aircraft data is generally readable by all users but only editable by privileged roles:

#### `aircraft_read_all` (SELECT)
- **Scope**: All users
- **Policy**: `true`
- **Use Case**: All users can view aircraft for booking purposes

#### `aircraft_insert_restricted` (INSERT)
- **Scope**: Admin/owner/instructor roles
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Only privileged users can add new aircraft

#### `aircraft_update_restricted` (UPDATE)
- **Scope**: Admin/owner/instructor roles
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Only privileged users can modify aircraft

#### `aircraft_delete_restricted` (DELETE)
- **Scope**: Admin/owner/instructor roles
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Only privileged users can delete aircraft

### Instructors Table

Instructor data follows similar patterns to aircraft:

#### `instructors_read_all` (SELECT)
- **Scope**: All users
- **Policy**: `true`
- **Use Case**: All users can view instructor information for booking purposes

#### `instructors_insert_restricted` (INSERT)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can add new instructors

#### `instructors_update_restricted` (UPDATE)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can modify instructor data

#### `instructors_delete_restricted` (DELETE)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can delete instructors

### Flight Types Table

Flight types are managed by administrators only:

#### `flight_types_read_all` (SELECT)
- **Scope**: All users
- **Policy**: `true`
- **Use Case**: All users can view flight types for booking purposes

#### `flight_types_manage` (ALL)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can manage flight types

### Lessons Table

Lessons are managed by administrators only:

#### `lessons_manage` (ALL)
- **Scope**: Admin/owner roles only
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])`
- **Use Case**: Only administrators can manage lessons

### Observations Table

Observations can be managed by instructors and above:

#### `observations_manage` (ALL)
- **Scope**: Admin/owner/instructor roles
- **Policy**: `check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])`
- **Use Case**: Instructors and administrators can manage safety observations

### Roster Rules Table

Roster management has complex policies allowing instructors to manage their own rules:

#### `roster_rules_read_all` (SELECT)
- **Scope**: All users
- **Policy**: `true`
- **Use Case**: All users can view roster rules for scheduling

#### `Admins and owners can manage all roster rules` (ALL)
- **Scope**: Admin/owner roles
- **Policy**: Complex role check via user_roles table
- **Use Case**: Administrators can manage all roster rules

#### `Instructors can manage their own roster rules` (ALL)
- **Scope**: Instructors for their own rules
- **Policy**: `(instructor_id IN (SELECT instructors.id FROM instructors WHERE instructors.user_id = auth.uid()))`
- **Use Case**: Instructors can manage their own roster rules

### Shift Overrides Table

Similar to roster rules, with instructor self-management:

#### `shift_overrides_read_all` (SELECT)
- **Scope**: All users
- **Policy**: `true`
- **Use Case**: All users can view shift overrides

#### `Admins and owners can manage all shift overrides` (ALL)
- **Scope**: Admin/owner roles
- **Policy**: Complex role check via user_roles table
- **Use Case**: Administrators can manage all shift overrides

#### `Instructors can manage their own shift overrides` (ALL)
- **Scope**: Instructors for their own overrides
- **Policy**: `(instructor_id IN (SELECT instructors.id FROM instructors WHERE instructors.user_id = auth.uid()))`
- **Use Case**: Instructors can manage their own shift overrides

## Frontend Role Protection

### Hooks and Components

#### `useIsRestrictedUser()`
- **Purpose**: Determines if current user has restricted access (member/student)
- **Returns**: `{ isRestricted: boolean, userRole: string, isLoading: boolean, error: any }`
- **Usage**: Controls UI visibility and functionality

#### `useCurrentUserRoles()`
- **Purpose**: Fetches current user's primary role
- **API**: `/api/users/me/roles`
- **Returns**: `{ user_id: string, role: string }`
- **Usage**: Role-based UI decisions

#### `useRoleProtection(options)`
- **Purpose**: Page-level role protection
- **Options**: `{ allowedRoles: string[], redirectTo?: string, onUnauthorized?: function }`
- **Usage**: Protects entire pages based on role requirements

### Scheduler-Specific Logic

#### Booking Display Name Logic
The scheduler uses a priority-based system for displaying booking names:

1. **Priority 1**: Member names (first_name + last_name) - **Always visible to all roles**
2. **Priority 2**: Email address - Fallback if no name
3. **Priority 3**: User ID (first 8 chars) - If user data missing due to RLS
4. **Priority 4**: Booking purpose/description - If no member exists
5. **Priority 5**: "Flight" - Final fallback

This ensures that:
- Member names are always visible for scheduling purposes
- Cross-member visibility works properly
- Graceful fallbacks handle edge cases

## API Endpoint Security

### Bookings API (`/api/bookings`)

#### GET (View Bookings)
- **Authentication**: Required
- **Authorization**: All authenticated users can view bookings
- **Special Logic**: Single booking view has additional permission checks
- **RLS**: Uses `bookings_scheduler_view` policy

#### POST (Create Booking)
- **Authentication**: Required
- **Authorization**: Users can create their own bookings OR admin/owner/instructor can create any
- **Validation**: Conflict checking, instructor type rating validation
- **RLS**: Uses `bookings_insert` policy

#### PATCH (Update Booking)
- **Authentication**: Required
- **Authorization**: Users can update their own bookings OR admin/owner/instructor can update any
- **Validation**: Conflict checking, instructor type rating validation
- **RLS**: Uses `bookings_update` policy

### Users API (`/api/users/me/roles`)

#### GET (Current User Role)
- **Authentication**: Required
- **Authorization**: Users can only get their own role
- **Function**: Uses `get_user_role()` database function
- **Purpose**: Provides role information for frontend decisions

## Security Considerations

### Cross-Member Visibility
- **Requirement**: Members need to see other members' names in scheduler
- **Solution**: `users_view_for_scheduler` RLS policy
- **Scope**: Only users with bookings are visible
- **Data Exposed**: Basic info (id, first_name, last_name, email)

### Data Privacy
- **Sensitive Data**: Full user profiles only visible to admin/owner/instructor
- **Scheduler Data**: Only basic identification info exposed
- **Audit Trail**: All role changes and permission checks are logged

### Performance
- **RLS Overhead**: Policies are optimized for common query patterns
- **Caching**: Frontend caches role information for 5 minutes
- **Indexing**: Database indexes support efficient role checking

## Common Access Patterns

### Member/Student Access
- ✅ View all bookings in scheduler
- ✅ See member names for all bookings
- ✅ Create their own bookings
- ✅ Edit their own bookings
- ✅ View aircraft and instructor information
- ❌ Edit other members' bookings
- ❌ Delete bookings
- ❌ Manage aircraft/instructors

### Instructor Access
- ✅ All member/student permissions
- ✅ View all user data
- ✅ Create bookings for any member
- ✅ Edit any booking
- ✅ Manage roster rules for themselves
- ✅ Manage shift overrides for themselves
- ✅ Override flight authorizations
- ❌ Delete bookings
- ❌ Manage aircraft/instructors

### Admin/Owner Access
- ✅ All instructor permissions
- ✅ Delete bookings
- ✅ Manage aircraft
- ✅ Manage instructors
- ✅ Manage all roster rules
- ✅ Manage all shift overrides
- ✅ Full user management

## Troubleshooting

### Common Issues

#### "UUIDs showing instead of names"
- **Cause**: RLS blocking user data access
- **Solution**: Ensure `users_view_for_scheduler` policy is active
- **Check**: Verify user has bookings (policy requirement)

#### "Permission denied errors"
- **Cause**: RLS policy blocking access
- **Solution**: Check user role and policy requirements
- **Debug**: Use `get_user_role()` function to verify role

#### "Role not updating in UI"
- **Cause**: Frontend cache not invalidated
- **Solution**: Check cache settings in `useCurrentUserRoles`
- **Debug**: Check browser network tab for API calls

### Debugging Tools

#### Database Functions
```sql
-- Check user's current role
SELECT get_user_role('user-uuid-here');

-- Check if user has specific role
SELECT check_user_role_simple('user-uuid-here', ARRAY['admin', 'instructor']);

-- View all user roles
SELECT r.name FROM user_roles ur 
JOIN roles r ON ur.role_id = r.id 
WHERE ur.user_id = 'user-uuid-here' AND ur.is_active = true;
```

#### API Testing
```bash
# Test current user role endpoint
curl -H "Authorization: Bearer <token>" /api/users/me/roles

# Test bookings endpoint
curl -H "Authorization: Bearer <token>" /api/bookings?date=2024-01-01
```

## Best Practices

### Development
1. Always test with different user roles
2. Use the role checking functions consistently
3. Implement proper error handling for permission failures
4. Cache role information appropriately

### Security
1. Never rely solely on frontend role checks
2. Always validate permissions server-side
3. Use the principle of least privilege
4. Regular audit of RLS policies

### Performance
1. Optimize RLS policies for common queries
2. Use appropriate database indexes
3. Cache role information on frontend
4. Monitor query performance

## Conclusion

The scheduler permissions system provides a robust, multi-layered security approach that balances functionality with security. The key innovation is the `users_view_for_scheduler` policy that enables cross-member visibility while maintaining data privacy. This allows members to see who has bookings without exposing sensitive personal information, which is essential for effective flight scheduling in a training environment.

The system is designed to be both secure and user-friendly, with clear role hierarchies and comprehensive permission checking at every level. Regular auditing and testing ensure the system remains secure as it evolves.
