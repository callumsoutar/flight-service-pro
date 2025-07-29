"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/users";
import { Aircraft } from "@/types/aircraft";
import { Users, User as UserIcon, UserCheck, Plane } from "lucide-react";

// Define a type for the joined instructor row
export type JoinedInstructor = {
  id: string;
  user_id: string;
  users: User;
};

interface BookingResourcesProps {
  member?: User | null;
  instructor?: JoinedInstructor | null;
  aircraft?: Aircraft | null;
}

export default function BookingResources({ member, instructor, aircraft }: BookingResourcesProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Resources</CardTitle>
      </CardHeader>
      <CardContent>
        {/* People Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-base font-semibold">
            <Users className="w-5 h-5 text-primary" /> People
          </div>
          <div className="bg-muted/50 rounded-xl p-4 mb-2 flex items-center gap-3">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold">Member <Badge className="ml-2">Student</Badge></div>
              <div className="mt-1">{member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email : "-"}</div>
              <div className="text-gray-500 text-sm">{member?.email || "-"}</div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold">Instructor <Badge className="ml-2" variant="secondary">Staff</Badge></div>
              <div className="mt-1">
                {instructor?.users
                  ? `${instructor.users.first_name || ""} ${instructor.users.last_name || ""}`.trim() || instructor.users.email
                  : "-"}
              </div>
              <div className="text-gray-500 text-sm">{instructor?.users?.email || "-"}</div>
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="my-4 border-t border-muted" />
        {/* Aircraft Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-base font-semibold mt-4">
            <Plane className="w-5 h-5 text-primary" /> Aircraft
          </div>
          <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold mb-1">{aircraft ? `${aircraft.registration} (${aircraft.type || "Unknown"})` : "-"}</div>
              <div className="text-gray-500 text-sm">{aircraft?.manufacturer || ""}{aircraft?.year_manufactured ? `, ${aircraft.year_manufactured}` : ""}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 