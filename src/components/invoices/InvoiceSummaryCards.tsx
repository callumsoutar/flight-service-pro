"use client";
import React, { useEffect, useState } from "react";
import { FileText, CheckCircle, AlertCircle } from "lucide-react";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start animate-pulse h-32" />
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start animate-pulse h-32" />
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start animate-pulse h-32" />
      </div>
    );
  }
  if (error) {
    return <div className="text-destructive text-center my-4">{error}</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><FileText className="w-6 h-6 text-indigo-600" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Total Invoices</h3>
        <p className="text-3xl font-bold text-indigo-600">{counts.total}</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><CheckCircle className="w-6 h-6 text-green-500" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Paid Invoices</h3>
        <p className="text-3xl font-bold text-green-500">{counts.paid}</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><AlertCircle className="w-6 h-6 text-yellow-500" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Outstanding Invoices</h3>
        <p className="text-3xl font-bold text-yellow-500">{counts.pending}</p>
      </div>
    </div>
  );
} 