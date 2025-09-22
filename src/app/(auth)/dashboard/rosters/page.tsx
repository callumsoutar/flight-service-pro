'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { RosterAssignmentModal } from "@/components/rosters/RosterAssignmentModal";
import { EditRosterShiftModal } from "@/components/rosters/EditRosterShiftModal";
import { toast } from "sonner";
import { RosterRule } from "@/types/roster";
import { ShiftOverride } from "@/types/shift-overrides";
import { ScheduleShift } from "@/types/schedule";

// Define types for roster display
interface RosterShift {
  id: string;
  start: number;
  duration: number;
  name: string;
  type: 'regular' | 'add' | 'replace' | 'cancel';
  instructor: string;
  notes: string | null;
  effective_from?: string;
  effective_until?: string | null;
  is_active?: boolean;
  override_type?: string;
}

interface Instructor {
  id: string;
  user_id: string;
  name: string;
  endorsements: string;
  instructor_category?: {
    id: string;
    name: string;
    description: string | null;
    country: string;
  } | null;
}

const RosterScheduler = () => {
  // State for instructors
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // State for date navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for roster shifts (by instructor)
  const [rosterShifts, setRosterShifts] = useState<Record<string, RosterShift[]>>({});

  // State for modals and interactions
  const [hoveredShift, setHoveredShift] = useState<RosterShift | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{instructor: string, timeSlot: string} | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ScheduleShift | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [timelineOffset, setTimelineOffset] = useState(0);

  // Date navigation functions
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(selectedDate.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Configuration for timeline scrolling
  const VISIBLE_SLOTS = 18;

  // Time slots from 7:00 AM to 10:00 PM (30-minute intervals)
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Fetch instructors on component mount
  useEffect(() => {
    const fetchInstructors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [instructorsRes, endorsementsRes] = await Promise.all([
          fetch('/api/instructors'),
          fetch('/api/endorsements')
        ]);
        
        if (!instructorsRes.ok) throw new Error("Failed to fetch instructors");
        if (!endorsementsRes.ok) throw new Error("Failed to fetch endorsements");
        
        const instructorsData = await instructorsRes.json();
        const endorsementsData = await endorsementsRes.json();
        
        // Create a map of endorsement IDs to names for quick lookup
        const endorsementMap = new Map();
        (endorsementsData.endorsements || []).forEach((endorsement: { id: string; name: string }) => {
          endorsementMap.set(endorsement.id, endorsement.name);
        });
        
        // Fetch instructor endorsements for each instructor
        const instructorsWithEndorsements = await Promise.all(
          (instructorsData.instructors || [])
            .filter((instructor: { is_actively_instructing: boolean }) => {
              return instructor.is_actively_instructing === true;
            })
            .map(async (instructor: {
              id: string;
              user_id: string;
              first_name?: string;
              last_name?: string;
              users?: { email: string };
              instructor_category?: unknown;
              [key: string]: unknown
            }) => {
              try {
                const endorsementsRes = await fetch(`/api/instructor_endorsements?instructor_id=${instructor.id}`);
                if (endorsementsRes.ok) {
                  const endorsementsData = await endorsementsRes.json();
                  const endorsementNames = (endorsementsData.instructor_endorsements || [])
                    .map((ie: { endorsement_id: string }) => endorsementMap.get(ie.endorsement_id))
                    .filter(Boolean);
                  
                  return {
                    id: instructor.id,
                    user_id: instructor.user_id,
                    name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                    endorsements: endorsementNames.join(', ') || 'No endorsements',
                    instructor_category: instructor.instructor_category
                  };
                } else {
                  return {
                    id: instructor.id,
                    user_id: instructor.user_id,
                    name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                    endorsements: 'No endorsements',
                    instructor_category: instructor.instructor_category
                  };
                }
              } catch {
                return {
                  id: instructor.id,
                  user_id: instructor.user_id,
                  name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                  endorsements: 'No endorsements',
                  instructor_category: instructor.instructor_category
                };
              }
            })
        );
        
        setInstructors(instructorsWithEndorsements);
      } catch (err) {
        setError("Failed to load instructors");
        console.error("Error fetching instructors:", err);
        setInstructors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, []);

  // Fetch roster data when the selected date changes
  useEffect(() => {
    const fetchRosterData = async () => {
      if (instructors.length === 0) {
        setRosterShifts({});
        return;
      }

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayOfWeek = selectedDate.getDay();

        // Fetch roster rules and shift overrides
        const [rosterRulesRes, shiftOverridesRes] = await Promise.all([
          fetch(`/api/roster-rules?day_of_week=${dayOfWeek}&is_active=true`),
          fetch(`/api/shift-overrides?override_date=${dateStr}`)
        ]);

        if (!rosterRulesRes.ok || !shiftOverridesRes.ok) {
          console.error('Failed to fetch roster data');
          setRosterShifts({});
          return;
        }

        const rosterRulesData = await rosterRulesRes.json();
        const shiftOverridesData = await shiftOverridesRes.json();

        // Convert roster data to display format
        const shiftsByInstructor: Record<string, RosterShift[]> = {};

        // Process roster rules
        (rosterRulesData.roster_rules || []).forEach((rule: RosterRule) => {
          const instructor = instructors.find(inst => inst.id === rule.instructor_id);
          if (!instructor) return;

          // Check if rule is active for the selected date
          const effectiveFrom = new Date(rule.effective_from);
          const effectiveUntil = rule.effective_until ? new Date(rule.effective_until) : null;
          const selectedDateOnly = new Date(selectedDate);
          selectedDateOnly.setHours(0, 0, 0, 0);
          
          const isWithinDateRange = effectiveFrom <= selectedDateOnly && 
            (!effectiveUntil || effectiveUntil >= selectedDateOnly);
          
          if (!rule.is_active || !isWithinDateRange || rule.voided_at) return;

          // Check if this rule is replaced by an override
          const isReplaced = (shiftOverridesData.shift_overrides || []).some((override: ShiftOverride) => 
            override.instructor_id === rule.instructor_id &&
            override.override_type === 'replace' &&
            override.replaces_rule_id === rule.id &&
            !override.voided_at
          );

          // Check if there's a cancel override for this instructor on this date
          const isCancelled = (shiftOverridesData.shift_overrides || []).some((override: ShiftOverride) => 
            override.instructor_id === rule.instructor_id &&
            override.override_type === 'cancel' &&
            !override.voided_at
          );

          if (isReplaced || isCancelled) return;

          const [startHour, startMin] = rule.start_time.split(':').map(Number);
          const [endHour, endMin] = rule.end_time.split(':').map(Number);
          const startTime = startHour + startMin / 60;
          const endTime = endHour + endMin / 60;
          const duration = endTime - startTime;

          const shift: RosterShift = {
            id: rule.id,
            start: startTime,
            duration: duration,
            name: 'Regular Shift',
            type: 'regular',
            instructor: instructor.name,
            notes: rule.notes,
            effective_from: rule.effective_from,
            effective_until: rule.effective_until,
            is_active: rule.is_active
          };

          if (!shiftsByInstructor[instructor.name]) {
            shiftsByInstructor[instructor.name] = [];
          }
          shiftsByInstructor[instructor.name].push(shift);
        });

        // Process shift overrides
        (shiftOverridesData.shift_overrides || []).forEach((override: ShiftOverride) => {
          const instructor = instructors.find(inst => inst.id === override.instructor_id);
          if (!instructor || override.voided_at) return;

          if (override.override_type === 'cancel') {
            // Cancel overrides don't add shifts, they remove them (already handled above)
            return;
          }

          if (override.override_type === 'add' || override.override_type === 'replace') {
            if (!override.start_time || !override.end_time) return;

            const [startHour, startMin] = override.start_time.split(':').map(Number);
            const [endHour, endMin] = override.end_time.split(':').map(Number);
            const startTime = startHour + startMin / 60;
            const endTime = endHour + endMin / 60;
            const duration = endTime - startTime;

            const shift: RosterShift = {
              id: override.id,
              start: startTime,
              duration: duration,
              name: override.override_type === 'add' ? 'Added Shift' : 'Replacement Shift',
              type: override.override_type,
              instructor: instructor.name,
              notes: override.notes,
              override_type: override.override_type
            };

            if (!shiftsByInstructor[instructor.name]) {
              shiftsByInstructor[instructor.name] = [];
            }
            shiftsByInstructor[instructor.name].push(shift);
          }
        });

        setRosterShifts(shiftsByInstructor);
      } catch (error) {
        console.error('Error fetching roster data:', error);
        setRosterShifts({});
      }
    };

    fetchRosterData();
  }, [instructors, selectedDate]);

  const convertTimeToPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Convert decimal time to readable format
  const formatTime = (decimalTime: number) => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes}${period}`;
  };

  // Get shift time range as string
  const getShiftTimeRange = (shift: RosterShift) => {
    const startTime = formatTime(shift.start);
    const endTime = formatTime(shift.start + shift.duration);
    return `${startTime} - ${endTime}`;
  };

  // Get visible time slots based on current offset
  const getVisibleTimeSlots = () => {
    return timeSlots.slice(timelineOffset, timelineOffset + VISIBLE_SLOTS);
  };

  // Navigation functions
  const canScrollLeft = () => timelineOffset > 0;
  const canScrollRight = () => timelineOffset + VISIBLE_SLOTS < timeSlots.length;

  const scrollLeft = () => {
    if (canScrollLeft()) {
      setTimelineOffset(Math.max(0, timelineOffset - 1));
    }
  };

  const scrollRight = () => {
    if (canScrollRight()) {
      setTimelineOffset(Math.min(timeSlots.length - VISIBLE_SLOTS, timelineOffset + 1));
    }
  };

  // Get current time range for display
  const getCurrentTimeRange = () => {
    const visibleSlots = getVisibleTimeSlots();
    if (visibleSlots.length === 0) return '';
    return `${visibleSlots[0]} - ${visibleSlots[visibleSlots.length - 1]}`;
  };

  const getShiftStyle = (shift: RosterShift, rowHeight: number) => {
    const visibleSlots = getVisibleTimeSlots();
    
    if (visibleSlots.length === 0) {
      return { display: 'none' };
    }
    
    const firstVisibleTime = convertTimeToPosition(visibleSlots[0]);
    const lastVisibleTime = convertTimeToPosition(visibleSlots[visibleSlots.length - 1]) + 0.5;
    
    // Check if shift is visible in current viewport
    const shiftEnd = shift.start + shift.duration;
    const isVisible = shift.start < lastVisibleTime && shiftEnd > firstVisibleTime;
    
    if (!isVisible) {
      return { display: 'none' };
    }
    
    // Calculate position relative to visible area
    const timelineStart = firstVisibleTime;
    const timelineEnd = lastVisibleTime;
    const timelineSpan = timelineEnd - timelineStart;
    
    const actualStart = Math.max(timelineStart, shift.start);
    const actualEnd = Math.min(timelineEnd, shiftEnd);
    
    const startPercent = ((actualStart - timelineStart) / timelineSpan) * 100;
    const endPercent = ((actualEnd - timelineStart) / timelineSpan) * 100;
    const widthPercent = endPercent - startPercent;
    
    const finalWidth = Math.max(widthPercent, 1);
    
    // Color coding based on shift type
    let backgroundColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green for regular
    let boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
    
    switch (shift.type) {
      case 'regular':
        backgroundColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green
        boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
        break;
      case 'add':
        backgroundColor = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Blue
        boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
        break;
      case 'replace':
        backgroundColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Orange
        boxShadow = '0 4px 12px rgba(245, 158, 11, 0.25)';
        break;
    }

    return {
      position: 'absolute' as const,
      left: `${startPercent}%`,
      width: `${finalWidth}%`,
      height: `${rowHeight - 6}px`,
      background: backgroundColor,
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      zIndex: 20,
      top: '3px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      boxShadow: boxShadow,
      transition: 'all 0.2s ease-in-out',
      backdropFilter: 'blur(10px)'
    };
  };

  const handleCellClick = (instructor: string, timeSlot: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const instructorObj = instructors.find(inst => inst.name === instructor);
    if (!instructorObj) return;
    
    setSelectedInstructor(instructorObj);
    setSelectedTimeSlot(timeSlot);
    setShowAssignmentModal(true);
  };

  const handleTimeSlotHover = (instructor: string, timeSlot: string, event: React.MouseEvent) => {
    setHoveredTimeSlot({ instructor, timeSlot });
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleTimeSlotLeave = () => {
    setHoveredTimeSlot(null);
  };

  const handleShiftMouseEnter = (event: React.MouseEvent, shift: RosterShift) => {
    setHoveredShift(shift);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleShiftMouseLeave = () => {
    setHoveredShift(null);
  };

  const handleShiftMouseMove = (event: React.MouseEvent) => {
    if (hoveredShift) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleShiftClick = (shift: RosterShift, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const instructor = instructors.find(inst => inst.name === shift.instructor);
    if (!instructor) return;

    // Convert RosterShift to ScheduleShift format
    const [startHour, startMin] = shift.start.toString().includes('.') 
      ? [Math.floor(shift.start), Math.round((shift.start % 1) * 60)]
      : [shift.start, 0];
    
    const endTime = shift.start + shift.duration;
    const [endHour, endMin] = endTime.toString().includes('.') 
      ? [Math.floor(endTime), Math.round((endTime % 1) * 60)]
      : [endTime, 0];

    const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const scheduleShift: ScheduleShift = {
      id: shift.id,
      start_time: startTimeStr,
      end_time: endTimeStr,
      type: shift.type,
      notes: shift.notes,
      replaces_rule_id: null,
      // Include roster rule properties for regular shifts
      ...(shift.type === 'regular' && {
        effective_from: shift.effective_from,
        effective_until: shift.effective_until,
        is_active: shift.is_active
      })
    } as ScheduleShift & { effective_from?: string; effective_until?: string | null; is_active?: boolean };

    setSelectedShift(scheduleShift);
    setSelectedInstructor(instructor);
    setShowEditModal(true);
  };

  const handleAssignmentCreated = () => {
    // Refresh roster data after creating assignment
    refreshRosterData();
    toast.success('Roster assignment created successfully');
  };

  const handleShiftUpdated = () => {
    // Refresh roster data after updating shift
    refreshRosterData();
    toast.success('Roster shift updated successfully');
  };

  const handleShiftDeleted = () => {
    // Refresh roster data after deleting shift
    refreshRosterData();
    toast.success('Roster shift deleted successfully');
  };

  const refreshRosterData = () => {
    // Trigger re-render by updating selectedDate to force useEffect to run
    setSelectedDate(new Date(selectedDate.getTime()));
  };

  const renderInstructorRow = (instructor: Instructor) => {
    const instructorShifts = rosterShifts[instructor.name] || [];
    const rowHeight = 42;
    const visibleSlots = getVisibleTimeSlots();
    
    return (
      <div key={instructor.id} className="flex border-b border-gray-200 instructor-row group transition-all duration-200" style={{ height: `${rowHeight}px` }}>
        <div className="w-52 p-4 text-sm font-semibold border-r border-gray-100 flex items-center transition-all duration-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-900" style={{ height: `${rowHeight}px` }}>
          <div className="flex items-center space-x-3 w-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {instructor.name}{instructor.instructor_category ? ` (${instructor.instructor_category.name})` : ''}
              </div>
              {instructor.endorsements && (
                <div className="text-xs text-green-600 font-medium mt-0.5 truncate">
                  {instructor.endorsements}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 relative timeline-container" style={{ height: `${rowHeight}px` }}>
          {/* Time grid cells */}
          <div 
            className="grid w-full h-full absolute inset-0"
            style={{ gridTemplateColumns: `repeat(${visibleSlots.length}, 1fr)` }}
          >
            {visibleSlots.map((timeSlot) => (
              <div
                key={`${instructor.name}-${timeSlot}`}
                className="border-r border-gray-200 hover:bg-green-100 hover:border-green-300 cursor-pointer transition-all duration-200 min-w-[32px]"
                onClick={(e) => handleCellClick(instructor.name, timeSlot, e)}
                onMouseEnter={(e) => handleTimeSlotHover(instructor.name, timeSlot, e)}
                onMouseLeave={handleTimeSlotLeave}
              >
              </div>
            ))}
          </div>
          
          {/* Render roster shifts */}
          {instructorShifts.map((shift: RosterShift, index: number) => (
            <div
              key={`${instructor.name}-${shift.id}-${index}`}
              style={getShiftStyle(shift, rowHeight)}
              onMouseEnter={(e) => handleShiftMouseEnter(e, shift)}
              onMouseLeave={handleShiftMouseLeave}
              onMouseMove={handleShiftMouseMove}
              onClick={(e) => handleShiftClick(shift, e)}
              className="hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate flex-1">{shift.name}</span>
                {shift.type === 'regular' && (
                  <RotateCcw className="w-3 h-3 ml-1 flex-shrink-0 opacity-80" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white select-none rounded-md overflow-x-auto shadow-lg border min-w-[800px] max-w-full">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={goToPreviousDay}
              className="text-xl text-gray-600 hover:text-green-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="font-bold text-lg text-gray-800 hover:text-green-600 hover:bg-green-50"
                >
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  {format(selectedDate, "EEEE, dd MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <button 
              onClick={goToNextDay}
              className="text-xl text-gray-600 hover:text-green-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm">
            <button 
              onClick={goToToday}
              className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200 px-4 py-2 rounded-full font-medium cursor-pointer text-white"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Time Header with Navigation */}
      <div className="flex border-b border-gray-300 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="w-52 border-r border-gray-200 flex items-center justify-center bg-white">
          <div className="flex items-center space-x-2">
            <button 
              onClick={scrollLeft}
              disabled={!canScrollLeft()}
              className={`p-2 rounded-full transition-all duration-200 ${
                canScrollLeft() 
                  ? 'text-gray-600 hover:text-green-500 hover:bg-gray-100 cursor-pointer' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              ←
            </button>
            <div className="text-xs text-gray-700 font-medium text-center min-w-0">
              <div className="truncate">{getCurrentTimeRange()}</div>
            </div>
            <button 
              onClick={scrollRight}
              disabled={!canScrollRight()}
              className={`p-2 rounded-full transition-all duration-200 ${
                canScrollRight() 
                  ? 'text-gray-600 hover:text-green-500 hover:bg-gray-100 cursor-pointer' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              →
            </button>
          </div>
        </div>
        <div className="flex-1">
          <div
            className="grid w-full h-full"
            style={{ gridTemplateColumns: `repeat(${getVisibleTimeSlots().length}, 1fr)` }}
          >
            {getVisibleTimeSlots().map((timeSlot) => (
              <div
                key={timeSlot}
                className="border-r border-gray-200 text-xs py-1 px-0.5 text-center bg-gradient-to-r from-green-50 to-emerald-50 font-semibold text-gray-700 hover:bg-gradient-to-b hover:from-green-100 hover:to-emerald-100 transition-all duration-200 min-w-[32px]"
              >
                {timeSlot}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructors Section */}
      {loading ? (
        <div className="text-center py-8">Loading instructors...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No instructors available
        </div>
      ) : (
        instructors.map(instructor => renderInstructorRow(instructor))
      )}

      {/* Roster Shift Hover Modal */}
      {hoveredShift && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm animate-in fade-in duration-200">
            <div className={`rounded-lg p-3 mb-3 text-white ${
              hoveredShift.type === 'regular' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
              hoveredShift.type === 'add' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
              'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}>
              <h3 className="font-bold text-lg">{hoveredShift.instructor}</h3>
              <p className="text-white/90 text-sm">{hoveredShift.name}</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Type:</span>
                <span className="text-gray-600 capitalize">{hoveredShift.type}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Time:</span>
                <span className="text-gray-600">{getShiftTimeRange(hoveredShift)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Duration:</span>
                <span className="text-gray-600">{hoveredShift.duration}h</span>
              </div>
              
              {hoveredShift.effective_from && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-medium text-gray-700">Effective:</span>
                  <span className="text-gray-600">
                    From {format(new Date(hoveredShift.effective_from), 'MMM dd, yyyy')}
                    {hoveredShift.effective_until && ` to ${format(new Date(hoveredShift.effective_until), 'MMM dd, yyyy')}`}
                  </span>
                </div>
              )}
              
              {hoveredShift.notes && (
                <div className="flex items-start space-x-2 mt-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700 text-xs">Notes:</span>
                      <p className="text-xs text-gray-600 italic mt-1">{hoveredShift.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Hover Tooltip */}
      {hoveredTimeSlot && !hoveredShift && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-sm">
            <div className="font-medium">Click to create roster assignment</div>
            <div className="text-gray-300 text-xs mt-1">
              Instructor: {hoveredTimeSlot.instructor}
            </div>
            <div className="text-gray-300 text-xs">
              Time: {hoveredTimeSlot.timeSlot}
            </div>
          </div>
        </div>
      )}

      {/* Roster Assignment Modal */}
      {selectedInstructor && (
        <RosterAssignmentModal
          open={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedInstructor(null);
            setSelectedTimeSlot(null);
          }}
          instructor={selectedInstructor}
          selectedDay={format(selectedDate, 'yyyy-MM-dd')}
          selectedTimeSlot={selectedTimeSlot}
          onAssignmentCreated={handleAssignmentCreated}
        />
      )}

      {/* Edit Roster Shift Modal */}
      {selectedShift && selectedInstructor && (
        <EditRosterShiftModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedShift(null);
            setSelectedInstructor(null);
          }}
          shift={selectedShift}
          instructor={selectedInstructor}
          selectedDate={format(selectedDate, 'yyyy-MM-dd')}
          onShiftUpdated={handleShiftUpdated}
          onShiftDeleted={handleShiftDeleted}
        />
      )}
    </div>
  );
};

export default function RostersPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[96vw] px-6 pt-8 pb-12 flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Roster Management</h1>
              <p className="text-gray-600 text-sm">Manage instructor availability and shift schedules</p>
            </div>
          </div>
        </div>
        
        {/* Main content area - Roster Scheduler */}
        <div className="w-full overflow-hidden mx-auto">
          <RosterScheduler />
        </div>
      </div>
    </div>
  );
}
