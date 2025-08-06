"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

import { Calendar, Clock, AlertTriangle, Settings } from "lucide-react";

export default function BookingsTab() {
  return (
    <div className="space-y-6">
      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Booking Rules
          </CardTitle>
          <CardDescription>
            Configure booking restrictions and advance booking limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Booking rules configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Slot Configuration
          </CardTitle>
          <CardDescription>
            Set available booking time slots and durations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Time slot configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Cancellation Policy
          </CardTitle>
          <CardDescription>
            Configure cancellation deadlines and penalties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Cancellation policy configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Booking Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Booking Workflow
          </CardTitle>
          <CardDescription>
            Configure the booking approval and confirmation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Booking workflow configuration coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}