"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

export type Member = {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  profile_image_url?: string;
  role: string;
  status?: string;
};

export const columns: ColumnDef<Member>[] = [
  {
    accessorKey: "name",
    header: "Member",
    cell: ({ row }) => {
      const member = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {member.profile_image_url ? (
              <AvatarImage src={member.profile_image_url} alt={member.first_name || member.email} />
            ) : (
              <AvatarFallback>
                {member.first_name?.[0] || member.email[0]}
                {member.last_name?.[0] || ""}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="font-medium">
            {member.first_name || ""} {member.last_name || ""}
          </span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-zinc-700 dark:text-zinc-200">{row.original.email}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-medium capitalize">
        {row.original.role}
      </Badge>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="default" className="font-medium">
        {row.original.status ? row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1) : "Active"}
      </Badge>
    ),
    enableSorting: false,
  },
]; 