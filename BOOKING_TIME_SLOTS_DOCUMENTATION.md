# Booking Time Slots & Default Duration System Documentation

## Overview

The Aero Safety application includes a comprehensive booking time management system that allows administrators to configure custom time slots and set default booking durations. This system ensures consistent booking practices and provides flexibility for different operational needs.

## System Architecture

### Database Layer
- **Settings Table**: Stores time slot configurations and default duration
- **Settings Categories**: `bookings` category contains all booking-related settings
- **Row-Level Security**: Admin-only write access, authenticated user read access

### Frontend Components
- **TimeSlotConfiguration**: Main UI for managing time slots and duration
- **NewBookingModal**: Uses settings for automatic end time calculation
- **SettingsProvider**: Provides settings context throughout the application

## Configuration Options

### 1. Default Booking Duration

**Setting Key**: `default_booking_duration_hours`
**Data Type**: `number`
**Description**: Default duration for new bookings in hours
**Default Value**: `2` (2 hours)
**Range**: `0.5` to `12` hours (with 0.5-hour increments)
**Access**: Public (readable by all authenticated users, writable by admins only)

**Usage Examples**:
- `2` = 2 hours default booking duration
- `1.5` = 1 hour 30 minutes default booking duration
- `4` = 4 hours default booking duration

### 2. Custom Time Slots

**Setting Key**: `custom_time_slots`
**Data Type**: `array`
**Description**: Custom time slots for bookings (array of time ranges)
**Default Value**: `[]` (empty array - allows bookings at any time)
**Access**: Public (readable by all authenticated users, writable by admins only)

**Time Slot Structure**:
```typescript
interface TimeSlot {
  name: string;           // Display name (e.g., "Morning Session")
  start_time: string;     // HH:MM format (e.g., "10:30")
  end_time: string;       // HH:MM format (e.g., "12:30")
  days: string[];         // Array of weekday names
}
```

**Weekday Options**:
- `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

## Configuration Interface

### Accessing Time Slot Configuration

1. Navigate to **Settings** → **Bookings** → **Time Slots** tab
2. Configure default booking duration using the number input
3. Add/edit custom time slots using the compact interface

### Default Booking Duration Configuration

**Location**: Time Slots tab, "Default Booking Duration" card
**Controls**:
- Number input (0.5-12 hours, 0.5-hour increments)
- Real-time preview showing duration in text format
- Auto-save functionality with user feedback

**Example Configuration**:
```
Default Duration (hours): [2] (2 hours)
```

### Custom Time Slots Configuration

**Location**: Time Slots tab, "Custom Time Slots" card

**Compact Row View**:
- Shows: Name, Time Range, Days Summary
- Expandable for detailed editing
- Delete button always visible

**Smart Day Display**:
- "Every day" for all 7 days
- "Weekdays" for Monday-Friday
- "Weekends" for Saturday-Sunday
- "Mon, Tue, Wed" for 3 or fewer days
- "5 days" for other combinations

**Expanded View** (click chevron to expand):
- Name input field
- Start time picker (HH:MM format)
- End time picker (HH:MM format)
- Day selection checkboxes (all 7 weekdays)
- Validation error display

## How It Works

### 1. Default Duration Logic

**Automatic End Time Calculation**:
When a user selects a start time in the New Booking Modal:

1. System fetches `default_booking_duration_hours` from settings
2. Calculates end time: `startTime + durationHours`
3. Updates end time field automatically
4. Respects time boundaries (won't exceed 23:30)

**Calculation Examples**:
```
Start Time: 10:30 + Duration: 2 hours = End Time: 12:30
Start Time: 14:00 + Duration: 1.5 hours = End Time: 15:30
Start Time: 22:00 + Duration: 2 hours = End Time: 23:30 (capped)
```

### 2. Custom Time Slots Logic

**Booking Availability Rules**:
- If no custom time slots configured: Bookings available at any time during business hours
- If custom time slots configured: Bookings only available during defined time periods
- Time slots can overlap and span multiple days
- Each time slot can have different day availability

**Time Slot Validation**:
- Name is required
- Start time must be before end time
- At least one day must be selected
- Time format must be valid (HH:MM)

### 3. Integration Points

**NewBookingModal Integration**:
- Automatically calculates end time based on default duration
- Uses settings context for real-time updates
- Works in both regular booking and trial flight modes

**Settings System Integration**:
- Uses existing settings infrastructure
- Automatic caching and invalidation
- Real-time updates across components
- Proper error handling and fallbacks

## Technical Implementation

### Database Schema

```sql
-- Settings table structure
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR NOT NULL,           -- 'bookings'
  setting_key VARCHAR NOT NULL,        -- 'default_booking_duration_hours' or 'custom_time_slots'
  setting_value JSONB NOT NULL,        -- Numeric value or array of time slots
  data_type VARCHAR NOT NULL,          -- 'number' or 'array'
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  validation_schema JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);
```

### API Endpoints

**Get Settings**:
```
GET /api/settings?category=bookings
```

**Update Individual Setting**:
```
PUT /api/settings/bookings/default_booking_duration_hours
PUT /api/settings/bookings/custom_time_slots
```

### React Components

**TimeSlotConfiguration Component**:
- Manages time slot state and validation
- Provides expandable row interface
- Handles save/reset operations
- Real-time form validation

**NewBookingModal Integration**:
- Uses `useSettingsContext()` hook
- Calculates end time automatically
- Handles edge cases and validation
- Provides fallback values

### Settings Context

**SettingsProvider**:
- Provides settings throughout application
- Handles caching and invalidation
- Type-safe settings access
- Category-specific convenience hooks

**Usage Example**:
```typescript
const { getSettingValue } = useSettingsContext();
const defaultDuration = getSettingValue('bookings', 'default_booking_duration_hours', 2);
```

## User Workflows

### 1. Setting Up Default Booking Duration

1. Go to Settings → Bookings → Time Slots
2. Locate "Default Booking Duration" section
3. Enter desired duration (e.g., 2 for 2 hours)
4. Click "Save Changes"
5. Changes apply immediately to new bookings

### 2. Creating Custom Time Slots

1. Go to Settings → Bookings → Time Slots
2. Click "Add Time Slot" button
3. Configure time slot:
   - Enter name (e.g., "Morning Session")
   - Set start time (e.g., 10:30)
   - Set end time (e.g., 12:30)
   - Select available days
4. Click "Save Changes"
5. Time slots become active immediately

### 3. Using Time Slots in Bookings

**With Default Duration Only**:
1. Open New Booking Modal
2. Select start date and time
3. End time automatically calculated based on default duration
4. Complete remaining booking details

**With Custom Time Slots**:
1. Custom time slots restrict available booking times
2. Users can only create bookings within defined time periods
3. Default duration still applies within those time slots

## Validation Rules

### Time Slot Validation

**Required Fields**:
- Name (non-empty string)
- Start time (HH:MM format)
- End time (HH:MM format)
- At least one day selected

**Business Rules**:
- Start time must be before end time
- Time format must be valid (HH:MM)
- Days must be valid weekday names

### Default Duration Validation

**Range Validation**:
- Minimum: 0.5 hours
- Maximum: 12 hours
- Increment: 0.5 hours

**Type Validation**:
- Must be a valid number
- Must be within specified range

## Error Handling

### Settings Context Errors

**Fallback Behavior**:
- If SettingsProvider not available: Uses default values
- If settings not loaded: Uses cached values
- If API errors: Shows error messages with retry options

### Time Calculation Errors

**Boundary Handling**:
- Prevents end time from exceeding 23:30
- Handles invalid time formats gracefully
- Provides clear error messages

### Validation Errors

**Real-time Validation**:
- Shows errors immediately as user types
- Prevents saving invalid configurations
- Provides helpful error messages

## Performance Considerations

### Caching Strategy

**Settings Caching**:
- 5-minute stale time
- 10-minute cache time
- Automatic invalidation on updates

**Component Optimization**:
- Memoized calculations
- Efficient re-renders
- Lazy loading of settings

### Database Optimization

**Indexes**:
- Settings table indexed by category and key
- Efficient queries for settings retrieval

**Query Optimization**:
- Batch updates for multiple settings
- Optimistic UI updates

## Security Considerations

### Access Control

**Row-Level Security**:
- Admin-only write access to settings
- Authenticated user read access
- Proper audit logging

**Input Validation**:
- Server-side validation of all inputs
- Type checking and range validation
- SQL injection prevention

### Data Protection

**Settings Data**:
- Encrypted in transit
- Proper backup and recovery
- Audit trail for all changes

## Troubleshooting

### Common Issues

**Settings Not Loading**:
1. Check if SettingsProvider is wrapping the component
2. Verify user has proper permissions
3. Check browser console for errors

**Time Calculation Errors**:
1. Verify default duration setting is valid
2. Check time format (must be HH:MM)
3. Ensure time boundaries are respected

**Time Slots Not Working**:
1. Verify time slot configuration is valid
2. Check day selection is not empty
3. Ensure start time is before end time

### Debug Information

**Console Logging**:
- Settings loading status
- Time calculation steps
- Validation errors

**Error Messages**:
- Clear, actionable error messages
- Context about what went wrong
- Suggestions for fixing issues

## Future Enhancements

### Planned Features

**Advanced Time Slots**:
- Recurring time slots
- Holiday exceptions
- Seasonal schedules

**Duration Options**:
- Multiple default durations by booking type
- Instructor-specific durations
- Aircraft-specific durations

**Analytics**:
- Booking pattern analysis
- Time slot utilization reports
- Duration optimization suggestions

### Integration Opportunities

**Calendar Integration**:
- Google Calendar sync
- Outlook integration
- iCal export

**Notification System**:
- Time slot availability alerts
- Duration change notifications
- Booking conflict warnings

## API Reference

### Settings API

**Get All Booking Settings**:
```http
GET /api/settings?category=bookings
Authorization: Bearer <token>
```

**Response**:
```json
{
  "settings": [
    {
      "id": "uuid",
      "category": "bookings",
      "setting_key": "default_booking_duration_hours",
      "setting_value": 2,
      "data_type": "number",
      "description": "Default duration for new bookings in hours",
      "is_public": true,
      "is_required": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "category": "bookings", 
      "setting_key": "custom_time_slots",
      "setting_value": [
        {
          "name": "Morning Session",
          "start_time": "10:30",
          "end_time": "12:30",
          "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
        }
      ],
      "data_type": "array",
      "description": "Custom time slots for bookings",
      "is_public": true,
      "is_required": false,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 2
}
```

**Update Setting**:
```http
PUT /api/settings/bookings/default_booking_duration_hours
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "setting_value": 2.5
}
```

**Response**:
```json
{
  "setting": {
    "id": "uuid",
    "category": "bookings",
    "setting_key": "default_booking_duration_hours", 
    "setting_value": 2.5,
    "data_type": "number",
    "description": "Default duration for new bookings in hours",
    "is_public": true,
    "is_required": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

## Version History

### Version 1.0 (Current)
- Initial implementation of time slot system
- Default booking duration functionality
- Compact, expandable UI interface
- Settings integration with caching
- Real-time validation and error handling

### Planned Versions

**Version 1.1**:
- Bulk time slot operations
- Time slot templates
- Advanced scheduling rules

**Version 1.2**:
- Analytics and reporting
- Calendar integration
- Mobile optimization

---

*This documentation covers the complete booking time slots and default duration system. For additional support or feature requests, please refer to the development team.*
