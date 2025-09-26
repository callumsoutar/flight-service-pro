# Booking Time Slots - Quick Reference Guide

## 🚀 Quick Start

### Configure Default Booking Duration
1. Go to **Settings** → **Bookings** → **Time Slots**
2. Set "Default Duration (hours)" to your preference (e.g., `2` for 2 hours)
3. Click **Save Changes**

### Add Custom Time Slots
1. Click **Add Time Slot**
2. Configure: Name, Start Time, End Time, Days
3. Click **Save Changes**

## ⚙️ Settings

### Database Settings
```sql
-- Default booking duration (in hours)
default_booking_duration_hours: number (default: 2)

-- Custom time slots array
custom_time_slots: array (default: [])
```

### Time Slot Structure
```typescript
interface TimeSlot {
  name: string;        // "Morning Session"
  start_time: string;  // "10:30" (HH:MM)
  end_time: string;    // "12:30" (HH:MM)
  days: string[];      // ["monday", "tuesday", ...]
}
```

## 🎯 How It Works

### Default Duration Logic
- **User selects start time** → **End time auto-calculated**
- **Example**: Start `10:30` + Duration `2 hours` = End `12:30`

### Custom Time Slots Logic
- **No time slots configured** → Bookings available at any time
- **Time slots configured** → Bookings restricted to defined periods

## 🔧 Development

### Key Components
- `TimeSlotConfiguration` - Settings UI component
- `NewBookingModal` - Uses settings for auto-calculation
- `SettingsProvider` - Provides settings context

### Key Files
```
src/components/settings/TimeSlotConfiguration.tsx
src/components/bookings/NewBookingModal.tsx
src/contexts/SettingsContext.tsx
src/types/settings.ts
```

### API Endpoints
```
GET /api/settings?category=bookings
PUT /api/settings/bookings/default_booking_duration_hours
PUT /api/settings/bookings/custom_time_slots
```

## 🐛 Troubleshooting

### Settings Not Loading
- Check if `SettingsProvider` wraps the component
- Verify user permissions (admin for write, authenticated for read)

### Time Calculation Issues
- Verify `default_booking_duration_hours` is a valid number
- Check time format is HH:MM
- Ensure end time doesn't exceed 23:30

### Time Slots Not Working
- Validate time slot configuration (name, times, days)
- Check start time is before end time
- Ensure at least one day is selected

## 📋 Common Configurations

### Standard Flight School (2-hour lessons)
```json
{
  "default_booking_duration_hours": 2,
  "custom_time_slots": []
}
```

### Multiple Time Slots (Morning & Afternoon)
```json
{
  "default_booking_duration_hours": 2,
  "custom_time_slots": [
    {
      "name": "Morning Session",
      "start_time": "08:30",
      "end_time": "12:30",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      "name": "Afternoon Session", 
      "start_time": "13:00",
      "end_time": "17:00",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
  ]
}
```

### Weekend Only Operations
```json
{
  "default_booking_duration_hours": 1.5,
  "custom_time_slots": [
    {
      "name": "Weekend Flying",
      "start_time": "09:00",
      "end_time": "16:00",
      "days": ["saturday", "sunday"]
    }
  ]
}
```

## 🔍 Validation Rules

### Default Duration
- **Range**: 0.5 to 12 hours
- **Increment**: 0.5 hours
- **Type**: Number

### Time Slots
- **Name**: Required, non-empty string
- **Times**: Valid HH:MM format
- **Logic**: Start time must be before end time
- **Days**: At least one day required

## 🚨 Error Messages

### Common Errors
- `"Name is required"` - Time slot name is empty
- `"Start time must be before end time"` - Invalid time range
- `"At least one day must be selected"` - No days selected
- `"Setting value is required"` - API validation error

### Debug Tips
- Check browser console for detailed error logs
- Verify network requests in Developer Tools
- Ensure settings are properly saved in database

---

**Full Documentation**: See [BOOKING_TIME_SLOTS_DOCUMENTATION.md](./BOOKING_TIME_SLOTS_DOCUMENTATION.md) for complete details.
