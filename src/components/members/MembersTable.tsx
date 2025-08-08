"use client";
import { useState, useMemo } from "react";
import { columns, Member } from "./columns";
import { DataTable } from "./data-table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { UserPlus } from "lucide-react";
import { AddMemberModal } from "./AddMemberModal";

interface MembersTableProps {
  initialData: {
    members: Member[];
    page: number;
    limit: number;
    total: number;
  };
}

const roles = ["All", "Owner", "Admin", "Instructor", "Member", "Student"];

export default function MembersTable({ initialData }: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [members, setMembers] = useState(initialData.members);

  // Refresh function to update the members list
  const refreshMembers = async () => {
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to refresh members:', error);
    }
  };

  // In-memory filtering for search and role
  const filteredMembers = useMemo(() => {
    let filtered = members;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "All") {
      filtered = filtered.filter((m) => m.role.toLowerCase() === roleFilter.toLowerCase());
    }
    return filtered;
  }, [members, search, roleFilter]);

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
      {/* Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold">Member Directory</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center justify-end">
          <Input
            placeholder="Search members..."
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2"
            onClick={() => setModalOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            New Member
          </Button>
        </div>
      </div>
      {/* Data Table */}
      <DataTable columns={columns} data={filteredMembers} />
      <AddMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        refresh={refreshMembers}
      />
    </div>
  );
} 