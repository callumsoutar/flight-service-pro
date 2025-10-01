"use client";
import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface FlightAuthorizationSearchProps {
  students: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
}

interface SearchFilters {
  student_id: string;
  aircraft_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function FlightAuthorizationSearch({
  onSearch,
  onClear,
  isLoading = false
}: FlightAuthorizationSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    student_id: "all",
    aircraft_id: "all",
    start_date: "",
    end_date: "",
    status: "all"
  });

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const hasActiveFilters = React.useMemo(() => {
    return startDate !== null || endDate !== null;
  }, [startDate, endDate]);

  // const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
  //   setFilters(prev => ({ ...prev, [field]: value }));
  // }, []);

  const handleDateChange = useCallback((field: 'start' | 'end', date: Date | null) => {
    if (field === 'start') {
      setStartDate(date);
      setFilters(prev => ({ ...prev, start_date: date ? date.toISOString().split('T')[0] : '' }));
    } else {
      setEndDate(date);
      setFilters(prev => ({ ...prev, end_date: date ? date.toISOString().split('T')[0] : '' }));
    }
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    const clearedFilters = {
      student_id: "all",
      aircraft_id: "all",
      start_date: "",
      end_date: "",
      status: "all"
    };
    setFilters(clearedFilters);
    setStartDate(null);
    setEndDate(null);
    onClear();
  }, [onClear]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border">
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <CalendarIcon className="w-3 h-3" />
        <span>From:</span>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              "w-24 justify-start text-left font-normal text-xs " +
              (!startDate ? "text-muted-foreground" : "")
            }
          >
            {startDate ? format(startDate, "dd/MM") : <span>Date</span>}
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

      <span className="text-gray-400 text-xs">to</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              "w-24 justify-start text-left font-normal text-xs " +
              (!endDate ? "text-muted-foreground" : "")
            }
          >
            {endDate ? format(endDate, "dd/MM") : <span>Date</span>}
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

      <Button
        onClick={handleSearch}
        disabled={isLoading}
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-700 text-xs px-2"
      >
        {isLoading ? "..." : "Search"}
      </Button>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}