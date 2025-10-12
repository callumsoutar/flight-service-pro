import { useSetting } from '@/hooks/use-settings';

/**
 * Hook to check if flight authorization is required for solo flights
 * @returns boolean indicating if flight authorization is required (defaults to true)
 *
 * OPTIMIZED: Uses useSetting to query only the specific setting instead of all bookings settings
 */
export const useFlightAuthorizationSetting = () => {
  const { data: setting, isLoading } = useSetting('bookings', 'require_flight_authorization_for_solo');

  // Parse the setting value, defaulting to true if not found
  const requireFlightAuthorization = setting?.setting_value !== undefined
    ? Boolean(setting.setting_value)
    : true;

  return {
    requireFlightAuthorization,
    isLoading
  };
};
