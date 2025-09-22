// Placeholder values for select components (shadcn doesn't allow empty strings)
export const PLACEHOLDER_VALUES = {
  AIRCRAFT: '__no_aircraft__',
  LESSON: '__no_lesson__',
  FLIGHT_TYPE: '__no_flight_type__',
  INSTRUCTOR: '__no_instructor__'
} as const;

// Helper function to check if a value is a placeholder
export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (!value) return false;
  return Object.values(PLACEHOLDER_VALUES).includes(value as typeof PLACEHOLDER_VALUES[keyof typeof PLACEHOLDER_VALUES]);
}