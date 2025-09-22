"use client";
import React, { useState, useEffect } from "react";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { User } from "lucide-react";

export type UserResult = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
};

type MemberSelectProps = {
  onSelect: (user: UserResult | null) => void;
  value: UserResult | null;
  disabled?: boolean;
};

export default function MemberSelect({ onSelect, value, disabled = false }: MemberSelectProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused || value) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetch(`/api/users?q=${encodeURIComponent(search)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data.users || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load users");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, focused, value]);

  return (
    <div className="relative w-full">
      <Command className="w-full border border-gray-200 bg-white rounded-lg">
        {value ? (
          <div className="flex items-center px-3 py-2">
            <User className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium text-gray-900">{value.first_name} {value.last_name}</span>
          </div>
        ) : (
          <CommandInput
            placeholder="Click to select member"
            value={search}
            onValueChange={disabled ? undefined : (val => {
              setSearch(val);
              onSelect(null);
            })}
            className="text-base bg-white border-0 shadow-none px-3 py-2 rounded-t-lg rounded-b-none focus:ring-0 focus:outline-none cursor-pointer"
            onFocus={disabled ? undefined : () => setFocused(true)}
            onBlur={disabled ? undefined : () => setTimeout(() => setFocused(false), 100)}
            readOnly={!!value || disabled}
            disabled={disabled}
          />
        )}
        {focused && !value && !disabled && (
          <div className="absolute left-0 right-0 z-10" style={{ top: '100%' }}>
            <CommandList className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-md rounded-t-none">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
              ) : error ? (
                <div className="px-4 py-3 text-sm text-red-500">{error}</div>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${u.first_name} ${u.last_name}`}
                    onSelect={disabled ? undefined : () => {
                      onSelect(u);
                      setFocused(false);
                    }}
                    className="flex items-center px-2 py-2 rounded-md hover:bg-indigo-50 transition text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2 text-indigo-500" />
                    <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                  </CommandItem>
                ))
              ) : (
                <CommandEmpty>No members found</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
      {value && !disabled && (
        <button
          type="button"
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 z-10 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(null);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
} 