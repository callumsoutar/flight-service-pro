"use client";

import { User } from "@/types/users";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Edit, ChevronDown, FileText, Calendar, AlertTriangle } from "lucide-react";

export default function MemberProfileCard({ member, joinDate }: { member: User; joinDate: string }) {
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
          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="font-semibold flex items-center gap-2">
                Quick Actions <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => alert('New Invoice action')}>
                <FileText className="w-4 h-4 mr-2" /> New Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert('New Booking action')}>
                <Calendar className="w-4 h-4 mr-2" /> New Booking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert('Report Occurrence action')}>
                <AlertTriangle className="w-4 h-4 mr-2 text-red-600" /> Report Occurrence
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Edit Profile Button */}
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 