"use client";
import { useState, useRef, useEffect } from "react";
import { Mail, Users, CreditCard, Calendar, History, GraduationCap, Clock, BookOpen, BarChart2 } from "lucide-react";
import MemberContactTab from "./tabs/MemberContactTab";
import { User } from "@/types/users";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import MemberMembershipsTab from "@/components/members/tabs/MemberMembershipsTab";
import MemberTrainingTab from "./tabs/MemberTrainingTab";
import MemberSyllabusEnrollmentTab from "./tabs/MemberSyllabusEnrollmentTab";
import MemberTrainingHistoryTab from "./tabs/MemberTrainingHistoryTab";
import MemberAccountTab from "./tabs/MemberAccountTab";
import MemberPilotDetailsTab from "./tabs/MemberPilotDetailsTab";
import MemberFlightHistoryTab from "./tabs/MemberFlightHistoryTab";
import MemberBookingsTab from "./tabs/MemberBookingsTab";
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
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabsListRef = useRef<HTMLDivElement>(null);

  // How many tabs to show before overspill
  const MAIN_TABS_COUNT = 6;
  const mainTabs = tabItems.slice(0, MAIN_TABS_COUNT);
  const overflowTabs = tabItems.slice(MAIN_TABS_COUNT);
  const selectedOverflow = overflowTabs.find((t) => t.id === selectedTab);

  // Update underline position when tab changes
  useEffect(() => {
    const activeTab = tabRefs.current[selectedTab];
    const tabsList = tabsListRef.current;
    
    if (activeTab && tabsList) {
      const tabsListRect = tabsList.getBoundingClientRect();
      const activeTabRect = activeTab.getBoundingClientRect();
      
      setUnderlineStyle({
        left: activeTabRect.left - tabsListRect.left,
        width: activeTabRect.width
      });
    }
  }, [selectedTab]);

  // Initial positioning on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeTab = tabRefs.current[selectedTab];
      const tabsList = tabsListRef.current;
      
      if (activeTab && tabsList) {
        const tabsListRect = tabsList.getBoundingClientRect();
        const activeTabRect = activeTab.getBoundingClientRect();
        
        setUnderlineStyle({
          left: activeTabRect.left - tabsListRect.left,
          width: activeTabRect.width
        });
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [selectedTab]);

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <div className="w-full border-b border-gray-200 bg-white relative">
          <Tabs.List
            ref={tabsListRef}
            className="flex flex-row gap-1 px-2 pt-2 min-h-[48px] relative"
            aria-label="Member tabs"
          >
            {/* Animated underline */}
            <div
              className="absolute bottom-0 h-0.5 bg-indigo-700 transition-all duration-300 ease-out"
              style={{
                left: `${underlineStyle.left}px`,
                width: `${underlineStyle.width}px`,
              }}
            />
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  value={tab.id}
                  className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer
                    data-[state=active]:text-indigo-800
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
                    ref={(el) => {
                      // Add ref for overflow tabs when they're selected
                      overflowTabs.forEach(tab => {
                        if (tab.id === selectedTab) {
                          tabRefs.current[tab.id] = el;
                        }
                      });
                    }}
                    className={`group inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer
                      ${selectedOverflow ? "text-indigo-800" : "text-muted-foreground hover:text-indigo-600"} whitespace-nowrap relative`}
                    style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                    aria-label={`More tabs (${overflowTabs.length} additional options)`}
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180`} />
                    <span>More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="min-w-[180px] rounded-lg shadow-xl p-2 bg-white border border-gray-200 space-y-1 animate-in slide-in-from-top-2 duration-200"
                  sideOffset={4}
                >
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100 mb-1">
                    Additional Options
                  </div>
                  {overflowTabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = selectedTab === tab.id;
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onSelect={() => setSelectedTab(tab.id)}
                        className={`group/item flex items-center gap-3 px-3 py-2.5 text-base rounded-md transition-all duration-150 ease-in-out hover:bg-indigo-50 focus:bg-indigo-50 hover:shadow-sm cursor-pointer ${isActive ? "font-semibold text-indigo-700 bg-indigo-50 shadow-sm" : "text-gray-900 hover:text-indigo-700"}`}
                        data-state={isActive ? "active" : undefined}
                        style={{ 
                          minHeight: 44,
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        <Icon className={`w-5 h-5 transition-colors duration-150 ${isActive ? "text-indigo-600" : "text-gray-500 group-hover/item:text-indigo-600"}`} />
                        <span className="flex-1">{tab.label}</span>
                        {isActive && (
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                        )}
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
            <MemberPilotDetailsTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="memberships" className="h-full w-full">
            <MemberMembershipsTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="account" className="h-full w-full">
            <MemberAccountTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="flight" className="h-full w-full">
            <MemberFlightHistoryTab memberId={member.id} />
          </Tabs.Content>
          <Tabs.Content value="bookings" className="h-full w-full">
            <MemberBookingsTab memberId={member.id} />
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