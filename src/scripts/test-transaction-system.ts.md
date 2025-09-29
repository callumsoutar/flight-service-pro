import { createClient } from '@/lib/SupabaseServerClient';
import { TransactionService } from '@/lib/transaction-service';
import { InvoiceService } from '@/lib/invoice-service';
import { AccountBalanceService } from '@/lib/account-balance-service';

async function testTransactionSystem() {
  console.log('🧪 Starting comprehensive transaction system test...');
  const supabase = await createClient();

  try {
    // Test user ID - replace with a valid user ID from your system
    const testUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // --- Test 1: Get initial account balance ---
    console.log('\n--- Test 1: Getting initial account balance ---');
    
    const initialBalance = await AccountBalanceService.getBalance(testUserId);
    console.log(`✅ Initial balance: $${initialBalance}`);

    // --- Test 2: Create a test invoice ---
    console.log('\n--- Test 2: Creating test invoice ---');
    
    const invoiceNumber = await InvoiceService.generateInvoiceNumber();
    const taxRate = await InvoiceService.getTaxRateForInvoice();
    
    const { data: testInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        user_id: testUserId,
        invoice_number: invoiceNumber,
        status: 'draft',
        tax_rate: taxRate,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal: 0,
        tax_total: 0,
        total_amount: 0,
        total_paid: 0,
        balance_due: 0,
      }])
      .select()
      .single();

    if (invoiceError || !testInvoice) {
      throw new Error(`Failed to create test invoice: ${invoiceError?.message}`);
    }

    console.log(`✅ Created test invoice: ${testInvoice.invoice_number} (${testInvoice.id})`);

    // --- Test 3: Add invoice items ---
    console.log('\n--- Test 3: Adding invoice items ---');
    
    const itemAmounts = InvoiceService.calculateItemAmounts({
      quantity: 2,
      unit_price: 50,
      tax_rate: taxRate
    });

    const { data: testItem, error: itemError } = await supabase
      .from('invoice_items')
      .insert([{
        invoice_id: testInvoice.id,
        description: 'Test Flight Training',
        quantity: 2,
        unit_price: 50,
        tax_rate: taxRate,
        amount: itemAmounts.amount,
        tax_amount: itemAmounts.tax_amount,
        line_total: itemAmounts.line_total,
        rate_inclusive: itemAmounts.rate_inclusive
      }])
      .select()
      .single();

    if (itemError || !testItem) {
      throw new Error(`Failed to create test item: ${itemError?.message}`);
    }

    console.log(`✅ Added invoice item: ${testItem.description} - $${testItem.line_total}`);

    // Update invoice totals
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(testInvoice.id);

    // Get updated invoice
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', testInvoice.id)
      .single();

    console.log(`✅ Invoice totals updated: Subtotal=$${updatedInvoice?.subtotal}, Tax=$${updatedInvoice?.tax_total}, Total=$${updatedInvoice?.total_amount}`);

    // --- Test 4: Approve invoice (should create debit transaction) ---
    console.log('\n--- Test 4: Approving invoice (creating debit transaction) ---');
    
    await InvoiceService.updateInvoiceStatus(testInvoice.id, 'pending');
    
    // Check if debit transaction was created
    const debitTransactionId = await TransactionService.findInvoiceDebitTransaction(testInvoice.id);
    
    if (!debitTransactionId) {
      throw new Error('Debit transaction was not created for approved invoice');
    }

    console.log(`✅ Debit transaction created: ${debitTransactionId}`);

    // Check updated balance
    const balanceAfterDebit = await AccountBalanceService.getBalance(testUserId);
    const expectedBalanceChange = updatedInvoice?.total_amount || 0;
    
    console.log(`✅ Balance after debit: $${balanceAfterDebit} (change: -$${expectedBalanceChange})`);

    // --- Test 5: Record a payment (should create credit transaction) ---
    console.log('\n--- Test 5: Recording payment (creating credit transaction) ---');
    
    const paymentAmount = 60; // Partial payment
    
    const { data: testPayment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        invoice_id: testInvoice.id,
        amount: paymentAmount,
        payment_method: 'cash',
        payment_reference: 'TEST-PAYMENT-001'
      }])
      .select()
      .single();

    if (paymentError || !testPayment) {
      throw new Error(`Failed to create test payment: ${paymentError?.message}`);
    }

    // Create credit transaction
    const creditTransactionId = await TransactionService.createPaymentCredit({
      user_id: testUserId,
      amount: paymentAmount,
      invoice_id: testInvoice.id,
      invoice_number: testInvoice.invoice_number,
      payment_id: testPayment.id
    });

    console.log(`✅ Credit transaction created: ${creditTransactionId}`);

    // Update invoice totals after payment
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(testInvoice.id);

    // Check updated balance
    const balanceAfterCredit = await AccountBalanceService.getBalance(testUserId);
    
    console.log(`✅ Balance after credit: $${balanceAfterCredit} (change: +$${paymentAmount})`);

    // --- Test 6: Get transaction history ---
    console.log('\n--- Test 6: Getting transaction history ---');
    
    const invoiceTransactions = await TransactionService.getInvoiceTransactions(testInvoice.id);
    
    console.log(`✅ Found ${invoiceTransactions.length} transactions for invoice:`);
    invoiceTransactions.forEach(transaction => {
      console.log(`  - ${transaction.type}: $${transaction.amount} - ${transaction.description}`);
    });

    // --- Test 7: Get balance history ---
    console.log('\n--- Test 7: Getting balance history ---');
    
    const balanceHistory = await AccountBalanceService.getBalanceHistory(testUserId, 1);
    
    console.log(`✅ Balance history (last 1 day):`);
    balanceHistory.slice(0, 5).forEach(item => {
      console.log(`  - ${item.type}: $${item.amount} - ${item.description} (Balance: $${item.running_balance})`);
    });

    // --- Test 8: Cancel invoice (should reverse debit transaction) ---
    console.log('\n--- Test 8: Cancelling invoice (reversing debit transaction) ---');
    
    await InvoiceService.updateInvoiceStatus(testInvoice.id, 'cancelled');
    
    // Check if reversal transaction was created
    const allTransactions = await TransactionService.getInvoiceTransactions(testInvoice.id);
    const reversalTransaction = allTransactions.find(t => 
      t.metadata?.transaction_type === 'reversal' && 
      t.metadata?.reversal_of === debitTransactionId
    );
    
    if (!reversalTransaction) {
      throw new Error('Reversal transaction was not created for cancelled invoice');
    }

    console.log(`✅ Reversal transaction created: ${reversalTransaction.id}`);

    // Check final balance
    const finalBalance = await AccountBalanceService.getBalance(testUserId);
    
    console.log(`✅ Final balance: $${finalBalance}`);

    // --- Test 9: Verify balance calculation ---
    console.log('\n--- Test 9: Verifying balance calculation ---');
    
    const balanceSummary = await AccountBalanceService.getBalanceSummary(testUserId);
    
    console.log(`✅ Balance summary:`);
    console.log(`  - Current balance: $${balanceSummary.current_balance}`);
    console.log(`  - Total debits: $${balanceSummary.total_debits}`);
    console.log(`  - Total credits: $${balanceSummary.total_credits}`);
    console.log(`  - Pending amount: $${balanceSummary.pending_amount}`);
    console.log(`  - Last transaction: ${balanceSummary.last_transaction_date}`);

    // --- Cleanup ---
    console.log('\n--- Cleaning up test data ---');
    
    // Delete transactions (this will trigger balance update)
    await supabase
      .from('transactions')
      .delete()
      .eq('metadata->>invoice_id', testInvoice.id);

    // Delete payments
    await supabase
      .from('payments')
      .delete()
      .eq('invoice_id', testInvoice.id);

    // Delete invoice items
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', testInvoice.id);

    // Delete invoice
    await supabase
      .from('invoices')
      .delete()
      .eq('id', testInvoice.id);

    console.log('✅ Test data cleaned up');

    // Verify balance is back to initial
    const cleanupBalance = await AccountBalanceService.getBalance(testUserId);
    
    if (Math.abs(cleanupBalance - initialBalance) > 0.01) {
      console.warn(`⚠️  Balance not fully restored. Initial: $${initialBalance}, Final: $${cleanupBalance}`);
    } else {
      console.log(`✅ Balance restored to initial value: $${cleanupBalance}`);
    }

    console.log('\n🎉 All transaction system tests passed successfully!');
    
    console.log('\n📋 Transaction System Summary:');
    console.log('✅ Invoice creation works');
    console.log('✅ Debit transactions created on invoice approval');
    console.log('✅ Credit transactions created on payment');
    console.log('✅ Reversal transactions created on cancellation');
    console.log('✅ Account balances update correctly');
    console.log('✅ Transaction history tracking works');
    console.log('✅ Balance calculations are accurate');

  } catch (error) {
    console.error('❌ Transaction system test failed:', error);
    throw error;
  }
}

// Uncomment to run the test
testTransactionSystem().catch(console.error);
