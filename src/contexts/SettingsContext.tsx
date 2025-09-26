"use client";
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Setting, SettingCategory, AllSettings } from '@/types/settings';
import { useSettings } from '@/hooks/use-settings';

interface SettingsContextType {
  settings: Setting[] | undefined;
  isLoading: boolean;
  error: Error | null;
  getSettingValue: <T = string | number | boolean | object>(category: SettingCategory, key: string, defaultValue?: T) => T;
  getTypedSettings: <T extends SettingCategory>(category: T) => Partial<AllSettings[T]>;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { data: settings, isLoading, error, refetch } = useSettings() as { data: Setting[], isLoading: boolean, error: Error | null, refetch: () => void };

  const getSettingValue = useCallback(<T = string | number | boolean | object>(
    category: SettingCategory, 
    key: string, 
    defaultValue?: T
  ): T => {
    const setting = settings ? settings.find(s => s.category === category && s.setting_key === key) : undefined;
    if (!setting) return defaultValue as T;

    try {
      switch (setting.data_type) {
        case 'string':
          // For strings, try to parse as JSON first, but fallback to raw value if it's not valid JSON
          try {
            return JSON.parse(String(setting.setting_value)) as T;
          } catch {
            return setting.setting_value as T;
          }
        case 'number':
          return Number(setting.setting_value) as T;
        case 'boolean':
          return Boolean(setting.setting_value) as T;
        case 'object':
        case 'array':
          return setting.setting_value as T;
        default:
          return setting.setting_value as T;
      }
    } catch (error) {
      console.error('Error parsing setting value:', error);
      return defaultValue as T;
    }
  }, [settings]);

  const getTypedSettings = useCallback(<T extends SettingCategory>(
    category: T
  ): Partial<AllSettings[T]> => {
    if (!settings) return {} as Partial<AllSettings[T]>;

    const categorySettings = settings.filter(s => s.category === category);
    const result: Record<string, string | number | boolean | object> = {};

    categorySettings.forEach(setting => {
      try {
        switch (setting.data_type) {
          case 'string':
            // For strings, try to parse as JSON first, but fallback to raw value if it's not valid JSON
            try {
              result[setting.setting_key] = JSON.parse(String(setting.setting_value));
            } catch {
              result[setting.setting_key] = setting.setting_value;
            }
            break;
          case 'number':
            result[setting.setting_key] = Number(setting.setting_value);
            break;
          case 'boolean':
            result[setting.setting_key] = Boolean(setting.setting_value);
            break;
          case 'object':
          case 'array':
            result[setting.setting_key] = setting.setting_value;
            break;
          default:
            result[setting.setting_key] = setting.setting_value;
        }
      } catch (error) {
        console.error(`Error parsing setting ${setting.setting_key}:`, error);
      }
    });

    return result as Partial<AllSettings[T]>;
  }, [settings]);

  const contextValue: SettingsContextType = useMemo(() => ({
    settings,
    isLoading,
    error,
    getSettingValue,
    getTypedSettings,
    refetch,
  }), [settings, isLoading, error, getSettingValue, getTypedSettings, refetch]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};

// Convenience hooks for specific setting categories
export const useGeneralSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('general');
};

export const useSystemSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('system');
};

export const useNotificationSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('notifications');
};

export const useInvoicingSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('invoicing');
};

export const useBookingSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('bookings');
};

export const useTrainingSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('training');
};

export const useMaintenanceSettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('maintenance');
};

export const useSecuritySettings = () => {
  const { getTypedSettings } = useSettingsContext();
  return getTypedSettings('security');
};
