import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { InvoiceItem } from '@/types/invoice_items';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  companySubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 16,
  },
  billToSection: {
    marginBottom: 8,
  },
  billToLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  billToName: {
    fontSize: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  invoiceDetails: {
    alignItems: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginRight: 8,
    minWidth: 80,
    textAlign: 'right',
  },
  detailValue: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 9,
  },
  descriptionCell: {
    flex: 3,
  },
  quantityCell: {
    flex: 1,
    textAlign: 'right',
  },
  subtotalCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1.5,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 4,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginRight: 30,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    marginTop: 8,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 30,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  paymentSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  paidLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginRight: 30,
  },
  paidValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  balanceLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginRight: 30,
  },
  balanceValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  footer: {
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 9,
  },
  footerText: {
    marginBottom: 4,
  },
  footerSmall: {
    fontSize: 7,
  },
  noItemsText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 12,
  },
});

interface InvoiceSettings {
  schoolName: string;
  billingAddress: string;
  gstNumber: string;
  contactPhone: string;
  contactEmail: string;
  invoiceFooter: string;
  paymentTerms: string;
}

interface InvoicePDFTemplateProps {
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string | null;
    due_date: string | null;
    subtotal: number;
    tax_total: number;
    tax_rate: number;
    total_amount: number;
    total_paid: number;
    balance_due: number;
    status: string;
    user_id: string;
    users?: {
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  };
  items: InvoiceItem[];
  settings?: InvoiceSettings;
}

export default function InvoicePDFTemplate({ invoice, items, settings }: InvoicePDFTemplateProps) {
  const memberName = invoice.users
    ? `${invoice.users.first_name || ''} ${invoice.users.last_name || ''}`.trim() || invoice.users.email
    : invoice.user_id;

  // Default settings if not provided
  const invoiceSettings: InvoiceSettings = settings || {
    schoolName: 'Flight School',
    billingAddress: '',
    gstNumber: '',
    contactPhone: '',
    contactEmail: '',
    invoiceFooter: 'Thank you for your business.',
    paymentTerms: 'Payment terms: Net 30 days.',
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.companyName}>{invoiceSettings.schoolName}</Text>
              {invoiceSettings.billingAddress && (
                <Text style={styles.companySubtitle}>{invoiceSettings.billingAddress}</Text>
              )}
              {invoiceSettings.gstNumber && (
                <Text style={styles.companySubtitle}>GST: {invoiceSettings.gstNumber}</Text>
              )}
              {invoiceSettings.contactPhone && (
                <Text style={styles.companySubtitle}>Ph: {invoiceSettings.contactPhone}</Text>
              )}
              {invoiceSettings.contactEmail && (
                <Text style={styles.companySubtitle}>Email: {invoiceSettings.contactEmail}</Text>
              )}
              <View style={styles.billToSection}>
                <Text style={styles.billToLabel}>Bill To:</Text>
                <Text style={styles.billToName}>{memberName}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice Number:</Text>
                <Text style={styles.detailValue}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice Date:</Text>
                <Text style={styles.detailValue}>{formatDate(invoice.issue_date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date:</Text>
                <Text style={styles.detailValue}>{formatDate(invoice.due_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCell]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.quantityCell]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.subtotalCell]}>Subtotal (incl. tax)</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCell]}>Amount</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.noItemsText}>No items</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.descriptionCell]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.quantityCell]}>{item.quantity || 0}</Text>
                <Text style={[styles.tableCell, styles.subtotalCell]}>
                  ${formatCurrency((item.rate_inclusive || item.unit_price || 0) * (item.quantity || 1))}
                </Text>
                <Text style={[styles.tableCell, styles.amountCell]}>
                  ${formatCurrency(item.line_total || 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal (excl. Tax):</Text>
            <Text style={styles.totalValue}>${formatCurrency(invoice.subtotal || 0)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Tax ({invoice.tax_rate ? Math.round(invoice.tax_rate * 100) : 0}%):
            </Text>
            <Text style={styles.totalValue}>${formatCurrency(invoice.tax_total || 0)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>${formatCurrency(invoice.total_amount || 0)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            <Text style={styles.paidLabel}>Paid:</Text>
            <Text style={styles.paidValue}>${formatCurrency(invoice.total_paid || 0)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.balanceLabel}>Balance Due:</Text>
            <Text style={styles.balanceValue}>${formatCurrency(invoice.balance_due || 0)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{invoiceSettings.invoiceFooter}</Text>
          <Text style={styles.footerSmall}>
            {invoiceSettings.paymentTerms}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

