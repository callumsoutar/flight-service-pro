
"use client";

import { User } from "@/types/users";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Calendar, AlertTriangle, Menu, UserPlus } from "lucide-react";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";

export default function MemberProfileCard({ member, joinDate }: { member: User; joinDate: string }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col md:flex-row md:items-center gap-6 p-6">
        <div className="flex items-center gap-6 flex-1">
          <Avatar className="w-20 h-20 text-3xl">
            <AvatarFallback>
              {member.first_name?.[0]}
              {member.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {member.first_name} {member.last_name}
              </span>
              <Badge className="bg-black text-white">Active</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-gray-600 text-sm mt-1">
              <span>{member.email}</span>
              {member.phone && <span>{member.phone}</span>}
              <span>Member since {joinDate}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-end md:items-center">
          {/* Advanced Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="font-semibold flex items-center gap-2">
                Quick Actions <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuItem>
                <Calendar className="w-4 h-4 mr-2" /> New Booking
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" /> New Invoice
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertTriangle className="w-4 h-4 mr-2 text-red-600" /> New Occurrence
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-4 h-4 mr-2 text-indigo-600" /> Staff Actions
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2 text-indigo-600" /> Add as Instructor
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Menu className="w-4 h-4 mr-2 text-gray-600" /> Account
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => alert('Reset Password')}>Reset Password</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => alert('Change Email')}>Change Email</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* New Booking Button */}
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </CardContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <p className="text-sm text-gray-500 mt-2">
              This action will create {member.first_name} {member.last_name} as an instructor. No extra permissions will be granted yet.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>No</Button>
            <Button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch("/api/instructors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: member.id,
                      is_actively_instructing: false,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to create instructor");
                  setConfirmOpen(false);
                  if (data.instructor && data.instructor.id) {
                    window.location.assign(`/dashboard/instructors/view/${data.instructor.id}`);
                  }
                } catch (err: unknown) {
                  if (err instanceof Error) {
                    setError(err.message);
                  } else {
                    setError("Unknown error");
                  }
                } finally {
                  setLoading(false);
                }
              }}
              className="w-24 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={loading}
            >
              {loading ? "Creating..." : "Yes"}
            </Button>
          </DialogFooter>
          {error && <div className="text-red-500 text-sm mt-2 w-full">{error}</div>}
        </DialogContent>
      </Dialog>
    </Card>
  );
} 