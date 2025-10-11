"use client";
import { useState, useMemo } from "react";
import { columns, Member } from "./columns";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { UserPlus } from "lucide-react";
import { AddMemberModal } from "./AddMemberModal";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "@/lib/utils";

interface MembersTableProps {
  initialData: {
    members: Member[];
    page: number;
    limit: number;
    total: number;
  };
  userRole?: string;
}

type ContactTab = "members" | "instructors" | "staff" | "all";

export default function MembersTable({ initialData, userRole }: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ContactTab>("members");
  const [modalOpen, setModalOpen] = useState(false);
  const [members, setMembers] = useState(initialData.members);
  const [sorting, setSorting] = useState<SortingState>([]);
  const router = useRouter();

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

  // In-memory filtering for search and tab
  const filteredMembers = useMemo(() => {
    let filtered = members;
    
    // Filter by tab first
    switch (activeTab) {
      case "members":
        filtered = filtered.filter((m) => m.role.toLowerCase() === "member");
        break;
      case "instructors":
        filtered = filtered.filter((m) => m.role.toLowerCase() === "instructor");
        break;
      case "staff":
        filtered = filtered.filter((m) => 
          m.role.toLowerCase() === "admin" || 
          m.role.toLowerCase() === "owner"
        );
        break;
      case "all":
        // No filtering needed
        break;
    }
    
    // Then filter by search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [members, search, activeTab]);

  const table = useReactTable<Member>({
    data: filteredMembers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const getTabTitle = () => {
    switch (activeTab) {
      case "members":
        return "Member Directory";
      case "instructors":
        return "Instructor Directory";
      case "staff":
        return "Staff Directory";
      case "all":
        return "Contact Directory";
      default:
        return "Contact Directory";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold">{getTabTitle()}</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center justify-end">
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          {/* Only show Add Member button for admin, owner, and instructor roles */}
          {userRole && !['member', 'student'].includes(userRole.toLowerCase()) && (
            <Button
              className="bg-[#6564db] hover:bg-[#232ed1] text-white font-semibold px-4 py-2 rounded-md shadow text-base flex items-center gap-2"
              onClick={() => setModalOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              New Member
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "members", label: "Members" },
            { id: "instructors", label: "Instructors" },
            { id: "staff", label: "Staff" },
            { id: "all", label: "All Contacts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ContactTab)}
              className={cn(
                "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const id = row.original?.id;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={id ? "cursor-pointer hover:bg-indigo-50 transition" : undefined}
                    onClick={row.original.instructor_id
                      ? () => router.push(`/dashboard/instructors/view/${row.original.instructor_id}`)
                      : id
                      ? () => router.push(`/dashboard/members/view/${id}`)
                      : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <AddMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        refresh={refreshMembers}
      />
    </div>
  );
} 