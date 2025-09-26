"use client";
import { useState, useMemo } from "react";
import { Member } from "./columns";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { UserPlus, Mail } from "lucide-react";

interface StaffTableProps {
  initialData: {
    members: Member[];
    page: number;
    limit: number;
    total: number;
  };
}

const roles = ["All", "Owner", "Admin", "Instructor"];

export default function StaffTable({ initialData }: StaffTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // In-memory filtering for search and role
  const filteredMembers = useMemo(() => {
    let members = initialData.members;
    if (search) {
      const q = search.toLowerCase();
      members = members.filter(
        (m) =>
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "All") {
      members = members.filter((m) => m.role.toLowerCase() === roleFilter.toLowerCase());
    }
    return members;
  }, [initialData.members, search, roleFilter]);

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-6">
      {/* Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold">Staff Directory</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center justify-end">
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-md shadow text-base flex items-center gap-2"
            onClick={() => {}}
          >
            <UserPlus className="h-4 w-4" />
            New Staff
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {search || roleFilter !== "All" ? "No staff members match your search" : "No staff members found"}
            </div>
            <Button variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Add First Staff Member
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Staff Member</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Email</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (member.instructor_id) {
                      window.location.href = `/dashboard/instructors/view/${member.instructor_id}`;
                    } else {
                      window.location.href = `/dashboard/members/view/${member.id}`;
                    }
                  }}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(member.first_name || member.email || "").charAt(0).toUpperCase()}
                          {(member.last_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.first_name || member.last_name
                            ? `${member.first_name || ""} ${member.last_name || ""}`.trim()
                            : member.email
                          }
                        </div>
                        {(member.first_name || member.last_name) && (
                          <div className="text-sm text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {member.email}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary" className="capitalize">
                      {member.role}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={member.status === "active" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {member.status || "active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 