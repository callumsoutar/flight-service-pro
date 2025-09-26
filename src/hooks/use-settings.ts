import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { 
  Setting, 
  SettingCategory, 
  SettingsResponse, 
  SettingResponse,
  SettingsUpdateRequest 
} from '@/types/settings';

// API functions
const fetchSettings = async (category?: SettingCategory, publicOnly?: boolean): Promise<Setting[]> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (publicOnly) params.append('public', 'true');
  
  const response = await fetch(`/api/settings?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  
  const data: SettingsResponse = await response.json();
  return data.settings;
};

const fetchSetting = async (category: SettingCategory, key: string): Promise<Setting> => {
  const response = await fetch(`/api/settings/${category}/${key}`);
  if (!response.ok) {
    throw new Error('Failed to fetch setting');
  }
  
  const data: SettingResponse = await response.json();
  return data.setting;
};

const updateSetting = async (
  category: SettingCategory, 
  key: string, 
  update: SettingsUpdateRequest
): Promise<Setting> => {
  const response = await fetch(`/api/settings/${category}/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update setting');
  }
  
  const data: SettingResponse = await response.json();
  return data.setting;
};

const createSetting = async (setting: Partial<Setting>): Promise<Setting> => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(setting),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create setting');
  }
  
  const data: SettingResponse = await response.json();
  return data.setting;
};

const deleteSetting = async (category: SettingCategory, key: string): Promise<void> => {
  const response = await fetch(`/api/settings/${category}/${key}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete setting');
  }
};

// React hooks
export const useSettings = (category?: SettingCategory, publicOnly?: boolean) => {
  return useQuery({
    queryKey: ['settings', category, publicOnly],
    queryFn: () => fetchSettings(category, publicOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSetting = (category: SettingCategory, key: string) => {
  return useQuery({
    queryKey: ['setting', category, key],
    queryFn: () => fetchSetting(category, key),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ category, key, setting_value }: {
      category: SettingCategory;
      key: string;
      setting_value: string | number | boolean | object;
    }) => updateSetting(category, key, { setting_value }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting', variables.category, variables.key] });
      queryClient.invalidateQueries({ queryKey: ['settings', variables.category] });
    },
  });
};

export const useCreateSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSetting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', data.category] });
    },
  });
};

export const useDeleteSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ category, key }: { category: SettingCategory; key: string }) =>
      deleteSetting(category, key),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', variables.category] });
      queryClient.removeQueries({ queryKey: ['setting', variables.category, variables.key] });
    },
  });
};

// Helper hook for getting specific setting values with type safety
export const useSettingValue = <T = string | number | boolean | object>(
  category: SettingCategory, 
  key: string, 
  defaultValue?: T
): T | undefined => {
  const { data: setting } = useSetting(category, key);
  
  if (!setting) return defaultValue;
  
  // Parse the JSON value based on data type
  try {
    switch (setting.data_type) {
      case 'string':
        return JSON.parse(String(setting.setting_value)) as T;
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
    return defaultValue;
  }
};

// Bulk settings management hook
export const useSettingsManager = (category?: SettingCategory) => {
  const { data: settings, isLoading, error } = useSettings(category);
  const updateMutation = useUpdateSetting();
  
  const getSettingValue = useCallback((key: string, defaultValue?: string | number | boolean | object) => {
    const setting = settings?.find(s => s.setting_key === key);
    if (!setting) return defaultValue;
    
    try {
      switch (setting.data_type) {
        case 'string':
          // For strings, try to parse as JSON first, but fallback to raw value if it's not valid JSON
          try {
            return JSON.parse(String(setting.setting_value));
          } catch {
            return setting.setting_value;
          }
        case 'number':
          return Number(setting.setting_value);
        case 'boolean':
          return Boolean(setting.setting_value);
        case 'object':
        case 'array':
          return setting.setting_value;
        default:
          return setting.setting_value;
      }
    } catch (error) {
      console.error('Error parsing setting value:', error);
      return defaultValue;
    }
  }, [settings]);
  
  const updateSettingValue = useCallback(async (key: string, value: string | number | boolean | object) => {
    if (!category) throw new Error('Category is required for updating settings');
    
    return updateMutation.mutateAsync({
      category,
      key,
      setting_value: value,
    });
  }, [category, updateMutation]);
  
  const bulkUpdate = useCallback(async (updates: Record<string, string | number | boolean | object>) => {
    if (!category) throw new Error('Category is required for bulk updates');
    
    const promises = Object.entries(updates).map(([key, value]) =>
      updateMutation.mutateAsync({
        category,
        key,
        setting_value: value,
      })
    );
    
    return Promise.all(promises);
  }, [category, updateMutation]);
  
  return {
    settings,
    isLoading,
    error,
    getSettingValue,
    updateSettingValue,
    bulkUpdate,
    isUpdating: updateMutation.isPending,
  };
};
