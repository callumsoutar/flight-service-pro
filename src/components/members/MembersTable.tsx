"use client";
import { useState, useMemo } from "react";
import { columns, Member } from "./columns";
import { DataTable } from "./data-table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { UserPlus } from "lucide-react";

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

  // Stats
  const totalMembers = initialData.members.length;
  const activeMembers = initialData.members.filter((m) => (m.status ?? "active") === "active").length;
  const pendingInvites = initialData.members.filter((m) => (m.status ?? "active") === "pending").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6">
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Total Members</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalMembers}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6">
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Active Members</h3>
          <p className="text-3xl font-bold text-indigo-600">{activeMembers}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6">
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Pending Invites</h3>
          <p className="text-3xl font-bold text-indigo-600">{pendingInvites}</p>
        </div>
      </div>
      {/* Search, Filter, Invite */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2 mb-2">
        <div className="flex gap-2 items-center w-full md:w-auto">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="flex items-center gap-2 ml-auto" variant="default">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>
      {/* Data Table */}
      <DataTable columns={columns} data={filteredMembers} />
    </div>
  );
} 