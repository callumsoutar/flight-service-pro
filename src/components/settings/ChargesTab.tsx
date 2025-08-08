"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DollarSign, Plane, Clock, Fuel } from "lucide-react";

export default function ChargesTab() {
  return (
    <div className="space-y-6">
      {/* Aircraft Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Aircraft Charge Rates
          </CardTitle>
          <CardDescription>
            Configure hourly rates and charges for aircraft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Aircraft charge rate management coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Instructor Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Instructor Rates
          </CardTitle>
          <CardDescription>
            Set hourly rates for different types of instruction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Instructor rate configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Additional Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Additional Charges
          </CardTitle>
          <CardDescription>
            Configure landing fees, fuel surcharges, and other charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Additional charges configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Fuel Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Fuel Pricing
          </CardTitle>
          <CardDescription>
            Manage fuel prices and fuel-related charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Fuel pricing configuration coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}