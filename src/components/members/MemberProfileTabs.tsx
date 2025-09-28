"use client";
import { useState, Suspense, lazy } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User } from "@/types/users";
import MemberContactTab from "./tabs/MemberContactTab";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import { Clock } from "lucide-react";

const PilotDetailsTab = lazy(() => import("./tabs/MemberPilotDetailsTab"));
const MembershipsTab = lazy(() => import("./tabs/MemberMembershipsTab"));
const AccountTab = lazy(() => import("./tabs/MemberAccountTab"));
const FlightManagementTab = lazy(() => import("./tabs/MemberFlightHistoryTab"));
const TrainingHistoryTab = lazy(() => import("./tabs/MemberTrainingHistoryTab"));

interface MemberProfileTabsProps {
  member: User;
}

export default function MemberProfileTabs({ member }: MemberProfileTabsProps) {
  const [tab, setTab] = useState("contact");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="mb-4 flex flex-wrap gap-2 bg-transparent">
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="pilot">Pilot Details</TabsTrigger>
        <TabsTrigger value="memberships">Memberships</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="flight">Flight History</TabsTrigger>
        <TabsTrigger value="bookings">Bookings</TabsTrigger>
        <TabsTrigger value="training">Training</TabsTrigger>
        <TabsTrigger value="history">
          <Clock className="w-4 h-4 mr-1" />
          History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="contact">
        <MemberContactTab member={member} />
      </TabsContent>
      <TabsContent value="pilot">
        {tab === "pilot" && (
          <Suspense fallback={<div>Loading...</div>}>
            <PilotDetailsTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="memberships">
        {tab === "memberships" && (
          <Suspense fallback={<div>Loading...</div>}>
            <MembershipsTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="account">
        {tab === "account" && (
          <Suspense fallback={<div>Loading...</div>}>
            <AccountTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="flight">
        {tab === "flight" && (
          <Suspense fallback={<div>Loading...</div>}>
            <FlightManagementTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="bookings">
        {tab === "bookings" && (
          <Suspense fallback={<div>Loading...</div>}>
            <FlightManagementTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="training">
        {tab === "training" && (
          <Suspense fallback={<div>Loading...</div>}>
            <TrainingHistoryTab memberId={member.id} />
          </Suspense>
        )}
      </TabsContent>
      <TabsContent value="history">
        <MemberHistoryTab member={member} />
      </TabsContent>
    </Tabs>
  );
} 