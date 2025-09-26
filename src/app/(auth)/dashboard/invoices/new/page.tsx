import NewInvoiceForm from "./NewInvoiceForm";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function NewInvoicePage({}: ProtectedPageProps) {
  return <NewInvoiceForm />;
}

// Export protected component with role restriction for admin/owner only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(NewInvoicePage, ROLE_CONFIGS.ADMIN_ONLY) as any; 