"use client";
import { useOrgContext } from "@/components/OrgContextProvider";
import React from "react";

export default function OrgHeaderTitle() {
  const { currentOrgId } = useOrgContext();
  const [orgName, setOrgName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currentOrgId) return;
    fetch("/api/user-orgs")
      .then((res) => res.json())
      .then((data) => {
        if (data.orgs && data.orgs.length > 0) {
          interface Org {
            organization_id: string;
            name: string;
          }
          const found = data.orgs.find((org: Org) => org.organization_id === currentOrgId);
          setOrgName(found ? found.name : null);
        } else {
          setOrgName(null);
        }
      });
  }, [currentOrgId]);

  if (!orgName) return null;
  return (
    <span className="font-bold text-violet-700 text-base tracking-tight uppercase">
      {orgName}
    </span>
  );
} 