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
      {/* Main Search Interface */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg">
              <Search className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Search Bookings</h3>
              <p className="text-sm text-gray-500">Filter and search through your bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleClear}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear All
              </Button>
            )}

            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-6 bg-gray-50">
          <div className="space-y-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Date Range</label>
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {startDate ? format(startDate, "dd MMM yyyy") : "From date"}
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
                </div>

                <div className="flex items-center justify-center w-8 h-8 text-gray-400">
                  <span className="text-sm font-medium">to</span>
                </div>

                <div className="w-48">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {endDate ? format(endDate, "dd MMM yyyy") : "To date"}
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

                {/* Filter Toggle Button */}
                <Button
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "relative h-11 px-4",
                    hasActiveFilters && "bg-blue-50 border-blue-200 text-blue-700"
                  )}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {isExpanded ? 'Hide' : 'Filters'}
                  {getActiveFilterCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Additional Filters */}
            {isExpanded && (
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-4">Additional Filters</label>
                <div className="flex justify-start gap-8 w-2/3">
                  <div className="space-y-2 min-w-[200px] flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">Instructor</label>
                    </div>
                    <Select value={filters.instructor} onValueChange={(value) => handleFilterChange('instructor', value)}>
                      <SelectTrigger className="h-11 w-full">
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

                  <div className="space-y-2 min-w-[200px] flex-1">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">Aircraft</label>
                    </div>
                    <Select value={filters.aircraft} onValueChange={(value) => handleFilterChange('aircraft', value)}>
                      <SelectTrigger className="h-11 w-full">
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

                  <div className="space-y-2 min-w-[200px] flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                    </div>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger className="h-11 w-full">
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
        </div>
      </div>
    </div>
  );
}