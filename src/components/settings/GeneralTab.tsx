"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building, Mail } from "lucide-react";

export default function GeneralTab() {
  return (
    <div className="space-y-6">
      {/* School Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            School Information
          </CardTitle>
          <CardDescription>
            Basic information about your flight school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">School Name</label>
              <Input placeholder="Flight School Name" disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Registration Number</label>
              <Input placeholder="ABC123" disabled />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <Textarea placeholder="Brief description of your flight school..." rows={3} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Primary contact details for your school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
              <Input placeholder="contact@flightschool.com" disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number</label>
              <Input placeholder="+1 (555) 123-4567" disabled />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
            <Textarea placeholder="123 Airport Road, Aviation City, AC 12345" rows={2} disabled />
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-wide preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            System settings configuration coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}