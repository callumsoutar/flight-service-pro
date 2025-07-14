"use client";
import { useState } from "react";
import { Mail, Users, CreditCard, Calendar, History, GraduationCap, Clock, BookOpen, BarChart2, Check } from "lucide-react";
import MemberContactTab from "./tabs/MemberContactTab";
import { User } from "@/types/users";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import MemberMembershipsTab from "@/components/members/tabs/MemberMembershipsTab";
import MemberTrainingTab from "./tabs/MemberTrainingTab";
import MemberSyllabusEnrollmentTab from "./tabs/MemberSyllabusEnrollmentTab";
import MemberTrainingHistoryTab from "./tabs/MemberTrainingHistoryTab";
import MemberAccountTab from "./tabs/MemberAccountTab";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const tabItems = [
  { id: "contact", label: "Contact", icon: Mail },
  { id: "pilot", label: "Pilot Details", icon: Users },
  { id: "memberships", label: "Memberships", icon: Users },
  { id: "account", label: "Account", icon: CreditCard },
  { id: "flight", label: "Flight History", icon: History },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "exams", label: "Theory", icon: GraduationCap },
  { id: "syllabus-enrollment", label: "Syllabus", icon: BookOpen },
  { id: "training-history", label: "Progress", icon: BarChart2 },
  { id: "history", label: "History", icon: Clock },
];

export default function MemberTabs({ member }: { member: User }) {
  const [selectedTab, setSelectedTab] = useState("contact");

  // How many tabs to show before overspill
  const MAIN_TABS_COUNT = 6;
  const mainTabs = tabItems.slice(0, MAIN_TABS_COUNT);
  const overflowTabs = tabItems.slice(MAIN_TABS_COUNT);
  const selectedOverflow = overflowTabs.find((t) => t.id === selectedTab);

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <div className="w-full border-b border-gray-200 bg-white">
          <Tabs.List
            className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
            aria-label="Member tabs"
          >
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                    data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800
                    data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap`}
                  style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </Tabs.Trigger>
              );
            })}
            {overflowTabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                      ${selectedOverflow ? "border-indigo-700 text-indigo-800" : "text-muted-foreground hover:text-indigo-600"} whitespace-nowrap`}
                    style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                    aria-label="More tabs"
                  >
                    <ChevronDown className="w-5 h-5" />
                    <span>More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px] rounded-xl shadow-lg p-2 bg-white border border-gray-200">
                  {overflowTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = selectedTab === tab.id;
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onSelect={() => setSelectedTab(tab.id)}
                        className={`flex items-center gap-3 px-3 py-2 text-base rounded-lg transition-colors hover:bg-gray-100 focus:bg-gray-100 ${isActive ? "font-semibold text-indigo-700 bg-indigo-50" : "text-gray-900"}`}
                        data-state={isActive ? "active" : undefined}
                        style={{ minHeight: 44 }}
                      >
                        {isActive && <Check className="w-5 h-5 text-indigo-700" />}
                        <Icon className="w-5 h-5" />
                        <span>{tab.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </Tabs.List>
        </div>
        <div className="w-full p-6">
          <Tabs.Content value="contact" className="h-full w-full">
            <MemberContactTab member={member} />
          </Tabs.Content>
          <Tabs.Content value="pilot" className="h-full w-full">
            <div>
              <h3 className="text-lg font-semibold mb-2">Pilot Details</h3>
              <p className="text-gray-600">Pilot certification and licensing information will be displayed here.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="memberships" className="h-full w-full">
            <MemberMembershipsTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="account" className="h-full w-full">
            <MemberAccountTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="flight" className="h-full w-full">
            <div>
              <h3 className="text-lg font-semibold mb-2">Flight History</h3>
              <p className="text-gray-600">Flight logs and history will be displayed here.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="bookings" className="h-full w-full">
            <div>
              <h3 className="text-lg font-semibold mb-2">Bookings</h3>
              <p className="text-gray-600">Current and past bookings will be displayed here.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="exams" className="h-full w-full">
            <MemberTrainingTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="syllabus-enrollment" className="h-full w-full">
            <MemberSyllabusEnrollmentTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="training-history" className="h-full w-full">
            <MemberTrainingHistoryTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="history" className="h-full w-full">
            <MemberHistoryTab member={member} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
} 