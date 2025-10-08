import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { renderToStream } from '@react-pdf/renderer';
import InvoicePDFTemplate from '@/components/invoices/InvoicePDFTemplate';
import { InvoiceItem } from '@/types/invoice_items';

async function getInvoiceSettings() {
  const supabase = await createClient();
  
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .in('category', ['general', 'invoicing'])
    .in('setting_key', [
      'school_name',
      'billing_address',
      'gst_number',
      'contact_phone',
      'contact_email',
      'invoice_footer_message',
      'payment_terms_message'
    ]);
  
  const settingsMap: Record<string, string> = {};
  settings?.forEach((setting) => {
    try {
      if (setting.data_type === 'string') {
        try {
          settingsMap[setting.setting_key] = JSON.parse(String(setting.setting_value));
        } catch {
          settingsMap[setting.setting_key] = String(setting.setting_value);
        }
      } else {
        settingsMap[setting.setting_key] = String(setting.setting_value);
      }
    } catch (error) {
      console.error(`Error parsing setting ${setting.setting_key}:`, error);
    }
  });
  
  return {
    schoolName: settingsMap.school_name || 'Flight School',
    billingAddress: settingsMap.billing_address || '',
    gstNumber: settingsMap.gst_number || '',
    contactPhone: settingsMap.contact_phone || '',
    contactEmail: settingsMap.contact_email || '',
    invoiceFooter: settingsMap.invoice_footer_message || 'Thank you for your business.',
    paymentTerms: settingsMap.payment_terms_message || 'Payment terms: Net 30 days.',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user role using the standardized RPC function
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    const canViewAllInvoices = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

    // Fetch invoice with user details
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, users:user_id(id, first_name, last_name, email)')
      .eq('id', id)
      .limit(1);

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to fetch invoice' },
        { status: 500 }
      );
    }

    const invoice = invoices && invoices.length > 0 ? invoices[0] : null;

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Security check: instructors/admins/owners can download any invoice, others can only download their own
    if (!canViewAllInvoices && invoice.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only download your own invoices' },
        { status: 403 }
      );
    }

    // Don't allow PDF generation for draft invoices
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot generate PDF for draft invoices' },
        { status: 400 }
      );
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch invoice items' },
        { status: 500 }
      );
    }

    // Fetch invoice settings
    const settings = await getInvoiceSettings();

    // Generate PDF
    const pdfStream = await renderToStream(
      InvoicePDFTemplate({
        invoice,
        items: (items || []) as InvoiceItem[],
        settings,
      })
    );

    // Convert stream to buffer for Next.js response
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // Ensure chunk is a Buffer
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(bufferChunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

