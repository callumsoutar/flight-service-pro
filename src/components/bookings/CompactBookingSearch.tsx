"use client";
import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, X, CalendarIcon, User, Plane } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CompactBookingSearchProps {
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
}

interface SearchFilters {
  instructor: string;
  aircraft: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function CompactBookingSearch({
  instructors,
  aircraftList,
  onSearch,
  onClear,
  isLoading = false
}: CompactBookingSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    instructor: "all",
    aircraft: "all",
    startDate: "",
    endDate: "",
    status: "all"
  });

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = React.useMemo(() => {
    return (
      filters.instructor !== "all" ||
      filters.aircraft !== "all" ||
      startDate !== null ||
      endDate !== null ||
      filters.status !== "all"
    );
  }, [filters, startDate, endDate]);

  const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDateChange = useCallback((field: 'start' | 'end', date: Date | null) => {
    if (field === 'start') {
      setStartDate(date);
      setFilters(prev => ({ ...prev, startDate: date ? date.toISOString().split('T')[0] : '' }));
    } else {
      setEndDate(date);
      setFilters(prev => ({ ...prev, endDate: date ? date.toISOString().split('T')[0] : '' }));
    }
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    const clearedFilters = {
      instructor: "all",
      aircraft: "all",
      startDate: "",
      endDate: "",
      status: "all"
    };
    setFilters(clearedFilters);
    setStartDate(null);
    setEndDate(null);
    onClear();
  }, [onClear]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.instructor !== "all") count++;
    if (filters.aircraft !== "all") count++;
    if (startDate) count++;
    if (endDate) count++;
    if (filters.status !== "all") count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Compact Search Bar */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Search Bookings</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Filter */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={
                    "w-36 justify-start text-left font-normal text-sm " +
                    (!startDate ? "text-muted-foreground" : "")
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd MMM yyyy") : <span>From date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ?? undefined}
                  onSelect={(date) => handleDateChange('start', date ?? null)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-gray-400 text-sm">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={
                    "w-36 justify-start text-left font-normal text-sm " +
                    (!endDate ? "text-muted-foreground" : "")
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd MMM yyyy") : <span>To date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ?? undefined}
                  onSelect={(date) => handleDateChange('end', date ?? null)}
                  disabled={(date) => startDate ? date < startDate : false}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "relative",
              hasActiveFilters && "bg-blue-50 border-blue-200 text-blue-700"
            )}
          >
            <Filter className="w-4 h-4" />
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>

          {/* Search & Clear Buttons */}
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? "Searching..." : "Search"}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Instructor</span>
              </div>
              <Select value={filters.instructor} onValueChange={(value) => handleFilterChange('instructor', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Instructors" />
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
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Aircraft</span>
              </div>
              <Select value={filters.aircraft} onValueChange={(value) => handleFilterChange('aircraft', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Aircraft" />
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
              <span className="text-sm font-medium">Status</span>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Statuses" />
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
        </div>
      )}
    </div>
  );
}