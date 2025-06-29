"use client";
import React, { createContext, useEffect, useState, useContext, useCallback } from "react";

interface OrgContextType {
  currentOrgId: string | null;
  setOrgId: (orgId: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  // Helper to read cookie client-side
  function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Set orgId via API route and update state
  const setOrgId = useCallback(async (orgId: string) => {
    await fetch("/api/set-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    // Wait for cookie to be set, then update state
    let tries = 0;
    let cookieOrgId = getCookie("current_org_id");
    while (cookieOrgId !== orgId && tries < 10) {
      await new Promise((res) => setTimeout(res, 50));
      cookieOrgId = getCookie("current_org_id");
      tries++;
    }
    setCurrentOrgId(cookieOrgId);
    console.log("[OrgContext] Set current_org_id via API to:", cookieOrgId);
  }, []);

  useEffect(() => {
    const cookieOrgId = getCookie("current_org_id");
    if (cookieOrgId) {
      setCurrentOrgId(cookieOrgId);
      console.log("[OrgContext] Found current_org_id in cookie:", cookieOrgId);
    } else {
      // Fetch user's orgs from the API route
      fetch("/api/user-orgs")
        .then((res) => res.json())
        .then((data) => {
          if (data.orgs && data.orgs.length > 0) {
            setOrgId(data.orgs[0].organization_id);
            console.log("[OrgContext] Set current_org_id from API to:", data.orgs[0].organization_id);
          } else {
            console.log("[OrgContext] No organizations found for user.");
          }
        });
    }
  }, [setOrgId]);

  return (
    <OrgContext.Provider value={{ currentOrgId, setOrgId }}>
      {children}
    </OrgContext.Provider>
  );
};

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used within OrgContextProvider");
  return ctx;
} 