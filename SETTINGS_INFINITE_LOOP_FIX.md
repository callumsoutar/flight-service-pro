# Settings Infinite Re-render Loop Fix

## Issue Description
The settings system was causing a "Maximum update depth exceeded" error due to an infinite re-render loop in the React components. This was happening because functions were being recreated on every render, causing `useEffect` hooks to run continuously.

## Root Cause Analysis

### The Problem
1. **Non-memoized functions**: The `getSettingValue`, `updateSettingValue`, and `bulkUpdate` functions in `useSettingsManager` were being recreated on every render
2. **Unstable dependencies**: These functions were included in `useEffect` dependency arrays, causing the effects to run infinitely
3. **Context value recreation**: The `SettingsContext` value was being recreated on every render without proper memoization

### How it caused the loop
```typescript
// Before fix - BAD ❌
const getSettingValue = (key: string, defaultValue?: any) => {
  // Function recreated on every render
};

React.useEffect(() => {
  // This effect runs on every render because getSettingValue changes
  setFormData({...});
}, [settings, getSettingValue]); // getSettingValue changes every render
```

## Solution Applied

### 1. Memoized Functions in `useSettingsManager`
Added `useCallback` to memoize functions and prevent unnecessary recreations:

```typescript
// After fix - GOOD ✅
const getSettingValue = useCallback((key: string, defaultValue?: any) => {
  // Function only recreates when settings change
}, [settings]);

const updateSettingValue = useCallback(async (key: string, value: any) => {
  // Stable function reference
}, [category, updateMutation]);

const bulkUpdate = useCallback(async (updates: Record<string, any>) => {
  // Stable function reference  
}, [category, updateMutation]);
```

### 2. Optimized Settings Context
Added proper memoization to the `SettingsContext`:

```typescript
// Before fix - BAD ❌
const contextValue: SettingsContextType = {
  settings,
  isLoading,
  error,
  getSettingValue, // Function recreated every render
  getTypedSettings, // Function recreated every render
  refetch,
};

// After fix - GOOD ✅
const getSettingValue = useCallback((...) => {...}, [settings]);
const getTypedSettings = useCallback((...) => {...}, [settings]);

const contextValue: SettingsContextType = useMemo(() => ({
  settings,
  isLoading,
  error,
  getSettingValue,
  getTypedSettings,
  refetch,
}), [settings, isLoading, error, getSettingValue, getTypedSettings, refetch]);
```

### 3. Fixed Dependencies in GeneralTab
The `useEffect` in GeneralTab now uses the properly memoized `getSettingValue`:

```typescript
// After fix - GOOD ✅
React.useEffect(() => {
  if (settings) {
    setFormData({
      school_name: getSettingValue('school_name', ''),
      // ... other fields
    });
  }
}, [settings, getSettingValue]); // getSettingValue is now stable
```

## Benefits of the Fix

1. **Performance**: Eliminates unnecessary re-renders and function recreations
2. **Stability**: Functions have stable references, preventing infinite loops
3. **Predictability**: Effects only run when their actual dependencies change
4. **Memory**: Reduces garbage collection pressure from constantly recreated functions

## Files Modified

1. **`/src/hooks/use-settings.ts`**
   - Added `useCallback` import
   - Memoized `getSettingValue`, `updateSettingValue`, and `bulkUpdate` functions

2. **`/src/contexts/SettingsContext.tsx`**
   - Added `useCallback` and `useMemo` imports
   - Memoized `getSettingValue` and `getTypedSettings` functions
   - Memoized context value object

3. **`/src/components/settings/GeneralTab.tsx`**
   - Updated comment to reflect the fix
   - Dependencies are now stable

## Prevention Guidelines

To prevent similar issues in the future:

1. **Always memoize functions** that are used in `useEffect` dependencies
2. **Use `useCallback`** for functions that are passed to child components or used in effects
3. **Use `useMemo`** for complex calculated values or context objects
4. **Be mindful of dependency arrays** - only include values that should trigger re-runs
5. **Test for infinite loops** by watching for excessive console logs or performance issues

## Verification

After applying this fix:
- ✅ No more "Maximum update depth exceeded" errors
- ✅ Settings load and display correctly
- ✅ Form updates work without infinite loops
- ✅ API calls are made efficiently without constant re-fetching
- ✅ No linting errors or warnings
