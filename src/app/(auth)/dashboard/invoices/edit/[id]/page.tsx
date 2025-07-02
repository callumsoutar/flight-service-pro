import InvoiceEditClient from "./InvoiceEditClient";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return null;
  return <InvoiceEditClient id={id} />;
} 