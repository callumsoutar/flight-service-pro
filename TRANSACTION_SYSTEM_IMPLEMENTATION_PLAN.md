# Transaction System Implementation Plan

## Executive Summary

**Problem Identified:** During the invoice logic migration, several critical triggers and functions were removed that handled:
1. **Transaction Creation**: Creating debit transactions when invoices are approved/paid
2. **Account Balance Updates**: Maintaining the `account_balance` field in the `users` table
3. **Transaction Management**: Syncing, reversing, and updating transaction amounts

**Current State:**
- ✅ Transaction triggers for balance updates still exist (`handle_transaction_balance_update`)
- ✅ Account balance calculation function exists (`get_account_balance`)
- ❌ **MISSING**: Invoice-to-transaction creation logic
- ❌ **MISSING**: Account balance updates when invoices are created/approved
- ❌ **MISSING**: Transaction reversal when invoices are cancelled

**Solution:** Implement comprehensive transaction management in the application layer while maintaining the existing balance update triggers.

## Current Transaction System Analysis

### Existing Infrastructure (Still Working)
```sql
-- These are still active and working:
✅ transaction_balance_insert_trigger → handle_transaction_balance_update()
✅ transaction_balance_update_trigger → handle_transaction_balance_update()  
✅ transaction_balance_delete_trigger → handle_transaction_balance_update()
✅ handle_transaction_balance_update() - Updates user account_balance
✅ get_account_balance() - Calculates current balance
✅ update_transaction_status() - Updates transaction status
```

### Missing Functions (Were Removed)
```sql
❌ process_invoice_approval() - Created debit transactions
❌ reverse_invoice_debit_transaction() - Reversed transactions
❌ sync_invoice_debit_transaction() - Updated transaction amounts
❌ update_invoice_balance_due() - Updated invoice balance
❌ update_invoice_status() - Updated invoice status based on payments
```

### Transaction Schema
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type transaction_type NOT NULL, -- 'debit', 'credit', 'refund', 'adjustment'
    status transaction_status NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled', 'refunded'
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB, -- Contains invoice_id, payment_id, etc.
    reference_number TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Implementation Plan

### Phase 1: Transaction Service Creation

#### 1.1 Create Transaction Service (`src/lib/transaction-service.ts`)

```typescript
import { createClient } from '@/lib/SupabaseServerClient';
import { Decimal } from 'decimal.js';

export interface TransactionInput {
  user_id: string;
  type: 'debit' | 'credit' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  metadata?: Record<string, any>;
  reference_number?: string;
}

export interface InvoiceTransactionData {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  user_id: string;
}

export class TransactionService {
  /**
   * Create a debit transaction for an invoice
   */
  static async createInvoiceDebit(data: InvoiceTransactionData): Promise<string> {
    const supabase = await createClient();
    
    const transaction: TransactionInput = {
      user_id: data.user_id,
      type: 'debit',
      amount: data.total_amount,
      description: `Invoice: ${data.invoice_number}`,
      metadata: {
        invoice_id: data.invoice_id,
        invoice_number: data.invoice_number,
        transaction_type: 'invoice_debit'
      },
      reference_number: data.invoice_number
    };
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select('id')
      .single();
    
    if (error) throw new Error(`Failed to create invoice debit transaction: ${error.message}`);
    return result.id;
  }
  
  /**
   * Create a credit transaction for a payment
   */
  static async createPaymentCredit(data: {
    user_id: string;
    amount: number;
    invoice_id: string;
    invoice_number: string;
    payment_id: string;
  }): Promise<string> {
    const supabase = await createClient();
    
    const transaction: TransactionInput = {
      user_id: data.user_id,
      type: 'credit',
      amount: data.amount,
      description: `Payment for invoice: ${data.invoice_number}`,
      metadata: {
        invoice_id: data.invoice_id,
        payment_id: data.payment_id,
        transaction_type: 'payment_credit'
      }
    };
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select('id')
      .single();
    
    if (error) throw new Error(`Failed to create payment credit transaction: ${error.message}`);
    return result.id;
  }
  
  /**
   * Reverse a transaction (for invoice cancellations)
   */
  static async reverseTransaction(transactionId: string, reason: string): Promise<void> {
    const supabase = await createClient();
    
    // Get the original transaction
    const { data: original, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (fetchError) throw new Error(`Failed to fetch transaction: ${fetchError.message}`);
    
    // Create a reversal transaction
    const reversalType = original.type === 'debit' ? 'credit' : 'debit';
    const reversalAmount = original.amount;
    
    const reversal: TransactionInput = {
      user_id: original.user_id,
      type: reversalType as any,
      amount: reversalAmount,
      description: `Reversal: ${original.description} (${reason})`,
      metadata: {
        ...original.metadata,
        reversal_of: transactionId,
        reversal_reason: reason,
        transaction_type: 'reversal'
      },
      reference_number: `REV-${original.reference_number || original.id.slice(0, 8)}`
    };
    
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([reversal]);
    
    if (insertError) throw new Error(`Failed to create reversal transaction: ${insertError.message}`);
  }
  
  /**
   * Update transaction amount (for invoice modifications)
   */
  static async updateTransactionAmount(transactionId: string, newAmount: number): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('transactions')
      .update({ 
        amount: newAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (error) throw new Error(`Failed to update transaction amount: ${error.message}`);
  }
  
  /**
   * Get user's current account balance
   */
  static async getUserAccountBalance(userId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('get_account_balance', {
      p_user_id: userId
    });
    
    if (error) throw new Error(`Failed to get account balance: ${error.message}`);
    return data || 0;
  }
  
  /**
   * Get all transactions for a user
   */
  static async getUserTransactions(userId: string, limit = 50): Promise<any[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
    return data || [];
  }
}
```

### Phase 2: Update Invoice Service

#### 2.1 Extend Invoice Service (`src/lib/invoice-service.ts`)

```typescript
// Add to existing InvoiceService class

/**
 * Create debit transaction when invoice is approved/paid
 */
static async createInvoiceTransaction(invoice: {
  id: string;
  invoice_number: string;
  total_amount: number;
  user_id: string;
  status: string;
}): Promise<string | null> {
  // Only create debit transaction for approved/paid invoices
  if (!['pending', 'paid'].includes(invoice.status)) {
    return null;
  }
  
  return await TransactionService.createInvoiceDebit({
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    total_amount: invoice.total_amount,
    user_id: invoice.user_id
  });
}

/**
 * Update invoice status and handle transactions
 */
static async updateInvoiceStatus(invoiceId: string, newStatus: string): Promise<void> {
  const supabase = await createClient();
  
  // Get current invoice data
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();
  
  if (fetchError) throw new Error(`Failed to fetch invoice: ${fetchError.message}`);
  
  const oldStatus = invoice.status;
  
  // Update invoice status
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);
  
  if (updateError) throw new Error(`Failed to update invoice status: ${updateError.message}`);
  
  // Handle transaction creation/reversal based on status change
  await this.handleStatusChangeTransactions(invoice, oldStatus, newStatus);
}

/**
 * Handle transaction creation/reversal based on status changes
 */
private static async handleStatusChangeTransactions(
  invoice: any, 
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  // Status change: draft/pending → paid/approved (create debit)
  if (['draft', 'pending'].includes(oldStatus) && ['paid', 'pending'].includes(newStatus)) {
    await TransactionService.createInvoiceDebit({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      user_id: invoice.user_id
    });
  }
  
  // Status change: paid/approved → cancelled (reverse debit)
  if (['paid', 'pending'].includes(oldStatus) && newStatus === 'cancelled') {
    // Find the original debit transaction
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', invoice.user_id)
      .eq('metadata->>invoice_id', invoice.id)
      .eq('type', 'debit')
      .eq('status', 'completed');
    
    if (transactions && transactions.length > 0) {
      await TransactionService.reverseTransaction(
        transactions[0].id, 
        'Invoice cancelled'
      );
    }
  }
}
```

### Phase 3: Update API Endpoints

#### 3.1 Update Invoice API (`src/app/api/invoices/[id]/route.ts`)

```typescript
// Add to PATCH method
import { TransactionService } from '@/lib/transaction-service';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // ... existing code ...
  
  try {
    // Update invoice
    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Handle status changes and transactions
    if (updateData.status) {
      await InvoiceService.updateInvoiceStatus(params.id, updateData.status);
    }
    
    return NextResponse.json({ invoice: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 3.2 Update Payment API (`src/app/api/payments/route.ts`)

```typescript
// Add to POST method
import { TransactionService } from '@/lib/transaction-service';

export async function POST(req: NextRequest) {
  // ... existing payment creation code ...
  
  try {
    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    
    if (paymentError) throw paymentError;
    
    // Create credit transaction
    await TransactionService.createPaymentCredit({
      user_id: paymentData.user_id,
      amount: paymentData.amount,
      invoice_id: paymentData.invoice_id,
      invoice_number: invoice.invoice_number,
      payment_id: payment.id
    });
    
    // Update invoice totals
    await InvoiceService.updateInvoiceTotals(supabase, paymentData.invoice_id);
    
    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Phase 4: Account Balance Management

#### 4.1 Create Account Balance Service (`src/lib/account-balance-service.ts`)

```typescript
import { createClient } from '@/lib/SupabaseServerClient';
import { TransactionService } from './transaction-service';

export class AccountBalanceService {
  /**
   * Get user's current account balance
   */
  static async getBalance(userId: string): Promise<number> {
    return await TransactionService.getUserAccountBalance(userId);
  }
  
  /**
   * Update user's account balance (triggers handle this automatically)
   * This is just a helper to ensure balance is current
   */
  static async refreshBalance(userId: string): Promise<number> {
    const supabase = await createClient();
    
    // Trigger balance recalculation by updating a transaction
    const { data: lastTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lastTransaction) {
      // Touch the transaction to trigger balance update
      await supabase
        .from('transactions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', lastTransaction.id);
    }
    
    return await this.getBalance(userId);
  }
  
  /**
   * Get account balance history
   */
  static async getBalanceHistory(userId: string, days = 30): Promise<any[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        description,
        created_at,
        status,
        metadata
      `)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch balance history: ${error.message}`);
    return data || [];
  }
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests (`src/lib/__tests__/transaction-service.test.ts`)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TransactionService } from '../transaction-service';

describe('TransactionService', () => {
  describe('createInvoiceDebit', () => {
    it('should create debit transaction for invoice', async () => {
      const invoiceData = {
        invoice_id: 'test-invoice-id',
        invoice_number: 'INV-2025-01-0001',
        total_amount: 100.50,
        user_id: 'test-user-id'
      };
      
      // Mock Supabase client
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'transaction-id' },
        error: null
      });
      
      // Test the function
      const result = await TransactionService.createInvoiceDebit(invoiceData);
      expect(result).toBe('transaction-id');
    });
  });
  
  describe('reverseTransaction', () => {
    it('should create reversal transaction', async () => {
      // Test implementation
    });
  });
});
```

#### 5.2 Integration Tests

```typescript
// Test complete invoice-to-transaction flow
describe('Invoice Transaction Integration', () => {
  it('should create debit transaction when invoice is approved', async () => {
    // 1. Create invoice
    // 2. Approve invoice
    // 3. Verify debit transaction created
    // 4. Verify account balance updated
  });
  
  it('should create credit transaction when payment is made', async () => {
    // 1. Create invoice and approve
    // 2. Record payment
    // 3. Verify credit transaction created
    // 4. Verify account balance updated
  });
  
  it('should reverse transactions when invoice is cancelled', async () => {
    // 1. Create and approve invoice
    // 2. Cancel invoice
    // 3. Verify reversal transaction created
    // 4. Verify account balance updated
  });
});
```

## Deployment Checklist

### Pre-Deployment
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Transaction service implemented
- [ ] Invoice service updated
- [ ] API endpoints updated
- [ ] Account balance service implemented

### Deployment Steps
- [ ] Deploy application code
- [ ] Test invoice creation → transaction creation
- [ ] Test payment recording → transaction creation
- [ ] Test invoice cancellation → transaction reversal
- [ ] Verify account balances are updating correctly
- [ ] Monitor for 24-48 hours

### Rollback Plan
- [ ] Keep existing transaction triggers (they're still working)
- [ ] If issues occur, temporarily disable transaction creation in application
- [ ] Re-enable old functions if needed (they were backed up)

## Benefits of This Approach

1. **✅ Maintains Existing Infrastructure**: Keeps working balance update triggers
2. **✅ Application Control**: All transaction creation logic in application code
3. **✅ Testable**: Can unit test all transaction logic
4. **✅ Auditable**: Clear transaction trail for all financial operations
5. **✅ Consistent**: All invoices automatically create transactions
6. **✅ Reversible**: Can reverse transactions when invoices are cancelled
7. **✅ Real-time Balances**: Account balances stay current via triggers

## Transaction Flow Examples

### Invoice Creation Flow
```
1. User creates invoice → InvoiceService.createInvoice()
2. Invoice approved → InvoiceService.updateInvoiceStatus()
3. Debit transaction created → TransactionService.createInvoiceDebit()
4. Account balance updated → handle_transaction_balance_update() trigger
```

### Payment Flow
```
1. User records payment → Payment API
2. Credit transaction created → TransactionService.createPaymentCredit()
3. Account balance updated → handle_transaction_balance_update() trigger
4. Invoice totals updated → InvoiceService.updateInvoiceTotals()
```

### Cancellation Flow
```
1. User cancels invoice → InvoiceService.updateInvoiceStatus()
2. Reversal transaction created → TransactionService.reverseTransaction()
3. Account balance updated → handle_transaction_balance_update() trigger
```

This comprehensive plan ensures that every financial operation creates proper transaction records while maintaining the existing account balance system.
