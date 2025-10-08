# Invoice PDF Download Implementation

## Overview
Successfully implemented a secure, server-side PDF generation and download feature for invoices using `@react-pdf/renderer`.

## Implementation Summary

### 1. PDF Template Component
**File:** `/src/components/invoices/InvoicePDFTemplate.tsx`

- Created a React-based PDF template using `@react-pdf/renderer`
- Mirrors the existing invoice view page layout
- Includes all invoice details: company info, bill-to, invoice dates, itemized table, totals, payment info, and footer
- Professional styling with proper typography and spacing
- Handles edge cases (no items, missing data)

### 2. PDF Generation API Route
**File:** `/src/app/api/invoices/[id]/pdf/route.ts`

**Security Features:**
- ✅ Authenticates users via Supabase Auth
- ✅ Checks user roles (admin/owner/instructor can download any invoice)
- ✅ Non-privileged users can only download their own invoices
- ✅ Prevents PDF generation for draft invoices
- ✅ Returns 401 for unauthorized, 403 for forbidden, 404 for not found
- ✅ Uses Supabase RLS policies for data security

**Functionality:**
- Fetches invoice and invoice items from database
- Validates user permissions
- Renders PDF using `renderToStream()`
- Returns PDF as downloadable blob with proper headers
- Error handling with detailed logging

### 3. Updated UI Components

#### InvoiceOptionsDropdown
**File:** `/src/components/invoices/InvoiceOptionsDropdown.tsx`

- Added `invoiceNumber` prop for filename generation
- Implemented `handleDownloadPDF` function with:
  - Loading state management
  - Fetch API call to `/api/invoices/[id]/pdf`
  - Blob download with auto-generated filename
  - Success/error toast notifications
  - Proper cleanup of blob URLs
- Loading indicator with spinner during PDF generation
- Disabled state while downloading

#### InvoiceViewHeader
**File:** `/src/components/invoices/InvoiceViewHeader.tsx`

- Updated to pass `invoiceNumber` prop to `InvoiceOptionsDropdown`

## Security Implementation

### Authentication & Authorization
1. **User Authentication**: Verified via Supabase `auth.getUser()`
2. **Role-Based Access Control**: 
   - Admin/Owner/Instructor: Can download any invoice
   - Members/Students: Can only download their own invoices
3. **Row-Level Security**: Leverages existing Supabase RLS policies
4. **Draft Protection**: Prevents PDF generation for draft invoices

### Data Validation
- Invoice existence check before PDF generation
- Proper error responses for edge cases
- Input sanitization through type safety

## User Experience

### Download Flow
1. User clicks "Options" dropdown on invoice view page
2. User clicks "Download" option
3. Button shows loading state with spinner: "Generating PDF..."
4. PDF is generated server-side
5. Browser automatically downloads file as `Invoice-{number}.pdf`
6. Success toast notification appears
7. Button returns to normal state

### Error Handling
- Network errors: Shows toast with error message
- Permission errors: Shows specific forbidden message
- Server errors: Shows generic failure message
- All errors logged to console for debugging

## File Structure

```
src/
├── app/
│   └── api/
│       └── invoices/
│           └── [id]/
│               └── pdf/
│                   └── route.ts (NEW - PDF generation endpoint)
└── components/
    └── invoices/
        ├── InvoicePDFTemplate.tsx (NEW - PDF template)
        ├── InvoiceOptionsDropdown.tsx (MODIFIED - download handler)
        └── InvoiceViewHeader.tsx (MODIFIED - pass props)
```

## Benefits

1. **Performance**: Server-side generation reduces client load
2. **Security**: RLS enforced, proper authentication/authorization
3. **Quality**: Professional, pixel-perfect PDFs
4. **Maintainability**: React-based template, easy to update
5. **UX**: Clean download flow with loading states and feedback
6. **Offline Access**: Downloaded PDFs viewable without internet

## Testing Checklist

- [x] PDF generates correctly for invoices with items
- [x] PDF generates correctly for invoices with no items
- [x] Layout matches web view (company, dates, amounts, etc.)
- [x] Currency formatting is correct
- [x] Tax calculations display correctly
- [x] Payment info (paid/balance) shows correctly
- [x] File downloads with correct filename pattern
- [ ] Security: Non-admin users cannot download others' invoices (manual test)
- [ ] Error handling works for network failures (manual test)
- [ ] Works on mobile devices (manual test)

## Required Package Installation

```bash
npm install @react-pdf/renderer
```

## Additional Changes & Bug Fixes

### Critical Bug Fix - Role Fetching
**Fixed incorrect role fetching method in PDF API route:**
- Changed from broken direct table query to standardized RPC function
- Was querying non-existent 'role' column in user_roles table
- Now uses `supabase.rpc('get_user_role', { user_id })` like all other routes

### Page Protection Updates
Updated invoice-related pages to allow instructor access:
- `/dashboard/invoices/page.tsx` - Changed from `ADMIN_ONLY` to `INSTRUCTOR_AND_UP`
- `/dashboard/invoices/view/[id]/page.tsx` - Changed from `ADMIN_ONLY` to `INSTRUCTOR_AND_UP`
- `/dashboard/invoices/edit/[id]/page.tsx` - Changed from `ADMIN_ONLY` to `INSTRUCTOR_AND_UP`

### API Route Updates
Updated API endpoints to allow instructor access:
- `/api/invoices/route.ts` - Added 'instructor' to allowed roles
- `/api/invoices/[id]/pdf/route.ts` - Fixed role fetching + added 'instructor' to allowed roles

### Database RLS Policy Updates
Updated Supabase RLS policies to include instructor role:
- `invoices` table policies
- `invoice_items` table policies
- `payments` table policies

See `RLS_INVOICE_INSTRUCTOR_FIX.md` for detailed bug analysis and fixes.

## Next Steps (Optional Enhancements)

1. **Email Integration**: Use the PDF template to send invoices via email
2. **Print Optimization**: Add a print-specific CSS media query
3. **Customization**: Allow users to customize PDF footer/header
4. **Batch Download**: Download multiple invoices as ZIP
5. **Preview**: Show PDF preview before download

