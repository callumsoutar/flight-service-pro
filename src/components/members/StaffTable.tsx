"use client";
import { useState, useMemo } from "react";
import { columns, Member } from "./columns";
import { DataTable } from "./data-table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { UserPlus } from "lucide-react";

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
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            New Staff
          </Button>
        </div>
      </div>
      {/* Data Table */}
      <DataTable columns={columns} data={filteredMembers} />
    </div>
  );
} 