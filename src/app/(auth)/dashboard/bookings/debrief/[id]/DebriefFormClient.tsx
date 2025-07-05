"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList } from "lucide-react";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { Booking } from "@/types/bookings";

interface DebriefFormClientProps {
  booking: Booking;
  member: { id: string; first_name?: string; last_name?: string } | null;
}

export default function DebriefFormClient({ booking, member }: DebriefFormClientProps) {
  // State for aircraft and lesson
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [aircraftLoading, setAircraftLoading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  // Fetch aircraft by checked_out_aircraft_id
  useEffect(() => {
    const fetchAircraft = async () => {
      if (!booking?.checked_out_aircraft_id) return;
      setAircraftLoading(true);
      try {
        const res = await fetch(`/api/aircraft?id=${booking.checked_out_aircraft_id}`);
        const data = await res.json();
        setAircraft(data.aircraft || null);
      } catch {
        setAircraft(null);
      } finally {
        setAircraftLoading(false);
      }
    };
    fetchAircraft();
  }, [booking?.checked_out_aircraft_id]);

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
              <Button className="bg-green-600 hover:bg-green-700 text-white border-green-600" variant="default">
                Pass
              </Button>
              <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
                Needs Improvement
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
            <Textarea placeholder="Provide detailed feedback on the student's performance during this lesson..." />
          </CardContent>
        </Card>
        {/* Lesson Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ListChecks className="w-5 h-5 text-violet-600 mr-1" />
            <CardTitle className="text-lg">Lesson Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0 pb-4">
            <Textarea className="mb-2" placeholder="Lesson Highlights: What went particularly well during this lesson?" />
            <Textarea className="mb-2" placeholder="General Airmanship: Assessment of general airmanship skills displayed..." />
            <div className="flex gap-4">
              <Textarea className="flex-1" placeholder="Student Strengths: What the student did well..." />
              <Textarea className="flex-1" placeholder="Areas for Improvement: Areas that need attention..." />
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
            <Textarea placeholder="Recommended next actions..." />
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
                <div className="font-medium">{booking.flight_time !== null && booking.flight_time !== undefined ? `${booking.flight_time} hours` : "-"}</div>
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
            <Input type="number" placeholder="2.0" />
            <Textarea placeholder="Weather Conditions: Weather during the flight..." />
            <Textarea placeholder="Safety Observations: Any safety-related observations..." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 