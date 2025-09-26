"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PublicMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  status: string;
  public_directory_opt_in: boolean;
}

interface PublicDirectoryTableProps {
  initialData: {
    members: PublicMember[];
    page: number;
    limit: number;
    total: number;
  };
  userRole: string;
}

const roleColors = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-red-100 text-red-800 border-red-200",
  instructor: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-green-100 text-green-800 border-green-200",
  student: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function PublicDirectoryTable(props: PublicDirectoryTableProps) {
  const { initialData } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [members] = useState<PublicMember[]>(initialData.members);

  // Filter members based on search term
  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  });

  const getRoleColor = (role: string) => {
    return roleColors[role as keyof typeof roleColors] || roleColors.member;
  };

  const getDisplayName = (member: PublicMember) => {
    const firstName = member.first_name?.trim() || "";
    const lastName = member.last_name?.trim() || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return member.email; // Fallback to email if no name
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{filteredMembers.length} of {members.length} members</span>
        </div>
      </div>

      {/* Members table */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms." : "No members have opted into the public directory yet."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {getDisplayName(member)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getRoleColor(member.role)} capitalize`}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-green-600 font-medium">
                      Public Member
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Info footer */}
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">About the Member Directory</p>
            <p className="text-blue-700">
              This directory shows members who have chosen to be visible to other members. 
              You can opt in or out of this directory in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
