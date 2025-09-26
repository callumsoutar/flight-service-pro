# Settings System Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for the settings configuration system in the Aero Safety flight school management SaaS application. The system will store and manage school-wide configuration settings while following modern SaaS best practices for security, scalability, and maintainability.

## Current State Analysis

### Existing UI Structure
The application currently has a well-structured settings interface with the following tabs:
- **General**: School Information, Contact Information, System Settings
- **Invoicing**: Tax Rates, Invoice Configuration, Payment Terms, Templates
- **Charges**: Aircraft Rates, Instructor Rates, Additional Charges, Fuel Pricing
- **Bookings**: Booking Rules, Time Slots, Cancellations, Workflow
- **Permissions**: User access control settings
- **Training**: Training management configurations
- **Memberships**: Membership type configurations
- **Users**: User management settings
- **Notifications**: Communication preferences

### Current Implementation Status
- ✅ Complete UI framework with tab navigation
- ✅ Lazy-loaded components for performance
- ✅ Some configuration components (TaxRateManager, CancellationCategories, etc.)
- ❌ No backend settings storage system
- ❌ No API endpoints for settings management
- ❌ Settings inputs are currently disabled/placeholder

## Architecture Design

### 1. Database Schema

#### Settings Table Structure
```sql
-- Main settings table for key-value configuration storage
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'general', 'invoicing', 'bookings', etc.
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  data_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'object', 'array'
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether setting can be accessed by non-admin users
  is_required BOOLEAN DEFAULT false,
  validation_schema JSONB, -- JSON schema for validation
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(category, setting_key)
);

-- Enable RLS for security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin users can manage all settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner')
      AND ur.is_active = true
    )
  );

CREATE POLICY "Authenticated users can view public settings" ON settings
  FOR SELECT USING (
    is_public = true AND auth.role() = 'authenticated'
  );

-- Settings audit log for change tracking
CREATE TABLE settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID REFERENCES settings(id),
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Settings file uploads table for logo, documents, etc.
CREATE TABLE settings_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID REFERENCES settings(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

#### Predefined Settings Categories
```sql
-- Insert default setting categories and structures
INSERT INTO settings (category, setting_key, setting_value, data_type, description, is_required) VALUES
-- General Settings
('general', 'school_name', '""', 'string', 'Name of the flight school', true),
('general', 'registration_number', '""', 'string', 'Flight school registration number', true),
('general', 'description', '""', 'string', 'Brief description of the flight school', false),
('general', 'contact_email', '""', 'string', 'Main contact email address', true),
('general', 'contact_phone', '""', 'string', 'Main contact phone number', true),
('general', 'address', '""', 'string', 'Physical address of the school', false),
('general', 'logo_url', '""', 'string', 'URL to school logo', false),
('general', 'website_url', '""', 'string', 'School website URL', false),
('general', 'timezone', '"Pacific/Auckland"', 'string', 'Default timezone for the school', true),
('general', 'currency', '"NZD"', 'string', 'Default currency code', true),

-- System Settings
('system', 'booking_advance_limit_days', '90', 'number', 'How many days in advance bookings can be made', true),
('system', 'auto_confirm_bookings', 'false', 'boolean', 'Automatically confirm new bookings', false),
('system', 'require_flight_authorization', 'true', 'boolean', 'Require flight authorization for solo flights', true),
('system', 'maintenance_reminder_days', '7', 'number', 'Days before maintenance due to send reminders', true),

-- Notification Settings
('notifications', 'booking_confirmation_enabled', 'true', 'boolean', 'Send booking confirmation emails', false),
('notifications', 'booking_reminder_enabled', 'true', 'boolean', 'Send booking reminder emails', false),
('notifications', 'maintenance_alert_enabled', 'true', 'boolean', 'Send maintenance alerts', false),
('notifications', 'email_from_address', '""', 'string', 'From email address for notifications', true),
('notifications', 'email_reply_to', '""', 'string', 'Reply-to email address', false),

-- Invoicing Settings
('invoicing', 'invoice_prefix', '"INV"', 'string', 'Prefix for invoice numbers', true),
('invoicing', 'payment_terms_days', '30', 'number', 'Default payment terms in days', true),
('invoicing', 'late_fee_percentage', '0', 'number', 'Late fee percentage for overdue invoices', false),
('invoicing', 'auto_generate_invoices', 'false', 'boolean', 'Automatically generate invoices after flights', false);
```

### 2. API Architecture

#### Settings API Endpoints
```typescript
// GET /api/settings - Get all settings (filtered by permissions)
// GET /api/settings/:category - Get settings by category
// GET /api/settings/:category/:key - Get specific setting
// PUT /api/settings/:category/:key - Update specific setting
// POST /api/settings - Create new setting
// DELETE /api/settings/:category/:key - Delete setting (soft delete)

// File upload endpoints
// POST /api/settings/upload - Upload setting-related files
// GET /api/settings/files/:id - Download setting file
```

#### TypeScript Types
```typescript
// src/types/settings.ts
export interface Setting {
  id: string;
  category: SettingCategory;
  setting_key: string;
  setting_value: any;
  data_type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  is_public: boolean;
  is_required: boolean;
  validation_schema?: object;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type SettingCategory = 
  | 'general' 
  | 'system' 
  | 'invoicing' 
  | 'notifications' 
  | 'bookings' 
  | 'training' 
  | 'maintenance';

export interface SettingsUpdateRequest {
  setting_value: any;
  updated_by: string;
}

export interface SettingsFile {
  id: string;
  setting_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}
```

### 3. Security Implementation

#### Row-Level Security (RLS)
- **Admin/Owner Access**: Full CRUD access to all settings
- **Public Settings**: Read-only access for authenticated users to non-sensitive settings
- **Audit Logging**: All settings changes tracked with user attribution

#### Input Validation
- JSON Schema validation for complex settings
- Type checking and sanitization
- Rate limiting on settings API endpoints
- CSRF protection

#### Data Encryption
- Sensitive settings encrypted at rest
- Secure transmission via HTTPS
- API key/secret rotation capabilities

### 4. Performance Optimization

#### Caching Strategy
```typescript
// Implement Redis caching for frequently accessed settings
// Cache invalidation on settings updates
// Client-side caching with React Query/TanStack Query

export const useSettings = (category?: SettingCategory) => {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => fetchSettings(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

#### Database Optimization
- Indexes on frequently queried columns (category, setting_key)
- Connection pooling
- Query optimization for bulk settings retrieval

### 5. Frontend Integration

#### Settings Management Hook
```typescript
// src/hooks/use-settings.ts
export const useSettingsManager = () => {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchAllSettings,
  });

  const updateSetting = useMutation({
    mutationFn: ({ category, key, value }: UpdateSettingParams) =>
      updateSettingValue(category, key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSetting: updateSetting.mutate,
    isUpdating: updateSetting.isPending,
  };
};
```

#### Settings Context Provider
```typescript
// src/contexts/SettingsContext.tsx
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings, updateSetting } = useSettingsManager();
  
  const getSettingValue = (category: string, key: string, defaultValue?: any) => {
    const setting = settings?.find(s => s.category === category && s.setting_key === key);
    return setting?.setting_value ?? defaultValue;
  };

  return (
    <SettingsContext.Provider value={{ settings, getSettingValue, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

### 6. File Management

#### Supabase Storage Integration
```typescript
// Create storage bucket for settings files
// Implement file upload/download APIs
// Image optimization for logos
// Document management for policies/procedures

export const uploadSettingFile = async (file: File, settingId: string) => {
  const supabase = createClientComponentClient();
  const fileName = `${settingId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('settings-files')
    .upload(fileName, file);
    
  if (error) throw error;
  return data;
};
```

## Implementation Phases

### Phase 1: Database Foundation (Week 1)
1. Create settings table schema
2. Implement RLS policies
3. Set up audit logging
4. Create initial data seeds
5. Database migration files

### Phase 2: API Development (Week 2)
1. Build settings API endpoints
2. Implement validation middleware
3. Add authentication/authorization
4. Create file upload endpoints
5. API testing and documentation

### Phase 3: Frontend Integration (Week 3)
1. Update settings components to use real data
2. Implement settings hooks and context
3. Add form validation and error handling
4. File upload components
5. Settings management UI

### Phase 4: Advanced Features (Week 4)
1. Settings import/export functionality
2. Backup and restore capabilities
3. Settings versioning/rollback
4. Performance optimization
5. Comprehensive testing

## Best Practices Implementation

### 1. Data Consistency
- Atomic operations for related settings updates
- Transaction management for complex changes
- Data validation at multiple layers

### 2. Scalability
- Horizontal scaling capabilities
- Efficient querying strategies
- Caching implementation
- Background job processing for heavy operations

### 3. Maintainability
- Clear separation of concerns
- Comprehensive error handling
- Logging and monitoring
- Documentation and testing

### 4. User Experience
- Real-time settings updates
- Progressive loading
- Optimistic updates with rollback
- Clear feedback on changes

## Monitoring and Analytics

### Settings Usage Tracking
- Track which settings are most frequently accessed
- Monitor settings change frequency
- User behavior analytics for settings pages
- Performance metrics for settings operations

### Health Monitoring
- Database query performance
- API response times
- Error rates and types
- Cache hit rates

## Security Considerations

### Data Protection
- Encrypt sensitive settings (API keys, passwords)
- Audit all settings changes
- Implement proper access controls
- Regular security reviews

### Compliance
- GDPR compliance for user data settings
- Data retention policies
- Export capabilities for compliance
- Anonymization for deleted users

## Migration Strategy

### Existing Data
- Migrate existing configuration from hardcoded values
- Preserve current tax rates, membership types, etc.
- Gradual migration approach with fallbacks
- Data validation during migration

### Backward Compatibility
- Maintain existing API contracts during transition
- Graceful degradation for unsupported features
- Clear migration timeline and communication

## Success Metrics

### Technical Metrics
- Settings API response time < 200ms
- 99.9% uptime for settings service
- Zero data loss during operations
- < 1% error rate for settings operations

### User Metrics
- Reduced time to configure school settings
- Increased user satisfaction scores
- Reduced support tickets related to configuration
- Higher feature adoption rates

## Documentation Deliverables

1. **API Documentation**: Complete Swagger/OpenAPI specification
2. **User Guide**: Step-by-step settings configuration guide
3. **Admin Manual**: Advanced configuration and troubleshooting
4. **Developer Guide**: Integration patterns and best practices
5. **Migration Guide**: Detailed migration procedures

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Data Loss**: Comprehensive backup and recovery procedures
- **Security Breaches**: Multi-layer security implementation
- **Integration Issues**: Thorough testing and gradual rollout

### Business Risks
- **User Adoption**: Comprehensive training and documentation
- **Data Migration**: Careful planning and testing
- **Downtime**: Zero-downtime deployment strategies
- **Feature Regression**: Comprehensive testing suites

## Conclusion

This implementation plan provides a comprehensive roadmap for building a robust, secure, and scalable settings system for the Aero Safety application. By following modern SaaS best practices and leveraging Supabase's capabilities, the system will provide excellent performance, security, and user experience while maintaining the flexibility to adapt to future requirements.

The phased approach ensures manageable development cycles while minimizing risk and allowing for iterative improvements based on user feedback and real-world usage patterns.
