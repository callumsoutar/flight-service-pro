"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Mail, Users, CreditCard, Calendar, History, GraduationCap, Clock } from "lucide-react";
import MemberContactTab from "./tabs/MemberContactTab";
import { User } from "@/types/users";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import MemberMembershipsTab from "@/components/members/tabs/MemberMembershipsTab";

const tabItems = [
  { id: "contact", label: "Contact", icon: Mail },
  { id: "pilot", label: "Pilot Details", icon: Users },
  { id: "memberships", label: "Memberships", icon: Users },
  { id: "account", label: "Account", icon: CreditCard },
  { id: "flight", label: "Flight History", icon: History },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "history", label: "History", icon: Clock },
];

export default function MemberTabs({ member }: { member: User }) {
  return (
    <Tabs defaultValue="contact" className="flex-1">
      <TabsList className="grid w-full grid-cols-8 mb-6">
        {tabItems.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-1">
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="contact">
        <MemberContactTab member={member} />
      </TabsContent>
      <TabsContent value="pilot">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Pilot Details</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Pilot certification and licensing information will be displayed here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="memberships">
        <MemberMembershipsTab memberId={member.id} />
      </TabsContent>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Account Information</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Account settings and preferences will be displayed here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="flight">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Flight History</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Flight logs and history will be displayed here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="bookings">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Bookings</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Current and past bookings will be displayed here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="training">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Training Records</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Training progress and certification records will be displayed here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="history">
        <MemberHistoryTab member={member} />
      </TabsContent>
    </Tabs>
  );
} 