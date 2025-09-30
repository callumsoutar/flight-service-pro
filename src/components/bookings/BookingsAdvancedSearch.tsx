"use client";
import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Loader2 } from "lucide-react";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface BookingsAdvancedSearchProps {
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}

interface SearchFilters {
  instructor: string;
  aircraft: string;
  member: string;
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

export default function BookingsAdvancedSearch({
  members,
  instructors,
  aircraftList
}: BookingsAdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    instructor: "all",
    aircraft: "all",
    member: "all",
    startDate: "",
    endDate: "",
    status: "all"
  });

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const hasFilters = useMemo(() => {
    return (
      filters.instructor !== "all" ||
      filters.aircraft !== "all" ||
      filters.member !== "all" ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.status !== "all"
    );
  }, [filters]);

  const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const performSearch = useCallback(async (page: number = 1) => {
    if (!hasFilters) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          searchParams.append(key, value);
        }
      });

      searchParams.append('page', page.toString());
      searchParams.append('limit', '50');

      const response = await fetch(`/api/bookings/search?${searchParams}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      setSearchResults(result);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [filters, hasFilters]);

  const handleSearch = useCallback(() => {
    performSearch(1);
  }, [performSearch]);

  const handlePageChange = useCallback((page: number) => {
    performSearch(page);
  }, [performSearch]);

  const clearFilters = useCallback(() => {
    setFilters({
      instructor: "all",
      aircraft: "all",
      member: "all",
      startDate: "",
      endDate: "",
      status: "all"
    });
    setSearchResults(null);
    setHasSearched(false);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Advanced Booking Search
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Search and filter bookings using multiple criteria
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="member-filter">Member</Label>
            <Select value={filters.member} onValueChange={(value) => handleFilterChange('member', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor-filter">Instructor</Label>
            <Select value={filters.instructor} onValueChange={(value) => handleFilterChange('instructor', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aircraft-filter">Aircraft</Label>
            <Select value={filters.aircraft} onValueChange={(value) => handleFilterChange('aircraft', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select aircraft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aircraft</SelectItem>
                {aircraftList.map((aircraft) => (
                  <SelectItem key={aircraft.id} value={aircraft.id}>
                    {aircraft.registration} ({aircraft.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="flying">Flying</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSearch}
            disabled={!hasFilters || isSearching}
            className="flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search Bookings
          </Button>

          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>

        {/* Search Results */}
        {hasSearched && !isSearching && (
          <div className="space-y-4">
            {searchResults && searchResults.bookings.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Found {searchResults.totalCount} booking(s) matching your criteria
                  </p>

                  {searchResults.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {searchResults.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= searchResults.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>

                <BookingsTable
                  bookings={searchResults.bookings}
                  members={members}
                  instructors={instructors}
                  aircraftList={aircraftList}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or clearing filters to see more results.
                </p>
              </div>
            )}
          </div>
        )}

        {!hasSearched && !isSearching && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
            <p className="text-gray-600">
              Select your search criteria above and click &ldquo;Search Bookings&rdquo; to find matching records.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}