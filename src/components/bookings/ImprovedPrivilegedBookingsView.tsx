"use client";
import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CompactBookingSearch from "./CompactBookingSearch";
import PrivilegedBookingTabs, { BookingTabType } from "./PrivilegedBookingTabs";
import UnconfirmedBookingsSection from "./UnconfirmedBookingsSection";
import FlyingBookingsSection from "./FlyingBookingsSection";
import TodaysBookingsSection from "./TodaysBookingsSection";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";
import { toast } from "sonner";

interface ImprovedPrivilegedBookingsViewProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  onBookingStatusUpdate?: (bookingId: string, newStatus: string) => void;
}

interface SearchFilters {
  instructor: string;
  aircraft: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface SearchResult {
  bookings: Booking[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export default function ImprovedPrivilegedBookingsView({
  bookings,
  members,
  instructors,
  aircraftList,
  onBookingStatusUpdate
}: ImprovedPrivilegedBookingsViewProps) {
  // Set default tab to unconfirmed if there are any unconfirmed bookings, otherwise today
  const defaultTab = useMemo(() => {
    const hasUnconfirmed = bookings.some(b => b.status === 'unconfirmed');
    return hasUnconfirmed ? "unconfirmed" : "today";
  }, [bookings]);

  const [activeTab, setActiveTab] = useState<BookingTabType>(defaultTab);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Calculate counts for tabs
  const counts = useMemo(() => {
    return {
      unconfirmed: bookings.filter(b => b.status === 'unconfirmed').length,
      flying: bookings.filter(b => b.status === 'flying').length,
      today: bookings.filter(b => {
        // Get today's date in local timezone (not UTC)
        const todayLocal = new Date();
        const localToday = todayLocal.getFullYear() + '-' +
                          String(todayLocal.getMonth() + 1).padStart(2, '0') + '-' +
                          String(todayLocal.getDate()).padStart(2, '0');

        // Convert booking times to local timezone for comparison
        const startDate = new Date(b.start_time);
        const endDate = new Date(b.end_time);

        const localStartDate = startDate.getFullYear() + '-' +
                              String(startDate.getMonth() + 1).padStart(2, '0') + '-' +
                              String(startDate.getDate()).padStart(2, '0');

        const localEndDate = endDate.getFullYear() + '-' +
                            String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(endDate.getDate()).padStart(2, '0');

        const isToday = localStartDate === localToday ||
                       (localStartDate < localToday && localEndDate >= localToday);
        return isToday && b.status === 'confirmed';
      }).length
    };
  }, [bookings]);

  // Get today's bookings
  const todaysBookings = useMemo(() => {
    // Get today's date in local timezone (not UTC)
    const today = new Date();
    const localToday = today.getFullYear() + '-' +
                      String(today.getMonth() + 1).padStart(2, '0') + '-' +
                      String(today.getDate()).padStart(2, '0');

    return bookings.filter(booking => {
      // Convert booking times to local timezone for comparison
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const localStartDate = startDate.getFullYear() + '-' +
                            String(startDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(startDate.getDate()).padStart(2, '0');

      const localEndDate = endDate.getFullYear() + '-' +
                          String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
                          String(endDate.getDate()).padStart(2, '0');

      // Show bookings that start today OR span into today (in local timezone)
      const isToday = localStartDate === localToday ||
                     (localStartDate < localToday && localEndDate >= localToday);

      return isToday && booking.status === 'confirmed';
    });
  }, [bookings]);

  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          searchParams.append(key, value);
        }
      });

      searchParams.append('page', '1');
      searchParams.append('limit', '50');

      const response = await fetch(`/api/bookings/search?${searchParams}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      setSearchResults(result);
      setActiveTab("search");
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Handle booking confirmation
  const handleConfirmBooking = useCallback(async (bookingId: string) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: bookingId,
          status: 'confirmed',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm booking');
      }

      toast.success('Booking confirmed successfully');

      // Update local state instead of reloading the page
      if (onBookingStatusUpdate) {
        onBookingStatusUpdate(bookingId, 'confirmed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm booking';
      toast.error(errorMessage);
    }
  }, [onBookingStatusUpdate]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "unconfirmed":
        return (
          <UnconfirmedBookingsSection
            bookings={bookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
            onConfirmBooking={handleConfirmBooking}
          />
        );
      case "flying":
        return (
          <FlyingBookingsSection
            bookings={bookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
          />
        );
      case "today":
        return (
          <TodaysBookingsSection
            bookings={todaysBookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
          />
        );
      case "search":
        return (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
                  <p className="text-sm text-gray-600">
                    {searchResults ?
                      `Found ${searchResults.totalCount} booking${searchResults.totalCount !== 1 ? 's' : ''} matching your criteria` :
                      'No search performed yet'
                    }
                  </p>
                </div>
                {searchResults && searchResults.totalCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-700">
                    {searchResults.totalCount} result{searchResults.totalCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {searchResults && searchResults.bookings.length > 0 ? (
                <BookingsTable
                  bookings={searchResults.bookings}
                  members={members}
                  instructors={instructors}
                  aircraftList={aircraftList}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search criteria to find more results.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Search Bar */}
      <CompactBookingSearch
        instructors={instructors}
        aircraftList={aircraftList}
        onSearch={handleSearch}
        onClear={handleClearSearch}
        isLoading={isSearching}
      />

      {/* Tab Navigation */}
      <PrivilegedBookingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unconfirmedCount={counts.unconfirmed}
        flyingCount={counts.flying}
        todayCount={counts.today}
        searchResultsCount={searchResults?.totalCount}
        hasSearchResults={searchResults !== null}
      />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}