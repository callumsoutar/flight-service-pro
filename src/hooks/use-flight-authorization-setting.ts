import { useSettingsManager } from '@/hooks/use-settings';

/**
 * Hook to check if flight authorization is required for solo flights
 * @returns boolean indicating if flight authorization is required (defaults to true)
 */
export const useFlightAuthorizationSetting = () => {
  const { getSettingValue, isLoading } = useSettingsManager('bookings');
  
  const requireFlightAuthorization = getSettingValue('require_flight_authorization_for_solo', true);
  
  return {
    requireFlightAuthorization,
    isLoading
  };
};
