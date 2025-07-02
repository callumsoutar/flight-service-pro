"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import * as React from "react";

export default function InvoiceOptionsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          Options <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => alert('Resend invoice')}>Resend</DropdownMenuItem>
        <DropdownMenuItem onClick={() => alert('Mark as Paid')}>Mark as Paid</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 