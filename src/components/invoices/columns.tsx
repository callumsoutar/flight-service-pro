import { ColumnDef } from "@tanstack/react-table";
import { Invoice, InvoiceStatus } from "@/types/invoices";
import { Badge } from "../ui/badge";

const statusColorMap: Record<InvoiceStatus, { variant: "default" | "secondary" | "destructive" | "outline", className?: string }> = {
  draft: { variant: "outline", className: "bg-gray-100 text-gray-600 border-gray-200" },
  pending: { variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid: { variant: "secondary", className: "bg-green-100 text-green-800 border-green-200" },
  overdue: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { variant: "outline", className: "bg-slate-100 text-slate-600 border-slate-200" },
  refunded: { variant: "outline", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoice_number",
    header: "Invoice Number",
    cell: ({ row }) => <span className="font-mono">{row.original.invoice_number}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "issue_date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.original.issue_date ? new Date(row.original.issue_date) : null;
      return <span>{date ? date.toISOString().slice(0, 10) : "-"}</span>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "user_id",
    header: "User",
    cell: ({ row }) => <span>{row.original.user_id}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.original.due_date ? new Date(row.original.due_date) : null;
      return <span>{date ? date.toISOString().slice(0, 10) : "-"}</span>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status as InvoiceStatus;
      const color = statusColorMap[status] || statusColorMap.draft;
      return (
        <Badge variant={color.variant} className={color.className + " font-medium capitalize px-3 py-1.5 text-xs"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "total_amount",
    header: "Total",
    cell: ({ row }) => <span>${row.original.total_amount.toFixed(2)}</span>,
    enableSorting: true,
  },
]; 