"use client";
import { useState } from "react";
import { Mail, Users, CreditCard, Calendar, History, GraduationCap, Clock, BookOpen, FileText } from "lucide-react";
import MemberContactTab from "./tabs/MemberContactTab";
import { User } from "@/types/users";
import MemberHistoryTab from "@/components/members/tabs/MemberHistoryTab";
import MemberMembershipsTab from "@/components/members/tabs/MemberMembershipsTab";
import MemberTrainingTab from "./tabs/MemberTrainingTab";
import MemberSyllabusEnrollmentTab from "./tabs/MemberSyllabusEnrollmentTab";
import MemberTrainingHistoryTab from "./tabs/MemberTrainingHistoryTab";
import MemberAccountTab from "./tabs/MemberAccountTab";

const tabItems = [
  { id: "contact", label: "Contact", icon: Mail },
  { id: "pilot", label: "Pilot Details", icon: Users },
  { id: "memberships", label: "Memberships", icon: Users },
  { id: "account", label: "Account", icon: CreditCard },
  { id: "flight", label: "Flight History", icon: History },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "exams", label: "Theory", icon: GraduationCap },
  { id: "syllabus-enrollment", label: "Syllabus", icon: BookOpen },
  { id: "training-history", label: "Progress", icon: BookOpen },
  { id: "history", label: "History", icon: Clock },
];

export default function MemberTabs({ member }: { member: User }) {
  const [selectedTab, setSelectedTab] = useState("contact");

  return (
    <div className="flex w-full h-full min-h-0 bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex-shrink-0 h-full min-w-[210px] max-w-[240px] border-r border-gray-300 p-6 flex flex-col gap-2 bg-gray-50 z-10">
        <div className="text-lg font-semibold mb-2 pl-1">Member</div>
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition font-medium text-base
                ${isActive ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}
              `}
              type="button"
              aria-current={isActive}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </aside>
      {/* Main Content */}
      <section className="flex-1 min-w-0 p-8 h-full min-h-0 overflow-y-auto">
        {selectedTab === "contact" && <MemberContactTab member={member} />}
        {selectedTab === "pilot" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Pilot Details</h3>
            <p className="text-gray-600">Pilot certification and licensing information will be displayed here.</p>
          </div>
        )}
        {selectedTab === "memberships" && <MemberMembershipsTab memberId={member.id} />}
        {selectedTab === "account" && (
          <MemberAccountTab memberId={member.id} />
        )}
        {selectedTab === "flight" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Flight History</h3>
            <p className="text-gray-600">Flight logs and history will be displayed here.</p>
          </div>
        )}
        {selectedTab === "bookings" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Bookings</h3>
            <p className="text-gray-600">Current and past bookings will be displayed here.</p>
          </div>
        )}
        {selectedTab === "exams" && <MemberTrainingTab memberId={member.id} />}
        {selectedTab === "syllabus-enrollment" && <MemberSyllabusEnrollmentTab memberId={member.id} />}
        {selectedTab === "training-history" && (
          <MemberTrainingHistoryTab memberId={member.id} />
        )}
        {selectedTab === "history" && <MemberHistoryTab member={member} />}
      </section>
    </div>
  );
} 