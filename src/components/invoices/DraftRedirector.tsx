"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DraftRedirector({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  useEffect(() => {
    router.push(`/dashboard/invoices/edit/${invoiceId}`);
  }, [invoiceId, router]);
  return null;
} 