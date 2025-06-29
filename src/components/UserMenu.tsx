"use client";
import { useState, useEffect } from "react";
// import { usePathname } from "next/navigation";
import { createClient } from "../lib/SupabaseBrowserClient";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Check } from "lucide-react";
import { useOrgContext } from "./OrgContextProvider";

export function UserMenu() {
  const [user, setUser] = useState<{ name: string; initials: string; email: string }>({ name: "User", initials: "U", email: "" });
  const [orgs, setOrgs] = useState<{ organization_id: string; name: string }[]>([]);
  const { currentOrgId, setOrgId } = useOrgContext();
  // const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const firstName = data.user.user_metadata?.first_name;
        const lastName = data.user.user_metadata?.last_name;
        let name = "User";
        if (firstName && lastName) {
          name = `${firstName} ${lastName}`;
        } else if (firstName) {
          name = firstName;
        } else if (data.user.user_metadata?.full_name) {
          name = data.user.user_metadata.full_name;
        } else if (data.user.user_metadata?.name) {
          name = data.user.user_metadata.name;
        }
        const email = data.user.email ?? "";
        let initials = "U";
        if (typeof name === "string" && name.trim().length > 0) {
          const chars = name
            .split(" ")
            .map((n: string) => n && n[0] ? n[0] : "")
            .join("")
            .toUpperCase()
            .slice(0, 2);
          if (chars.length > 0) {
            initials = chars;
          } else if (email.length > 0) {
            initials = email[0].toUpperCase();
          }
        } else if (email.length > 0) {
          initials = email[0].toUpperCase();
        }
        setUser({ name, initials, email });
      } else {
        setUser({ name: "User", initials: "U", email: "" });
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Fetch orgs and set the current org name
    // const cookieOrgId = getCookie("current_org_id");
    fetch("/api/user-orgs")
      .then((res) => res.json())
      .then((data) => {
        setOrgs(data.orgs || []);
      });
  }, [currentOrgId]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Handle org switch
  const handleOrgSwitch = async (orgId: string) => {
    if (orgId !== currentOrgId) {
      await setOrgId(orgId);
      window.location.replace(window.location.pathname);
    }
  };

  return (
    <div className="flex flex-row items-center gap-4">
      
      
      
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 focus:outline-none">
              <span className="font-medium text-gray-900 hidden md:block">Hello, {user?.name}</span>
              <Avatar>
                <AvatarFallback className="bg-violet-600 text-white font-bold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[13rem]" style={{ minWidth: 208 }}>
            {orgs.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-gray-500">Switch Organization</DropdownMenuLabel>
                {orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.organization_id}
                    onClick={() => handleOrgSwitch(org.organization_id)}
                    className="flex items-center gap-2 cursor-pointer justify-between"
                  >
                    <span className={org.organization_id === currentOrgId ? "font-semibold text-violet-800" : ""}>{org.name}</span>
                    {org.organization_id === currentOrgId && <Check className="w-4 h-4 text-green-600 ml-2" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => alert('Profile page coming soon!')} className="cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert('Settings page coming soon!')} className="cursor-pointer">
              My Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 