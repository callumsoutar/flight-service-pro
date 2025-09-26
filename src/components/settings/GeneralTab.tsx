"use client";
import React, { useState } from "react";
import { Building, Mail, Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsManager } from "@/hooks/use-settings";
import { toast } from "sonner";
import BusinessHoursConfig from "./BusinessHoursConfig";

const generalTabs = [
  { id: "school-info", label: "School Information", icon: Building },
  { id: "contact-info", label: "Contact Information", icon: Mail },
  { id: "system-settings", label: "System Settings", icon: SettingsIcon },
];

export default function GeneralTab() {
  const [selectedTab, setSelectedTab] = useState("school-info");
  const { settings, getSettingValue, updateSettingValue, isLoading, isUpdating } = useSettingsManager('general');
  
  // Local state for form values
  const [formData, setFormData] = useState({
    // School Information
    school_name: '',
    registration_number: '',
    description: '',
    // Contact Information
    contact_email: '',
    contact_phone: '',
    address: '',
    website_url: '',
  });

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        school_name: getSettingValue('school_name', ''),
        registration_number: getSettingValue('registration_number', ''),
        description: getSettingValue('description', ''),
        contact_email: getSettingValue('contact_email', ''),
        contact_phone: getSettingValue('contact_phone', ''),
        address: getSettingValue('address', ''),
        website_url: getSettingValue('website_url', ''),
      });
    }
  }, [settings, getSettingValue]); // getSettingValue is now properly memoized with useCallback

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSection = async (fields: string[]) => {
    try {
      const updates: Record<string, string> = {};
      fields.forEach(field => {
        updates[field] = formData[field as keyof typeof formData];
      });
      
      await Promise.all(
        Object.entries(updates).map(([key, value]) => 
          updateSettingValue(key, value)
        )
      );
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <Tabs.List
          className="flex flex-row gap-1 mb-8 border-b-2 border-gray-200"
          aria-label="General configuration types"
        >
          {generalTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:bg-indigo-50 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 hover:text-indigo-600 hover:bg-gray-50 whitespace-nowrap rounded-t-lg -mb-[2px]"
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="flex-1 overflow-auto">
          <Tabs.Content value="school-info" className="outline-none">
            <div className="space-y-6 px-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    School Name <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    placeholder="Flight School Name" 
                    value={formData.school_name}
                    onChange={(e) => handleInputChange('school_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    placeholder="ABC123" 
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <Textarea 
                  placeholder="Brief description of your flight school..." 
                  rows={3} 
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Website URL</label>
                <Input 
                  placeholder="https://www.yourflightschool.com" 
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveSection(['school_name', 'registration_number', 'description', 'website_url'])}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save School Information
                </Button>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="contact-info" className="outline-none">
            <div className="space-y-6 px-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    type="email"
                    placeholder="contact@flightschool.com" 
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    placeholder="+1 (555) 123-4567" 
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="max-w-md">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <Textarea 
                  placeholder="123 Airport Road, Aviation City, AC 12345" 
                  rows={1} 
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveSection(['contact_email', 'contact_phone', 'address'])}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Contact Information
                </Button>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="system-settings" className="outline-none">
            <div className="space-y-8 px-5">
              {/* General System Settings */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  General Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select
                      value={getSettingValue('timezone', 'Pacific/Auckland')}
                      onValueChange={(value) => updateSettingValue('timezone', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZ)</SelectItem>
                        <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={getSettingValue('currency', 'NZD')}
                      onValueChange={(value) => updateSettingValue('currency', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>These settings affect how dates, times, and currency are displayed throughout the application.</p>
                </div>
              </div>

              {/* Business Hours Section */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Business Hours
                </h4>
                <BusinessHoursConfig />
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}