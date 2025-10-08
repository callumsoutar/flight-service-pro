# Invoice Template Dynamic Settings Implementation

## Summary

Successfully implemented a dynamic invoice template system that replaces hard-coded company information with configurable settings. This allows administrators to customize invoice appearance through the Settings interface without code changes.

## Implementation Date
October 8, 2025

## Changes Made

### 1. Database Schema Updates

Added the following new settings to the `settings` table:

#### General Category Settings:
- **`billing_address`** - Company billing address displayed on invoices
- **`gst_number`** - GST/Tax registration number

#### Invoicing Category Settings:
- **`invoice_footer_message`** - Customizable footer message
- **`payment_terms_message`** - Customizable payment terms text

All settings were initialized with the previously hard-coded values from "Kapiti Aero Club".

### 2. TypeScript Type Definitions

**File: `src/types/settings.ts`**

Updated interfaces to include new fields:

```typescript
export interface GeneralSettings {
  // ... existing fields
  billing_address: string;
  gst_number: string;
}

export interface InvoicingSettings {
  // ... existing fields
  invoice_footer_message: string;
  payment_terms_message: string;
}
```

### 3. New Settings Management Component

**File: `src/components/settings/InvoiceTemplateSettings.tsx`**

Created a comprehensive settings form with the following features:

#### Company Information Section:
- Company Name (from `school_name`)
- GST/Tax Number
- Billing Address (multiline textarea)
- Phone Number
- Email Address

#### Invoice Footer & Payment Terms Section:
- Footer Message
- Payment Terms

#### Features:
- Real-time change detection
- Save/Cancel buttons with visual feedback
- Integrated with the existing settings context
- Form validation and error handling
- Success/error toast notifications

### 4. Settings Tab Integration

**File: `src/components/settings/InvoicingTab.tsx`**

Updated the Invoicing tab to include the new Invoice Template Settings component in the "Invoice Configuration" tab, replacing the "coming soon" placeholder.

### 5. Invoice View Page Updates

**File: `src/app/(auth)/dashboard/invoices/view/[id]/page.tsx`**

#### Changes:
- Added `getInvoiceSettings()` helper function to fetch settings from database
- Updated invoice display to use dynamic values for:
  - Company name
  - Billing address
  - GST number
  - Contact phone
  - Contact email
  - Invoice footer message
  - Payment terms

#### Display Logic:
- Conditionally shows company information fields (only if they have values)
- Falls back to sensible defaults if settings are not configured

### 6. PDF Template Updates

**File: `src/components/invoices/InvoicePDFTemplate.tsx`**

#### Changes:
- Added `InvoiceSettings` interface for type safety
- Updated component props to accept optional settings
- Modified template to use dynamic values throughout
- Added default fallback values for missing settings

#### Updated Sections:
- Header (company name, address, GST, contact info)
- Footer (thank you message and payment terms)

### 7. API Route Updates

Updated both invoice API routes to fetch and pass settings:

#### File: `src/app/api/invoices/[id]/pdf/route.ts`
- Added `getInvoiceSettings()` helper function
- Fetches settings before generating PDF
- Passes settings to `InvoicePDFTemplate`

#### File: `src/app/api/invoices/[id]/email/route.ts`
- Added `getInvoiceSettings()` helper function
- Fetches settings before generating PDF for email
- Passes settings to `InvoicePDFTemplate`

## Settings Location in UI

Users can now configure invoice templates by navigating to:

**Settings → Invoicing → Invoice Configuration**

## Current Default Values

The system was initialized with these default values (previously hard-coded):

```
Company Name: Kapiti Aero Club
Billing Address: 123 Main Street, Aviation Drive, Wellington
GST Number: 12-345-678
Phone: 04 543 6483
Email: test@flightschool.co.nz
Footer: Thank you for choosing to train with Kapiti Aero Club.
Payment Terms: Payment terms: within 7 days of receipt of this invoice. Late payments may incur additional charges.
```

## Benefits

1. **Flexibility**: School administrators can update company information without developer intervention
2. **Consistency**: All invoices (view, PDF, email) use the same settings
3. **Professional**: Easy customization for different organizations using the same codebase
4. **Maintainable**: Settings are centrally managed and audited through the settings system
5. **User-Friendly**: Intuitive form interface with real-time validation

## Technical Architecture

### Settings Flow:
1. **Storage**: Settings stored in `settings` table with proper categorization
2. **Context**: `SettingsContext` provides centralized access to settings
3. **Components**: Settings form uses React Hook Form with Zod validation
4. **Server Components**: Fetch settings directly from database
5. **PDF Generation**: Settings passed as props to PDF template component

### Security:
- Settings are protected by existing RLS policies
- Only admins/owners can modify invoice settings
- Settings changes are audited through `settings_audit_log` table

## Files Modified

1. `src/types/settings.ts` - Type definitions
2. `src/components/settings/InvoiceTemplateSettings.tsx` - NEW settings form component
3. `src/components/settings/InvoicingTab.tsx` - Tab integration
4. `src/app/(auth)/dashboard/invoices/view/[id]/page.tsx` - Invoice view page
5. `src/components/invoices/InvoicePDFTemplate.tsx` - PDF template
6. `src/app/api/invoices/[id]/pdf/route.ts` - PDF generation API
7. `src/app/api/invoices/[id]/email/route.ts` - Email invoice API

## Testing Recommendations

1. **Settings Update**: Test changing each field in the Invoice Configuration tab
2. **Invoice View**: Verify changes appear on the invoice view page
3. **PDF Generation**: Download invoice PDF and verify customizations
4. **Email**: Send test invoice email and verify PDF attachment
5. **Empty Fields**: Test with empty values to ensure graceful handling
6. **Long Content**: Test with very long addresses and messages
7. **Special Characters**: Test with special characters in all fields

## Future Enhancements

Potential improvements for future iterations:

1. **Logo Upload**: Add ability to upload and display company logo
2. **Multiple Languages**: Support for multi-language invoice templates
3. **Custom Colors**: Allow customization of invoice color scheme
4. **Multiple Templates**: Support for different invoice templates (formal, casual, etc.)
5. **Preview**: Real-time preview of invoice changes before saving
6. **Terms & Conditions**: Separate field for detailed T&Cs
7. **Bank Details**: Add fields for bank account information

## Migration Notes

- No data migration required for existing invoices
- Previous invoices generated with hard-coded values remain unchanged
- New invoices will automatically use the configured settings
- Settings are backward compatible with fallback to sensible defaults

## Conclusion

The invoice template system is now fully dynamic and configurable. All hard-coded values have been replaced with database-driven settings, providing flexibility and maintainability for the long term.

