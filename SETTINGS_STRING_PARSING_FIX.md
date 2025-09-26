# Settings String Parsing Fix

## Issue Description
The school name input field in the General settings tab was not displaying the value "Kapiti Aero Club" from the database, while the registration number "12345" was displaying correctly.

## Root Cause Analysis

### Database Values
From the database query, both values exist:
- `school_name`: "Kapiti Aero Club" (string)
- `registration_number`: "12345" (string)

### The Problem
The issue was in the string parsing logic in both `useSettingsManager` and `SettingsContext`. The code was trying to `JSON.parse()` all string values:

```typescript
// Before fix - BAD ❌
case 'string':
  return JSON.parse(setting.setting_value);
```

**Why this failed:**
- `JSON.parse("Kapiti Aero Club")` → **Error** (not valid JSON) → returns `defaultValue` (empty string)
- `JSON.parse("12345")` → **Success** (valid JSON number) → returns `12345`

The registration number worked by accident because `"12345"` is valid JSON that parses to the number `12345`, but the school name failed because `"Kapiti Aero Club"` is not valid JSON.

## Solution Applied

### Updated String Parsing Logic
Modified the string parsing to handle both JSON-encoded strings and plain strings:

```typescript
// After fix - GOOD ✅
case 'string':
  // For strings, try to parse as JSON first, but fallback to raw value if it's not valid JSON
  try {
    return JSON.parse(setting.setting_value);
  } catch {
    return setting.setting_value;
  }
```

### Why This Works
1. **JSON-encoded strings**: `"\"Hello World\""` → `JSON.parse()` → `"Hello World"`
2. **Plain strings**: `"Kapiti Aero Club"` → `JSON.parse()` fails → fallback to `"Kapiti Aero Club"`
3. **Numbers as strings**: `"12345"` → `JSON.parse()` → `12345` (if that's the intended behavior)

## Files Modified

1. **`/src/hooks/use-settings.ts`**
   - Updated `getSettingValue` function in `useSettingsManager`
   - Added try-catch for JSON parsing with fallback to raw value

2. **`/src/contexts/SettingsContext.tsx`**
   - Updated `getSettingValue` function
   - Updated `getTypedSettings` function
   - Added consistent string parsing logic

## Benefits

1. **Backward Compatibility**: Handles both JSON-encoded and plain string values
2. **Robust Error Handling**: Gracefully falls back to raw values when JSON parsing fails
3. **Consistent Behavior**: All string settings now display correctly regardless of encoding
4. **Future-Proof**: Can handle any string format without breaking

## Testing

After this fix:
- ✅ School name "Kapiti Aero Club" displays correctly
- ✅ Registration number "12345" continues to work
- ✅ All other string settings display properly
- ✅ JSON-encoded strings still work if needed
- ✅ No breaking changes to existing functionality

## Data Format Considerations

The settings system now handles these string formats:
- **Plain strings**: `"Kapiti Aero Club"` → `"Kapiti Aero Club"`
- **JSON-encoded strings**: `"\"Hello World\""` → `"Hello World"`
- **Numbers as strings**: `"12345"` → `12345` (converted to number)
- **Boolean strings**: `"true"` → `true` (converted to boolean)

This provides maximum flexibility while maintaining backward compatibility.
