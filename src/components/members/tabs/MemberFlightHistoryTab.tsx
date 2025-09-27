"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as Tabs from "@radix-ui/react-tabs";
import { Calendar, Plane } from "lucide-react";
import type { FlightHistoryEntry } from "@/types/flight_history";
import type { Booking } from "@/types/bookings";

// Import the new tab components
import UpcomingBookingsTab from "./UpcomingBookingsTab";
import FlightHistoryTab from "./FlightHistoryTab";

interface MemberFlightHistoryTabProps {
  memberId: string;
}

export default function MemberFlightHistoryTab({ memberId }: MemberFlightHistoryTabProps) {
  // State for all data
  const [allFlights, setAllFlights] = useState<FlightHistoryEntry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructorNameById, setInstructorNameById] = useState<Record<string, { first_name?: string; last_name?: string }>>({});

  // UI state for tabs
  const [selectedTab, setSelectedTab] = useState("bookings");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [flightHistoryResponse, bookingsResponse] = await Promise.all([
          fetch(`/api/flight-history?user_id=${memberId}`),
          fetch(`/api/bookings`)
        ]);

        // Handle flight history
        const flightData = await flightHistoryResponse.json();
        if (flightHistoryResponse.ok) {
          setAllFlights(flightData.flight_history || []);
        } else {
          throw new Error(flightData.error || "Failed to load flight history");
        }

        // Handle bookings
        const bookingData = await bookingsResponse.json();
        if (bookingsResponse.ok) {
          // Filter bookings for this member, only future bookings, and sort by start_time (soonest first)
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of today

          const memberBookings = (bookingData.bookings || [])
            .filter((booking: Booking) => {
              const bookingDate = new Date(booking.start_time);
              return (
                booking.user_id === memberId &&
                booking.status === 'confirmed' &&
                bookingDate >= today
              );
            })
            .sort((a: Booking, b: Booking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          setBookings(memberBookings);

          // Resolve instructor names: instructor_id -> instructors -> users
          const uniqueInstructorIds = Array.from(new Set(
            memberBookings
              .map((b: Booking) => b.instructor_id)
              .filter((v: string | null): v is string => Boolean(v))
          ));

          if (uniqueInstructorIds.length > 0) {
            try {
              const instructorResults = await Promise.all(
                uniqueInstructorIds.map(async (id) => {
                  const res = await fetch(`/api/instructors?id=${id}`);
                  const json = await res.json();
                  return { id, data: json?.instructor } as { id: string; data?: { user_id?: string } };
                })
              );

              const instructorIdToUserId: Record<string, string> = {};
              const userIds: string[] = [];
              for (const r of instructorResults) {
                const userId = r.data?.user_id;
                if (r.id && userId) {
                  instructorIdToUserId[r.id] = userId;
                  userIds.push(userId);
                }
              }

              if (userIds.length > 0) {
                const usersRes = await fetch(`/api/users?ids=${userIds.join(',')}`);
                const usersJson = await usersRes.json();
                const usersArr = Array.isArray(usersJson.users) ? usersJson.users : [];
                const userMap: Record<string, { first_name?: string; last_name?: string }> = {};
                for (const u of usersArr) {
                  if (u?.id) {
                    userMap[u.id] = { first_name: u.first_name, last_name: u.last_name };
                  }
                }

                const nameMap: Record<string, { first_name?: string; last_name?: string }> = {};
                for (const [instructorId, userId] of Object.entries(instructorIdToUserId)) {
                  if (userMap[userId]) {
                    nameMap[instructorId] = userMap[userId];
                  }
                }
                setInstructorNameById(nameMap);
              }
            } catch (e) {
              console.error('Failed to resolve instructor names:', e);
              setInstructorNameById({});
            }
          } else {
            setInstructorNameById({});
          }
        } else {
          throw new Error(bookingData.error || "Failed to load bookings");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flight data");
        console.error("Error loading flight data:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [memberId]);


  const tabs = [
    { id: "bookings", label: "Upcoming Bookings", icon: Calendar },
    { id: "history", label: "Flight History", icon: Plane },
  ];

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flight data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Tabs */}
      <div className="w-full">
        <Tabs.Root
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <div className="w-full border-b border-gray-200 bg-white rounded-t-md">
            <Tabs.List
              className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
              aria-label="Flight tabs"
            >
              {tabs.map((tab) => {
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
            </Tabs.List>
          </div>

          <div className="w-full">
            <Tabs.Content value="bookings" className="h-full w-full">
              {selectedTab === "bookings" && (
                <UpcomingBookingsTab
                  memberId={memberId}
                  bookings={bookings}
                  setBookings={setBookings}
                  loading={false}
                  error={null}
                  instructorNameById={instructorNameById}
                />
              )}
            </Tabs.Content>

            <Tabs.Content value="history" className="h-full w-full">
              {selectedTab === "history" && (
                <FlightHistoryTab
                  memberId={memberId}
                  allFlights={allFlights}
                  loading={false}
                  error={null}
                />
              )}
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
}