"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/SupabaseBrowserClient";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import Link from "next/link";

export function UserMenu() {
  const [user, setUser] = useState<{ name: string; initials: string; email: string }>({ name: "User", initials: "U", email: "" });

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData.user) {
        // Fetch user data from public.users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', authData.user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
        }

        // Use data from public.users table, fallback to auth metadata
        const firstName = userData?.first_name || authData.user.user_metadata?.first_name;
        const lastName = userData?.last_name || authData.user.user_metadata?.last_name;
        const email = userData?.email || authData.user.email || "";
        
        let name = "User";
        if (firstName && lastName) {
          name = `${firstName} ${lastName}`;
        } else if (firstName) {
          name = firstName;
        } else if (authData.user.user_metadata?.full_name) {
          name = authData.user.user_metadata.full_name;
        } else if (authData.user.user_metadata?.name) {
          name = authData.user.user_metadata.name;
        } else if (email) {
          // Fallback to email prefix if no name is available
          name = email.split('@')[0];
        }

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
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
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                Profile
              </Link>
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