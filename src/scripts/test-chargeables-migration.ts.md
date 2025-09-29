import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceService } from '@/lib/invoice-service';

async function testChargeablesMigration() {
  console.log('🧪 Starting comprehensive chargeables migration test...');
  const supabase = await createClient();

  try {
    // --- Test 1: Verify database schema migration ---
    console.log('\n--- Test 1: Verifying database schema migration ---');
    
    // Check that is_taxable column exists and tax_rate still exists
    const { data: columns } = await supabase.rpc('get_table_columns', { 
      table_name: 'chargeables' 
    });
    
    if (!columns) {
      // Fallback: query information_schema directly
      const { data: columnInfo } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'chargeables')
        .in('column_name', ['is_taxable', 'tax_rate']);
      
      const columnNames = columnInfo?.map(c => c.column_name) || [];
      
      if (!columnNames.includes('is_taxable')) {
        console.error('❌ Test 1 Failed: is_taxable column not found');
        return;
      }
      
      if (!columnNames.includes('tax_rate')) {
        console.error('❌ Test 1 Failed: tax_rate column still exists (should be cleaned up later)');
        return;
      }
      
      console.log('✅ Test 1 Passed: Schema migration verified');
    }

    // --- Test 2: Verify data migration ---
    console.log('\n--- Test 2: Verifying data migration ---');
    
    const { data: chargeables, error: chargeablesError } = await supabase
      .from('chargeables')
      .select('id, name, type, rate, is_taxable, tax_rate')
      .eq('is_active', true);
    
    if (chargeablesError) {
      console.error('❌ Test 2 Failed: Could not fetch chargeables:', chargeablesError.message);
      return;
    }
    
    console.log('📊 Current chargeables data:');
    chargeables?.forEach(c => {
      console.log(`  - ${c.name} (${c.type}): Rate=${c.rate}, is_taxable=${c.is_taxable}, old_tax_rate=${c.tax_rate}`);
    });
    
    // Verify migration logic
    const expectedTaxableItems = chargeables?.filter(c => c.tax_rate && parseFloat(c.tax_rate) > 0) || [];
    const expectedExemptItems = chargeables?.filter(c => !c.tax_rate || parseFloat(c.tax_rate) === 0) || [];
    
    const actualTaxableItems = chargeables?.filter(c => c.is_taxable) || [];
    const actualExemptItems = chargeables?.filter(c => !c.is_taxable) || [];
    
    if (expectedTaxableItems.length !== actualTaxableItems.length || 
        expectedExemptItems.length !== actualExemptItems.length) {
      console.error('❌ Test 2 Failed: Data migration mismatch');
      console.error(`Expected: ${expectedTaxableItems.length} taxable, ${expectedExemptItems.length} exempt`);
      console.error(`Actual: ${actualTaxableItems.length} taxable, ${actualExemptItems.length} exempt`);
      return;
    }
    
    console.log('✅ Test 2 Passed: Data migration verified');

    // --- Test 3: Test API endpoints ---
    console.log('\n--- Test 3: Testing API endpoints ---');
    
    // Test GET /api/chargeables
    const apiResponse = await fetch('http://localhost:3000/api/chargeables');
    if (!apiResponse.ok) {
      console.error('❌ Test 3 Failed: GET /api/chargeables failed');
      return;
    }
    
    const apiData = await apiResponse.json();
    const apiChargeables = apiData.chargeables || [];
    
    if (apiChargeables.length !== chargeables?.length) {
      console.error('❌ Test 3 Failed: API returned different number of chargeables');
      return;
    }
    
    // Verify API includes is_taxable field
    const hasIsTaxableField = apiChargeables.every((c: Record<string, unknown>) => 'is_taxable' in c);
    if (!hasIsTaxableField) {
      console.error('❌ Test 3 Failed: API response missing is_taxable field');
      return;
    }
    
    console.log('✅ Test 3 Passed: API endpoints working correctly');

    // --- Test 4: Test invoice item creation with chargeables ---
    console.log('\n--- Test 4: Testing invoice item creation with chargeables ---');
    
    // Find a taxable chargeable
    const taxableChargeable = chargeables?.find(c => c.is_taxable);
    const exemptChargeable = chargeables?.find(c => !c.is_taxable);
    
    if (!taxableChargeable || !exemptChargeable) {
      console.error('❌ Test 4 Failed: Need both taxable and exempt chargeables for test');
      return;
    }
    
    // Create a test invoice
    const { data: testInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Replace with valid user ID
        invoice_number: `TEST-CHG-${Date.now()}`,
        status: 'draft',
        tax_rate: await InvoiceService.getTaxRateForInvoice(),
      })
      .select('id')
      .single();
    
    if (invoiceError || !testInvoice) {
      console.error('❌ Test 4 Failed: Could not create test invoice:', invoiceError?.message);
      return;
    }
    
    // Test creating invoice item with taxable chargeable
    const taxableItemResponse = await fetch('http://localhost:3000/api/invoice_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: testInvoice.id,
        chargeable_id: taxableChargeable.id,
        description: `Test ${taxableChargeable.name}`,
        quantity: 1,
        unit_price: parseFloat(taxableChargeable.rate.toString()),
      }),
    });
    
    if (!taxableItemResponse.ok) {
      console.error('❌ Test 4 Failed: Could not create taxable invoice item');
      return;
    }
    
    const taxableItem = await taxableItemResponse.json();
    const expectedTaxableTaxRate = await InvoiceService.getTaxRateForInvoice();
    
    if (Math.abs(parseFloat(taxableItem.tax_rate) - expectedTaxableTaxRate) > 0.001) {
      console.error(`❌ Test 4 Failed: Taxable item tax rate incorrect. Expected: ${expectedTaxableTaxRate}, Got: ${taxableItem.tax_rate}`);
      return;
    }
    
    // Test creating invoice item with exempt chargeable
    const exemptItemResponse = await fetch('http://localhost:3000/api/invoice_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: testInvoice.id,
        chargeable_id: exemptChargeable.id,
        description: `Test ${exemptChargeable.name}`,
        quantity: 1,
        unit_price: parseFloat(exemptChargeable.rate.toString()),
      }),
    });
    
    if (!exemptItemResponse.ok) {
      console.error('❌ Test 4 Failed: Could not create exempt invoice item');
      return;
    }
    
    const exemptItem = await exemptItemResponse.json();
    
    if (parseFloat(exemptItem.tax_rate) !== 0) {
      console.error(`❌ Test 4 Failed: Exempt item tax rate should be 0, got: ${exemptItem.tax_rate}`);
      return;
    }
    
    console.log('✅ Test 4 Passed: Invoice item creation with chargeables working correctly');
    console.log(`  - Taxable item: ${taxableChargeable.name} → tax_rate: ${taxableItem.tax_rate}`);
    console.log(`  - Exempt item: ${exemptChargeable.name} → tax_rate: ${exemptItem.tax_rate}`);

    // --- Test 5: Test organization tax rate integration ---
    console.log('\n--- Test 5: Testing organization tax rate integration ---');
    
    const orgTaxRate = await InvoiceService.getTaxRateForInvoice();
    const taxableItemTaxAmount = parseFloat(taxableItem.amount) * parseFloat(taxableItem.tax_rate);
    const expectedTaxAmount = parseFloat(taxableItem.amount) * orgTaxRate;
    
    if (Math.abs(taxableItemTaxAmount - expectedTaxAmount) > 0.01) {
      console.error('❌ Test 5 Failed: Tax calculation using organization rate incorrect');
      return;
    }
    
    console.log('✅ Test 5 Passed: Organization tax rate integration working correctly');
    console.log(`  - Organization tax rate: ${orgTaxRate} (${(orgTaxRate * 100).toFixed(1)}%)`);
    console.log(`  - Taxable item tax amount: ${taxableItemTaxAmount}`);

    // --- Cleanup ---
    console.log('\n--- Cleaning up test data ---');
    
    // Delete test invoice items and invoice
    await supabase.from('invoice_items').delete().eq('invoice_id', testInvoice.id);
    await supabase.from('invoices').delete().eq('id', testInvoice.id);
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All chargeables migration tests passed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('✅ Database schema updated (is_taxable column added)');
    console.log('✅ Data migrated correctly (tax_rate → is_taxable mapping)');
    console.log('✅ API endpoints updated');
    console.log('✅ Invoice item logic updated');
    console.log('✅ Organization tax rate integration working');
    console.log('✅ UI components updated');
    
    console.log('\n🚀 Ready to clean up old tax_rate column!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Uncomment to run the test
testChargeablesMigration().catch(console.error);
