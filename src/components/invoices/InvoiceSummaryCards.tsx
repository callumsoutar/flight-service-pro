"use client";
import React, { useEffect, useState } from "react";

interface Invoice {
  id: string;
  status: string;
}

export default function InvoiceSummaryCards() {
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (!data.invoices) throw new Error("No data");
        const invoices: Invoice[] = data.invoices;
        const total = invoices.length;
        const paid = invoices.filter((inv) => inv.status === "paid").length;
        const pending = invoices.filter((inv) => inv.status === "pending").length;
        setCounts({ total, paid, pending });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invoice summary");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm animate-pulse h-28" />
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm animate-pulse h-28" />
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm animate-pulse h-28" />
      </section>
    );
  }
  if (error) {
    return <div className="text-destructive text-center my-4">{error}</div>;
  }
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
        <div className="text-2xl font-bold">{counts.total}</div>
        <div className="text-muted-foreground mt-1">Total Invoices</div>
      </div>
      <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
        <div className="text-2xl font-bold">{counts.paid}</div>
        <div className="text-muted-foreground mt-1">Paid Invoices</div>
      </div>
      <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
        <div className="text-2xl font-bold">{counts.pending}</div>
        <div className="text-muted-foreground mt-1">Outstanding Invoices</div>
      </div>
    </section>
  );
} 