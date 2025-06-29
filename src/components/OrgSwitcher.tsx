"use client";
import React, { useEffect, useState } from "react";
import { useOrgContext } from "./OrgContextProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

interface Org {
  organization_id: string;
  name: string;
}

export default function OrgSwitcher() {
  const { currentOrgId, setOrgId } = useOrgContext();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-orgs")
      .then((res) => res.json())
      .then((data) => {
        setOrgs(data.orgs || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <span>Loading organizations...</span>;
  if (!orgs.length) return <span>No organizations found</span>;

  if (orgs.length === 1) {
    return (
      <span className="font-bold text-lg text-violet-800 tracking-tight leading-tight">
        {orgs[0].name}
      </span>
    );
  }

  return (
    <Select value={currentOrgId ?? undefined} onValueChange={setOrgId}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.organization_id} value={org.organization_id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 