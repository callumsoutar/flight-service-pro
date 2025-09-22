"use client";
import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CheckCircle, MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList, Sparkles, Plane, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { Booking } from "@/types/bookings";
import type { LessonProgress } from "@/types/lesson_progress";
import type { Invoice } from "@/types/invoices";
import FlightExperienceSection from "@/components/debrief/FlightExperienceSection";

interface ExperienceFormData {
  experience_type_id: string;
  duration_hours: number;
  notes?: string;
  conditions?: string;
}

export interface DebriefFormClientHandle {
  saveAllFormData: () => Promise<void>;
  getInvoiceId: () => string | null;
}

interface DebriefFormClientProps {
  booking: Booking;
  member: { id: string; first_name?: string; last_name?: string } | null;
}

const DebriefFormClient = forwardRef<DebriefFormClientHandle, DebriefFormClientProps>(
  function DebriefFormClient({ booking, member }, ref) {
    // Get flight log data (should be the first/only flight log for this booking)
    const flightLog = booking.flight_logs?.[0];
    
    // State for aircraft and lesson
    const [aircraft, setAircraft] = useState<Aircraft | null>(null);
    const [aircraftLoading, setAircraftLoading] = useState(false);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [lessonLoading, setLessonLoading] = useState(false);
    
    // State for lesson progress
    const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
    const [lessonProgressLoading, setLessonProgressLoading] = useState(false);
    
    // State for invoice
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    
    // Form state
    const [lessonStatus, setLessonStatus] = useState<'pass' | 'not yet competent'>('pass');
    const [instructorComments, setInstructorComments] = useState("");
    const [lessonHighlights, setLessonHighlights] = useState("");
    const [airmanship, setAirmanship] = useState("");
    const [areasForImprovement, setAreasForImprovement] = useState("");
    const [nextSteps, setNextSteps] = useState("");
    const [flightHoursLogged, setFlightHoursLogged] = useState("");
    const [weatherConditions, setWeatherConditions] = useState("");
    const [safetyObservations, setSafetyObservations] = useState("");
    
    // State for flight experiences
    const [flightExperiences, setFlightExperiences] = useState<ExperienceFormData[]>([]);

    // Fetch aircraft by checked_out_aircraft_id from flight_log
    useEffect(() => {
      const fetchAircraft = async () => {
        if (!flightLog?.checked_out_aircraft_id) return;
        setAircraftLoading(true);
        try {
          const res = await fetch(`/api/aircraft?id=${flightLog.checked_out_aircraft_id}`);
          const data = await res.json();
          setAircraft(data.aircraft || null);
        } catch {
          setAircraft(null);
        } finally {
          setAircraftLoading(false);
        }
      };
      fetchAircraft();
    }, [flightLog?.checked_out_aircraft_id]);

    // Fetch lesson by lesson_id
    useEffect(() => {
      const fetchLesson = async () => {
        if (!booking?.lesson_id) return;
        setLessonLoading(true);
        try {
          const res = await fetch(`/api/lessons?id=${booking.lesson_id}`);
          const data = await res.json();
          setLesson(data.lesson || null);
        } catch {
          setLesson(null);
        } finally {
          setLessonLoading(false);
        }
      };
      fetchLesson();
    }, [booking?.lesson_id]);

    // Fetch lesson progress by booking_id
    useEffect(() => {
      const fetchLessonProgress = async () => {
        if (!booking?.id) return;
        setLessonProgressLoading(true);
        try {
          const res = await fetch(`/api/lesson_progress?booking_id=${booking.id}`);
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const progress = data.data[0];
            setLessonProgress(progress);
            setLessonStatus(progress.status || 'pass');
            setInstructorComments(progress.instructor_comments || "");
            setLessonHighlights(progress.lesson_highlights || "");
            setAirmanship(progress.airmanship || "");
            setAreasForImprovement(progress.areas_for_improvement || "");
            setNextSteps(progress.focus_next_lesson || "");
            setWeatherConditions(progress.weather_conditions || "");
            setSafetyObservations(progress.safety_concerns || "");
          }
        } catch {
          setLessonProgress(null);
        } finally {
          setLessonProgressLoading(false);
        }
      };
      fetchLessonProgress();
    }, [booking?.id]);

    // Fetch invoice by booking_id
    useEffect(() => {
      const fetchInvoice = async () => {
        if (!booking?.id) return;
        try {
          const res = await fetch(`/api/invoices?booking_id=${booking.id}`);
          const data = await res.json();
          if (data.invoices && data.invoices.length > 0) {
            setInvoice(data.invoices[0]);
          }
        } catch {
          setInvoice(null);
        }
      };
      fetchInvoice();
    }, [booking?.id]);

    // Handle instructor comments update
    const handleInstructorCommentsChange = (value: string) => {
      setInstructorComments(value);
    };

    // Save instructor comments (auto-save on blur)
    const saveInstructorComments = async () => {
      if (!lessonProgress?.id) return;
      
      try {
        const res = await fetch(`/api/lesson_progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: lessonProgress.id,
            instructor_comments: instructorComments,
          }),
        });
        
        if (res.ok) {
          // Update local state
          setLessonProgress(prev => prev ? { ...prev, instructor_comments: instructorComments } : null);
        }
      } catch (error) {
        console.error('Failed to save instructor comments:', error);
      }
    };

    // Save all form data
    const saveAllFormData = async () => {
      if (!lessonProgress?.id) {
        // If no lesson progress exists, create one
        try {
          const res = await fetch(`/api/lesson_progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: booking.user_id,
              booking_id: booking.id,
              lesson_id: booking.lesson_id,
              instructor_id: booking.instructor_id,
              syllabus_id: lesson?.syllabus_id || null,
              status: lessonStatus,
              instructor_comments: instructorComments,
              lesson_highlights: lessonHighlights,
              airmanship: airmanship,
              areas_for_improvement: areasForImprovement,
              focus_next_lesson: nextSteps,
              weather_conditions: weatherConditions,
              safety_concerns: safetyObservations,
              date: new Date().toISOString().split('T')[0],
            }),
          });
          
          if (res.ok) {
            const newProgress = await res.json();
            setLessonProgress(newProgress.data);
            
            // Create flight experience records if any exist
            if (flightExperiences.length > 0) {
              try {
                const experiencePromises = flightExperiences.map(experience =>
                  fetch('/api/flight-experience', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      lesson_progress_id: newProgress.data.id,
                      booking_id: booking.id,
                      user_id: booking.user_id,
                      instructor_id: booking.instructor_id,
                      experience_type_id: experience.experience_type_id,
                      duration_hours: experience.duration_hours,
                      notes: experience.notes || null,
                      conditions: experience.conditions || null,
                    }),
                  })
                );
                
                await Promise.all(experiencePromises);
                setFlightExperiences([]); // Clear local experiences
              } catch (error) {
                console.error('Failed to save flight experiences:', error);
                toast.error('Debrief saved but failed to save some flight experiences');
              }
            }
            
            toast.success('Debrief saved successfully!');
          } else {
            const errorData = await res.json();
            toast.error(errorData.error || 'Failed to save debrief');
          }
        } catch (error) {
          console.error('Failed to create lesson progress:', error);
          toast.error('Failed to save debrief. Please try again.');
        }
        return;
      }
      
      try {
        const res = await fetch(`/api/lesson_progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: lessonProgress.id,
            instructor_id: booking.instructor_id,
            syllabus_id: lesson?.syllabus_id || null,
            status: lessonStatus,
            instructor_comments: instructorComments,
            lesson_highlights: lessonHighlights,
            airmanship: airmanship,
            areas_for_improvement: areasForImprovement,
            focus_next_lesson: nextSteps,
            weather_conditions: weatherConditions,
            safety_concerns: safetyObservations,
            date: new Date().toISOString().split('T')[0],
          }),
        });
        
        if (res.ok) {
          const updatedProgress = await res.json();
          setLessonProgress(updatedProgress.data);
          
          // Create flight experience records if any exist (for existing lesson progress)
          if (flightExperiences.length > 0) {
            try {
              const experiencePromises = flightExperiences.map(experience =>
                fetch('/api/flight-experience', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    lesson_progress_id: lessonProgress.id,
                    booking_id: booking.id,
                    user_id: booking.user_id,
                    instructor_id: booking.instructor_id,
                    experience_type_id: experience.experience_type_id,
                    duration_hours: experience.duration_hours,
                    notes: experience.notes || null,
                    conditions: experience.conditions || null,
                  }),
                })
              );
              
              await Promise.all(experiencePromises);
              setFlightExperiences([]); // Clear local experiences
            } catch (error) {
              console.error('Failed to save flight experiences:', error);
              toast.error('Debrief updated but failed to save some flight experiences');
            }
          }
          
          toast.success('Debrief updated successfully!');
        } else {
          const errorData = await res.json();
          toast.error(errorData.error || 'Failed to update debrief');
        }
      } catch (error) {
        console.error('Failed to save form data:', error);
        toast.error('Failed to update debrief. Please try again.');
      }
    };

    useImperativeHandle(ref, () => ({
      saveAllFormData,
      getInvoiceId: () => invoice?.id || null,
    }));

    return (
      <div className="flex flex-row gap-8">
        {/* Left Column */}
        <div className="flex-[2] flex flex-col gap-6 min-w-0">
          {/* Lesson Assessment */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <CheckCircle className="w-5 h-5 text-green-600 mr-1" />
              <CardTitle className="text-lg">Lesson Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-0 pb-4">
              <div className="flex gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">Lesson Status</label>
                <Button 
                  className={lessonStatus === 'pass' ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "border-green-600 text-green-600 hover:bg-green-50"} 
                  variant={lessonStatus === 'pass' ? "default" : "outline"}
                  onClick={() => setLessonStatus('pass')}
                >
                  Pass
                </Button>
                <Button 
                  variant={lessonStatus === 'not yet competent' ? "default" : "outline"} 
                  className={lessonStatus === 'not yet competent' ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : "border-red-500 text-red-600 hover:bg-red-50"}
                  onClick={() => setLessonStatus('not yet competent')}
                >
                  Not Yet Competent
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Instructor Comments */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <MessageCircle className="w-5 h-5 text-blue-600 mr-1" />
              <CardTitle className="text-lg">Instructor Comments</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              {lessonProgressLoading ? (
                <div className="text-muted-foreground">Loading comments...</div>
              ) : (
                <RichTextEditor
                  value={instructorComments}
                  onChange={handleInstructorCommentsChange}
                  onBlur={saveInstructorComments}
                  placeholder="Provide detailed feedback on the student's performance during this lesson..."
                  className="min-h-[120px]"
                />
              )}
            </CardContent>
          </Card>
          {/* Lesson Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ListChecks className="w-5 h-5 text-violet-600 mr-1" />
              <CardTitle className="text-lg">Lesson Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-0 pb-4">
              <div>
                <label htmlFor="lesson-highlights" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Lesson Highlights
                </label>
                <Textarea 
                  id="lesson-highlights"
                  value={lessonHighlights}
                  onChange={(e) => setLessonHighlights(e.target.value)}
                  className="mb-2" 
                  placeholder="What went particularly well during this lesson?" 
                />
              </div>
              <div>
                <label htmlFor="airmanship" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Plane className="w-4 h-4 text-blue-500" />
                  General Airmanship
                </label>
                <Textarea 
                  id="airmanship"
                  value={airmanship}
                  onChange={(e) => setAirmanship(e.target.value)}
                  className="mb-2" 
                  placeholder="Assessment of general airmanship skills displayed..." 
                />
              </div>
              <div>
                <label htmlFor="areas-for-improvement" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Areas for Improvement
                </label>
                <Textarea 
                  id="areas-for-improvement"
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  className="flex-1" 
                  placeholder="Areas that need attention..." 
                />
              </div>
            </CardContent>
          </Card>
          {/* Next Steps */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ArrowRightCircle className="w-5 h-5 text-indigo-600 mr-1" />
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <Textarea 
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Recommended next actions..." 
              />
            </CardContent>
          </Card>
        </div>
        {/* Right Column */}
        <div className="flex-[1] flex flex-col gap-6 min-w-0">
          {/* Flight Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <UserCircle2 className="w-5 h-5 text-gray-500 mr-1" />
              <CardTitle className="text-lg">Flight Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex flex-col gap-2">
                {/* Student Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div>
                    <div className="font-semibold">{member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() : booking.user_id}</div>
                    <div className="text-xs text-muted-foreground">Student Pilot</div>
                  </div>
                </div>
                {/* Aircraft */}
                <div className="flex flex-col gap-1 mt-2">
                  <div className="text-xs text-muted-foreground">Aircraft</div>
                  {aircraftLoading ? (
                    <div className="font-medium text-muted-foreground">Loading...</div>
                  ) : aircraft ? (
                    <div className="font-medium">{aircraft.registration} ({aircraft.type || "Unknown"})</div>
                  ) : (
                    <div className="font-medium text-muted-foreground">-</div>
                  )}
                  {/* Duration */}
                  <div className="text-xs text-muted-foreground mt-2">Duration</div>
                  <div className="font-medium">{flightLog?.flight_time !== null && flightLog?.flight_time !== undefined ? `${flightLog.flight_time} hours` : "-"}</div>
                  {/* Lesson */}
                  <div className="text-xs text-muted-foreground mt-2">Lesson</div>
                  {lessonLoading ? (
                    <div className="font-medium text-muted-foreground">Loading...</div>
                  ) : lesson ? (
                    <div className="font-medium">{lesson.name}</div>
                  ) : (
                    <div className="font-medium text-muted-foreground">-</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Flight Details */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ClipboardList className="w-5 h-5 text-gray-700 mr-1" />
              <CardTitle className="text-lg">Flight Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-0 pb-4">
              <label className="text-sm font-medium text-gray-700">Flight Hours Logged</label>
              <Input 
                type="number" 
                placeholder="2.0" 
                value={flightHoursLogged}
                onChange={(e) => setFlightHoursLogged(e.target.value)}
              />
              <Textarea 
                value={weatherConditions}
                onChange={(e) => setWeatherConditions(e.target.value)}
                placeholder="Weather Conditions: Weather during the flight..." 
              />
              <Textarea 
                value={safetyObservations}
                onChange={(e) => setSafetyObservations(e.target.value)}
                placeholder="Safety Observations: Any safety-related observations..." 
              />
            </CardContent>
          </Card>
          
          {/* Flight Experience Section */}
          <FlightExperienceSection
            lessonProgressId={lessonProgress?.id}
            bookingId={booking.id}
            userId={booking.user_id || undefined}
            instructorId={booking.instructor_id || undefined}
            onFlightExperienceChange={setFlightExperiences}
          />
        </div>
      </div>
    );
  }
);

export default DebriefFormClient; 