# Receive Payment Modal - Usage Guide

## Overview

The `ReceivePaymentModal` component allows administrators to apply credit directly to a member's account without requiring an invoice. This is useful for:

- Receiving cash payments at the front desk
- Processing refunds
- Adding account credits
- Recording offline payments
- Applying discounts or adjustments

## Basic Usage

### Import the Component

```tsx
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";
```

### Simple Implementation

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsModalOpen(true)}>
        Receive Payment
      </Button>
      
      <ReceivePaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
```

### With Default Amount

```tsx
<ReceivePaymentModal
  open={isModalOpen}
  onOpenChange={setIsModalOpen}
  defaultAmount={100.00}
/>
```

## Integration Examples

### 1. Dashboard Quick Action

```tsx
// app/(auth)/dashboard/page.tsx
"use client";
import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function DashboardPage() {
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <Button 
            onClick={() => setReceivePaymentOpen(true)}
            className="w-full"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Receive Payment
          </Button>
        </Card>
      </div>
      
      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
    </div>
  );
}
```

### 2. Members Page Integration

```tsx
// app/(auth)/members/[id]/page.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Member Details</h1>
        <Button onClick={() => setReceivePaymentOpen(true)}>
          Receive Payment
        </Button>
      </div>
      
      {/* Member details here */}
      
      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
    </div>
  );
}
```

### 3. Toolbar Integration

```tsx
// components/layout/AdminToolbar.tsx
"use client";
import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function AdminToolbar() {
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);

  return (
    <div className="border-b bg-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReceivePaymentOpen(true)}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Receive Payment
        </Button>
      </div>
      
      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
    </div>
  );
}
```

### 4. Payments Management Page

```tsx
// app/(auth)/dashboard/payments/page.tsx
"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function PaymentsPage() {
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={() => setReceivePaymentOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Receive Payment
        </Button>
      </div>
      
      {/* Payments list/table here */}
      
      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
    </div>
  );
}
```

## Props Reference

### `ReceivePaymentModal` Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | - | Controls whether the modal is open |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Callback when modal open state changes |
| `defaultAmount` | `number` | No | `0` | Default payment amount to pre-fill |

## Features

### 1. User Selection
- Uses `MemberSelect` component for user search
- Type-ahead search functionality
- Displays user email for confirmation
- Clear button to change selection

### 2. Payment Amount
- Numeric input with currency symbol
- Minimum value validation (> 0)
- Two decimal places precision
- Required field

### 3. Payment Method
- Dropdown selection
- 7 payment methods supported:
  - Cash
  - Credit Card
  - Debit Card
  - Bank Transfer
  - Check
  - Online Payment
  - Other
- Icon for each method
- Required field

### 4. Optional Fields
- **Reference Number**: For transaction IDs, check numbers, etc.
- **Notes**: Additional payment details or context

### 5. Validation
- Real-time validation feedback
- Clear error messages
- Required field indicators
- Submit button disabled until valid

### 6. Success Feedback
- Success animation after submission
- Confirmation message with details
- **Payment reference number display** (e.g., PAY-2025-10-0001)
- Auto-close after 2 seconds (extended to allow reading payment reference)
- Automatic page refresh

### 7. Form Management
- Auto-reset on close
- Loading states during submission
- Error handling and display
- Cancel button to close without saving

## User Experience Flow

```
1. Admin clicks "Receive Payment" button
   ↓
2. Modal opens with empty form
   ↓
3. Admin selects member from dropdown
   ↓
4. Admin enters payment amount
   ↓
5. Admin selects payment method
   ↓
6. Admin optionally adds reference/notes
   ↓
7. Payment summary shows at bottom
   ↓
8. Admin clicks "Receive Payment"
   ↓
9. Form validates and submits
   ↓
10. Success animation displays with payment reference number
    ↓
11. Modal auto-closes after 2 seconds
    ↓
12. Page refreshes to show updated balance
```

## Error Handling

### Common Errors

**"Please select a member"**
- User must select a member before submitting

**"Payment amount must be greater than zero"**
- Amount must be a positive number

**"Payment method is required"**
- User must select a payment method

**"User not found"**
- Selected user no longer exists in database

**"Authorization check failed"**
- User doesn't have permission (not Admin/Owner)

## Best Practices

### 1. Context-Specific Default Amounts
```tsx
// Pre-fill membership fee amount
<ReceivePaymentModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  defaultAmount={membershipType.price}
/>
```

### 2. Combine with Notifications
```tsx
const handleOpenChange = (open: boolean) => {
  setModalOpen(open);
  if (!open) {
    // Show toast notification
    toast.success("Payment received successfully!");
  }
};
```

### 3. Track Analytics
```tsx
const handleOpenChange = (open: boolean) => {
  setModalOpen(open);
  if (!open && wasSuccessful) {
    analytics.track("payment_received", {
      amount: amount,
      method: paymentMethod
    });
  }
};
```

### 4. Role-Based Visibility
```tsx
{(userRole === 'admin' || userRole === 'owner') && (
  <Button onClick={() => setModalOpen(true)}>
    Receive Payment
  </Button>
)}
```

## Styling and Customization

The modal uses the following design system components:
- `Dialog` from shadcn/ui
- `Input` from shadcn/ui
- `Select` from shadcn/ui
- `Button` from shadcn/ui
- Tailwind CSS for styling

The modal is fully responsive and matches the existing design system.

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Focus Management**: Auto-focus on mount
- **Error Announcements**: Errors announced to screen readers

## Performance

- **Lazy Loading**: Modal only renders when open
- **Optimized Search**: User search is debounced
- **Form Reset**: Async to prevent UI blocking
- **Minimal Re-renders**: Optimized state management

## Security

- **Authorization**: Admin/Owner role required
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **CSRF Protection**: Next.js automatic CSRF protection

## Troubleshooting

### Modal doesn't open
- Check `open` prop is set to `true`
- Verify no JavaScript errors in console

### User not found error
- Verify user exists in database
- Check user_id is valid UUID

### Authorization error
- Verify logged in user has Admin/Owner role
- Check role-based access control settings

### Payment not showing in transaction history
- Check database for payment and transaction records
- Verify account balance was updated
- Run verification queries from documentation

## Support

For issues or questions:
1. Check the main documentation: `CREDIT_PAYMENT_SYSTEM_IMPLEMENTATION.md`
2. Review error logs in browser console
3. Check database records with verification queries
4. Review atomic transaction documentation

## Related Components

- `RecordPaymentModal` - For invoice-related payments
- `MemberSelect` - User selection component
- Payment types: `src/types/payments.ts`
- Payment API: `src/app/api/payments/credit/route.ts`

