"use client";
import { useState, useRef, useEffect } from "react";
import { Mail, Users, CreditCard, Calendar, History, Clock, BarChart2 } from "lucide-react";
import MemberContactTab from "./tabs/MemberContactTab";
import { User } from "@/types/users";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import MemberMembershipsTab from "@/components/members/tabs/MemberMembershipsTab";
import MemberTrainingHistoryTab from "./tabs/MemberTrainingHistoryTab";
import MemberAccountTab from "./tabs/MemberAccountTab";
import MemberPilotDetailsTab from "./tabs/MemberPilotDetailsTab";
import MemberFlightHistoryTab from "./tabs/MemberFlightHistoryTab";
import * as Tabs from "@radix-ui/react-tabs";

const tabItems = [
  { id: "contact", label: "Contact", icon: Mail },
  { id: "pilot", label: "Pilot Details", icon: Users },
  { id: "memberships", label: "Memberships", icon: Users },
  { id: "account", label: "Account", icon: CreditCard },
  { id: "flight", label: "Flight Management", icon: Calendar },
  { id: "training-history", label: "Training", icon: BarChart2 },
  { id: "history", label: "History", icon: Clock },
];

export default function MemberTabs({ member }: { member: User }) {
  const [selectedTab, setSelectedTab] = useState("contact");
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Show all tabs directly
  const mainTabs = tabItems;

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