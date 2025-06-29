import { User } from "@/types/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface MemberProfileHeaderProps {
  member: User;
}

export default function MemberProfileHeader({ member }: MemberProfileHeaderProps) {
  const initials = (member.first_name?.[0] || "") + (member.last_name?.[0] || "");
  const joinDate = member.created_at ? new Date(member.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "-";

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl shadow p-6 border border-gray-200">
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 text-3xl">
          {member.profile_image_url ? (
            <Image
              src={member.profile_image_url}
              alt={member.first_name || member.email}
              width={80}
              height={80}
              className="rounded-full object-cover"
              priority
            />
          ) : (
            <AvatarFallback>{initials || member.email[0]}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {member.first_name} {member.last_name}
            </span>
            <Badge variant="default" className="ml-2">Active</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-gray-700 text-base mt-1">
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0H9m3 0h3" /></svg>
              {member.email}
            </span>
            {member.phone && (
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 0v14a2 2 0 002 2h2a2 2 0 002-2V5m0 0h6m0 0v14a2 2 0 002 2h2a2 2 0 002-2V5m0 0h-6" /></svg>
                {member.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-10 4h6" /></svg>
              Member since {joinDate}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <Button variant="default" className="w-32">Edit Profile</Button>
      </div>
    </div>
  );
} 