# Bulk Bookings (Recurring Bookings) Feature Documentation

## Overview

The Bulk Bookings feature allows users to create multiple recurring bookings in a single operation. Instead of manually creating individual bookings for repeating schedule patterns (e.g., weekly lessons), users can specify a pattern once and automatically generate multiple bookings.

## Feature Location

**Component**: `src/components/bookings/NewBookingModal.tsx`
**UI Location**: Available in the New Booking Modal as a toggle switch labeled "Recurring Booking"

## How It Works

### 1. User Interface

When users enable the "Recurring Booking" toggle, additional fields appear:

- **Day Selection**: Checkboxes for Monday through Sunday
- **Until Date**: Date picker to specify when the recurring pattern should end
- **Conflict Handling**: Radio buttons with options:
  - **Skip conflicts**: Skip dates where conflicts exist
  - **Stop on conflict**: Stop creating bookings when first conflict is encountered
  - **Ask for each conflict**: (Future enhancement - currently treated as skip)

### 2. Validation

Before creating recurring bookings, the system validates:

- At least one day must be selected
- Until date must be provided and after the start date
- All standard booking validation (aircraft, times, etc.) applies

### 3. Date Generation

The `generateRecurringDates()` function:
1. Takes the start date, until date, and selected days of the week
2. Iterates through each date from start to until date
3. Includes dates that match the selected days of the week
4. Returns an array of Date objects representing all booking dates

### 4. Conflict Detection

For each generated date, the system:
1. Uses `checkConflictForDateTime()` to check for resource conflicts
2. Compares against existing bookings for the same:
   - Aircraft at the specified time
   - Instructor at the specified time (if selected)
3. Handles conflicts based on user preference

### 5. Bulk Creation Process

The system creates bookings sequentially with:
- **Progress tracking**: Real-time updates showing current/total progress
- **Error handling**: Counts conflicts, errors, and successful creations
- **Rate limiting**: 50ms delay between requests to avoid server overload
- **Email suppression**: Uses `skip_email=true` parameter to prevent individual emails

### 6. Email Notifications

Instead of sending individual emails for each booking:
- Individual booking emails are suppressed during bulk creation
- A single summary notification is logged via `/api/bookings/bulk-notification`
- Summary includes: booking count, date range, days, times, aircraft, instructor

## Technical Implementation

### Core Functions

#### `generateRecurringDates(startDate, untilDate, selectedDays)`
```javascript
// Generates array of dates matching the selected days pattern
const dates = [];
const dayNameToNumber = { sunday: 0, monday: 1, tuesday: 2, ... };
// Iterates through date range, filtering by selected days
```

#### `checkConflictForDateTime(date, startTime, endTime)`
```javascript
// Checks for resource conflicts on a specific date/time
// Returns true if aircraft or instructor conflicts exist
// Compares against active bookings (unconfirmed, confirmed, briefing, flying)
```

#### Bulk Creation Logic
```javascript
for (let i = 0; i < recurringDates.length && !shouldStop; i++) {
  // 1. Update progress
  // 2. Check for conflicts
  // 3. Handle conflicts based on user preference
  // 4. Create booking with skip_email=true
  // 5. Track success/failure counts
  // 6. Small delay between requests
}
```

### API Modifications

#### `/api/bookings` POST Route
- Added `skip_email` query parameter support
- When `skip_email=true`, email sending is bypassed
- Maintains all other booking creation logic

#### `/api/bookings/bulk-notification` POST Route
- New endpoint for summary notifications
- Logs bulk booking details instead of sending emails
- Includes comprehensive booking summary information

### Database Schema

**No database changes required** - the feature uses existing booking table structure:
- Each recurring booking creates individual `bookings` records
- Maintains standard relationships (user, aircraft, instructor, etc.)
- Uses existing status and conflict detection systems

## User Experience Flow

1. **User opens New Booking Modal**
2. **Fills standard booking fields** (aircraft, time, etc.)
3. **Toggles "Recurring Booking" switch**
4. **Selects days of the week** (checkboxes)
5. **Sets until date** (date picker)
6. **Chooses conflict handling** (radio buttons)
7. **Clicks "Save" or "Save & Confirm"**
8. **System shows progress indicator** with real-time updates
9. **Completion summary displayed** showing created/conflicts/errors
10. **Modal closes after 2 seconds** if bookings were created successfully

## Progress Tracking

The system provides real-time feedback during bulk creation:

```typescript
interface RecurringProgress {
  total: number;      // Total bookings to create
  current: number;    // Current booking being processed
  created: number;    // Successfully created bookings
  conflicts: number;  // Bookings skipped due to conflicts
  errors: number;     // Bookings failed due to errors
}
```

## Conflict Handling Strategies

### Skip Conflicts (Default)
- Continues processing all dates
- Skips dates with resource conflicts
- Creates all non-conflicting bookings

### Stop on Conflict
- Stops processing when first conflict is encountered
- Creates bookings up to the conflict point
- Useful for strict scheduling requirements

### Ask for Each Conflict (Future Enhancement)
- Currently treated as "Skip Conflicts"
- Future: Could show modal for each conflict with options to:
  - Skip this date
  - Stop processing
  - Override/force booking

## Performance Considerations

- **Sequential creation**: Bookings created one at a time to maintain data integrity
- **Rate limiting**: 50ms delay between requests prevents server overload
- **Email optimization**: Bulk notification prevents rate limiting issues
- **Progress updates**: Real-time feedback keeps users informed
- **Error resilience**: Individual failures don't stop the entire process

## Error Handling

The system gracefully handles various error scenarios:

- **Validation errors**: Shown immediately before creation starts
- **Individual booking failures**: Counted as errors but don't stop process
- **Conflict detection**: Handled per user preference
- **Network issues**: Individual request failures are counted and reported
- **Email failures**: Bulk notification failures don't affect booking creation

## Logging and Auditing

### Server Logs
- Individual booking creation results
- Bulk notification summaries with full details
- Conflict detection and resolution actions
- Performance metrics (timing, success rates)

### Database Records
- Each booking creates standard database record
- No special bulk booking identifiers (maintains simplicity)
- Standard audit trails through existing booking system

## Future Enhancements

### Potential Improvements
1. **Interactive conflict resolution**: Modal dialogs for each conflict
2. **Batch email optimization**: Single email with all booking details
3. **Bulk booking templates**: Save recurring patterns for reuse
4. **Advanced patterns**: Every 2 weeks, monthly patterns, etc.
5. **Bulk operations**: Edit/cancel multiple recurring bookings at once

### Technical Enhancements
1. **Parallel creation**: Process multiple bookings simultaneously
2. **Rollback capability**: Undo partial bulk creation on errors
3. **Smarter conflict detection**: Suggest alternative times/aircraft
4. **Progress persistence**: Resume interrupted bulk operations

## Testing Considerations

When testing bulk bookings:

1. **Small batches first**: Test with 2-3 bookings initially
2. **Conflict scenarios**: Create existing bookings to test conflict handling
3. **Error conditions**: Test network failures, validation errors
4. **Progress tracking**: Verify real-time updates work correctly
5. **Email suppression**: Confirm no individual emails are sent
6. **Performance**: Test with larger date ranges (weeks/months)

## Troubleshooting

### Common Issues

**Progress indicator stuck**: Usually indicates network timeout or server error
**Some bookings missing**: Check conflict handling strategy and existing bookings
**Email spam**: Verify skip_email parameter is working correctly
**Slow creation**: Normal for large batches due to rate limiting delays

### Debug Information

Check browser console and server logs for:
- Individual booking creation responses
- Conflict detection results
- Bulk notification API calls
- Error messages and stack traces

## Conclusion

The Bulk Bookings feature provides a robust, user-friendly way to create recurring bookings while maintaining data integrity and system performance. The implementation balances functionality with simplicity, using existing database structures and extending the current booking system seamlessly.