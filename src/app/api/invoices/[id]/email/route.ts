import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDFTemplate from '@/components/invoices/InvoicePDFTemplate';
import { InvoiceItem } from '@/types/invoice_items';
import { resend, EMAIL_CONFIG } from '@/lib/email/resend-client';
import { format } from 'date-fns';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if email service is available
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

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

    const canSendAllInvoices = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

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

    // Security check: instructors/admins/owners can email any invoice, others can only email their own
    if (!canSendAllInvoices && invoice.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only email your own invoices' },
        { status: 403 }
      );
    }

    // Don't allow emailing draft invoices
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot email draft invoices' },
        { status: 400 }
      );
    }

    // Check if recipient has an email address
    const recipientEmail = invoice.users?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email not found' },
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
    const pdfBuffer = await renderToBuffer(
      InvoicePDFTemplate({
        invoice,
        items: (items || []) as InvoiceItem[],
        settings,
      })
    );

    // Format the invoice date
    const invoiceDate = invoice.issue_date 
      ? format(new Date(invoice.issue_date), 'dd MMM yyyy')
      : 'N/A';

    // Create simple email body
    const emailBody = `
      <p>Please find our invoice #${invoice.invoice_number} dated ${invoiceDate} attached.</p>
      <p>Please contact us if you are unable to open the attachment, or if you prefer us to post invoices to you.</p>
      <p>Regards,<br/>
      ${EMAIL_CONFIG.COMPANY_NAME}</p>
    `;

    // Send email with PDF attachment
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject: `Invoice #${invoice.invoice_number}`,
      html: emailBody,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
      headers: {
        'X-Invoice-ID': invoice.id,
        'X-User-ID': invoice.user_id,
      },
    });

    if (error) {
      console.error('Failed to send invoice email:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('Invoice email sent:', {
      messageId: data?.id,
      to: recipientEmail,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
    });

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      recipientEmail,
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}

