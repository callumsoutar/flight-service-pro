# Invoice Email Implementation

## Overview
Successfully implemented a secure, server-side email delivery system for invoices with PDF attachments using Resend API.

## Implementation Summary

### 1. Email API Route
**File:** `/src/app/api/invoices/[id]/email/route.ts`

**Security Features:**
- ✅ Authenticates users via Supabase Auth
- ✅ Checks user roles (admin/owner/instructor can email any invoice)
- ✅ Non-privileged users can only email their own invoices
- ✅ Prevents emailing draft invoices
- ✅ Returns 401 for unauthorized, 403 for forbidden, 404 for not found
- ✅ Uses Supabase RLS policies for data security
- ✅ Validates recipient email exists

**Functionality:**
- Fetches invoice and invoice items from database
- Validates user permissions (same logic as PDF download)
- Generates PDF using `@react-pdf/renderer` and `renderToBuffer()`
- Sends email via Resend API with PDF attachment
- Simple, plain text email body as specified
- Returns success with recipient email confirmation
- Error handling with detailed logging

**Email Template:**
```
Subject: Invoice #[number]

Body:
Please find our invoice #[number] dated [date] attached.

Please contact us if you are unable to open the attachment, or if you prefer us to post invoices to you.

Regards,
Aero Safety Flight School
```

### 2. Updated InvoiceOptionsDropdown Component
**File:** `/src/components/invoices/InvoiceOptionsDropdown.tsx`

**Changes:**
- Added `isSendingEmail` state for loading management
- Implemented `handleEmailInvoice()` function with:
  - POST request to `/api/invoices/[id]/email`
  - Loading state management
  - Success toast with recipient email confirmation
  - Error toast notifications
  - Proper error handling
- Updated Email menu item:
  - Replaced `alert()` with `handleEmailInvoice()`
  - Loading spinner during email sending
  - Disabled state while sending
  - "Sending..." text during operation

### 3. Email Flow

```
1. User clicks "Email" in Options dropdown
   ↓
2. Loading state activated ("Sending...")
   ↓
3. POST request to /api/invoices/[id]/email
   ↓
4. Server validates permissions
   ↓
5. Server generates PDF from template
   ↓
6. Server sends email via Resend with PDF attachment
   ↓
7. Success toast shows recipient email
   ↓
8. Loading state deactivated
```

### 4. Email Details

**From:** Configured in `EMAIL_CONFIG.FROM_EMAIL` (environment variable)  
**To:** Invoice recipient's email (from user record)  
**Subject:** `Invoice #[invoice_number]`  
**Body:** Simple HTML with plain text message  
**Attachment:** PDF invoice generated from React template  
**Reply-To:** Configured in `EMAIL_CONFIG.REPLY_TO`  
**Headers:** Custom headers for tracking (X-Invoice-ID, X-User-ID)

## Security Implementation

### Authentication & Authorization
1. **User Authentication**: Verified via Supabase `auth.getUser()`
2. **Role-Based Access Control**: 
   - Admin/Owner/Instructor: Can email any invoice
   - Members/Students: Can only email their own invoices
3. **Row-Level Security**: Leverages existing Supabase RLS policies
4. **Draft Protection**: Prevents emailing draft invoices
5. **Email Validation**: Ensures recipient has valid email address

### Data Validation
- Invoice existence check before processing
- Proper error responses for edge cases
- Input sanitization through type safety
- Email service availability check

## User Experience

### Email Flow
1. User clicks "Options" dropdown on invoice view page
2. User clicks "Email" option
3. Button shows loading state with spinner: "Sending..."
4. Email is sent server-side with PDF attachment
5. Success toast shows: "Invoice emailed successfully to [email]"
6. Button returns to normal state

### Error Handling
- Network errors: Shows toast with error message
- Permission errors: Shows specific forbidden message
- Missing email: Shows "Recipient email not found" message
- Service unavailable: Shows "Email service not configured" message
- All errors logged to console for debugging

## Technical Details

### Dependencies Used
- `@react-pdf/renderer` - PDF generation
- `resend` - Email delivery service
- `date-fns` - Date formatting
- Existing Supabase infrastructure

### API Endpoint
- **Method:** POST
- **Path:** `/api/invoices/[id]/email`
- **Authentication:** Required
- **Request Body:** None (invoice ID from URL)
- **Response:** `{ success: boolean, messageId?: string, recipientEmail?: string }`

### PDF Attachment
- Generated using same `InvoicePDFTemplate` as download feature
- Rendered to buffer using `renderToBuffer()`
- Attached to email with filename: `Invoice-[number].pdf`
- Content type: `application/pdf`

## File Structure

```
src/
├── app/
│   └── api/
│       └── invoices/
│           └── [id]/
│               ├── pdf/
│               │   └── route.ts (existing - PDF download)
│               └── email/
│                   └── route.ts (NEW - email sending)
└── components/
    └── invoices/
        └── InvoiceOptionsDropdown.tsx (MODIFIED - email handler)
```

## Benefits

1. **Simplicity**: Plain text email as requested, no fancy templates
2. **Security**: RLS enforced, proper authentication/authorization
3. **Reliability**: Uses proven Resend API infrastructure
4. **Consistency**: Reuses existing PDF template for attachment
5. **UX**: Clean email flow with loading states and feedback
6. **Maintainability**: Clear separation of concerns, well-structured code

## Testing Checklist

- [ ] Email sends successfully for valid invoices
- [ ] PDF attachment is correct and opens properly
- [ ] Email body text matches specification
- [ ] Subject line shows correct invoice number
- [ ] Date formatting is correct (dd MMM yyyy)
- [ ] Success toast shows recipient email
- [ ] Security: Non-admin users cannot email others' invoices
- [ ] Draft invoices cannot be emailed
- [ ] Error handling works for various failure scenarios
- [ ] Loading state displays correctly during sending

## Environment Variables Required

```env
RESEND_API_KEY=re_... # Resend API key
FROM_EMAIL=noreply@yourdomain.com # Sender email address
REPLY_TO_EMAIL=support@yourdomain.com # Reply-to address
```

## Future Enhancements (Optional)

1. **Email logging**: Add email_logs database entry for audit trail
2. **BCC/CC options**: Allow admin to receive copy of sent invoices
3. **Custom message**: Allow user to add custom message before sending
4. **Email preview**: Show preview before sending
5. **Batch emailing**: Email multiple invoices at once
6. **Email templates**: Create more sophisticated HTML template if needed
7. **Delivery tracking**: Webhook integration to track email delivery status

## Related Documentation

- `INVOICE_PDF_DOWNLOAD_IMPLEMENTATION.md` - PDF generation feature
- `RLS_INVOICE_INSTRUCTOR_FIX.md` - Invoice security policies
- Email system: `/src/lib/email/` directory

---

**Status:** ✅ Complete and Ready for Testing
**Date:** October 7, 2025

