"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Calendar, Settings } from "lucide-react";
import TaxRateManager from "./TaxRateManager";

export default function InvoicingTab() {
  return (
    <div className="space-y-6">
      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Configuration
          </CardTitle>
          <CardDescription>
            Configure how invoices are generated and formatted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Invoice settings configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings - Now with full TaxRateManager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tax Configuration
          </CardTitle>
          <CardDescription>
            Manage tax rates and tax calculation settings for invoicing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxRateManager />
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Payment Terms
          </CardTitle>
          <CardDescription>
            Set default payment terms and due dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Payment terms configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Invoice Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Invoice Templates
          </CardTitle>
          <CardDescription>
            Customize invoice templates and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Invoice template customization coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}