"use client";
import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { columns as baseColumns } from "./columns";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoices";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useRef, useLayoutEffect } from "react";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export default function InvoicesTable() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const router = useRouter();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useLayoutEffect(() => {
    const idx = STATUS_TABS.findIndex((t) => t.value === statusFilter);
    const tab = tabRefs.current[idx];
    const indicator = indicatorRef.current;
    if (tab && indicator) {
      const rect = tab.getBoundingClientRect();
      const parentRect = tab.parentElement?.getBoundingClientRect();
      if (parentRect) {
        indicator.style.left = `${rect.left - parentRect.left}px`;
        indicator.style.width = `${rect.width}px`;
      }
    }
  }, [statusFilter]);

  // Patch columns to show user info instead of user_id
  const columns = React.useMemo<ColumnDef<Invoice>[]>(() => {
    return baseColumns.map((col) => {
      if ((col as { id?: string; accessorKey?: string }).id === "user_id" || (col as { id?: string; accessorKey?: string }).accessorKey === "user_id") {
        return {
          ...col,
          cell: ({ row }: { row: { original: Invoice & { users?: { first_name?: string; last_name?: string } } } }) => {
            const user = row.original.users;
            if (!user) return <span>-</span>;
            return (
              <span>
                {user.first_name || ""} {user.last_name || ""}
              </span>
            );
          },
        };
      }
      return col;
    });
  }, []);

  // Filter invoices by status
  const filteredInvoices = React.useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const table = useReactTable({
    data: filteredInvoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>;
  }

  return (
    <div className="w-full">
      {/* Improved Status Tabs - now left-aligned with animated indicator */}
      <div className="mb-6">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full max-w-md">
          <div className="relative">
            <TabsList className="w-full flex gap-1 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-1 relative overflow-hidden">
              {/* Animated indicator */}
              <div
                ref={indicatorRef}
                className="absolute top-1 left-0 h-[calc(100%-0.5rem)] bg-blue-600 rounded-xl z-0 border-2 border-blue-700 shadow"
                style={{
                  pointerEvents: "none",
                  transition: 'left 400ms cubic-bezier(0.4,0,0.2,1), width 400ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms cubic-bezier(0.4,0,0.2,1)',
                  willChange: 'left, width, transform, opacity',
                  transform: 'scale(1.04)',
                  opacity: 0.96,
                }}
              />
              {STATUS_TABS.map((tab, i) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  ref={el => {
                    tabRefs.current[i] = el;
                  }}
                  className={
                    "flex-1 text-base px-3 py-2 rounded-xl transition-all font-medium relative z-10 " +
                    "data-[state=active]:text-white data-[state=active]:font-bold " +
                    "data-[state=inactive]:text-gray-500"
                  }
                  style={{ minWidth: 0 }}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => router.push(`/dashboard/invoices/view/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
} 