import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, UserIcon, Plane, BadgeCheck, BookOpen, ClipboardList, StickyNote, AlignLeft } from "lucide-react";
import React from "react";

export default function Loading() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row skeleton */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <Skeleton className="h-8 w-48 rounded mb-1" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-10 w-24 rounded" />
          <div className="flex-none flex items-center justify-end gap-3">
            <Skeleton className="h-10 w-28 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>
        
        {/* Stages skeleton */}
        <div className="w-full flex flex-row items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded" />
          ))}
        </div>
        
        {/* Main content row skeleton */}
        <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
          {/* Left side - Form skeleton that matches BookingDetails structure */}
          <div className="flex-[2]">
            <Card className="w-full h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                  <Skeleton className="h-8 w-40 rounded" />
                </CardTitle>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-28 rounded" />
                  <Skeleton className="h-10 w-20 rounded" />
                </div>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                {/* Scheduled Times Section */}
                <div className="border rounded-xl p-6 bg-muted/50 mb-6">
                  <div className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    <Skeleton className="h-6 w-40 rounded" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <Skeleton className="h-4 w-24 rounded mb-2" />
                      <div className="flex gap-3 items-center">
                        <Skeleton className="h-10 w-44 rounded" />
                        <Skeleton className="h-10 w-28 rounded" />
                      </div>
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 rounded mb-2" />
                      <div className="flex gap-3 items-center">
                        <Skeleton className="h-10 w-44 rounded" />
                        <Skeleton className="h-10 w-28 rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member/Instructor Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <Skeleton className="h-4 w-32 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                </div>

                {/* Aircraft, Flight Type, Lesson, Booking Type Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Plane className="w-4 h-4" />
                      <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <BadgeCheck className="w-4 h-4" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <BookOpen className="w-4 h-4" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <ClipboardList className="w-4 h-4" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                </div>

                {/* Remarks & Purpose Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <StickyNote className="w-4 h-4" />
                      <Skeleton className="h-4 w-32 rounded" />
                    </div>
                    <Skeleton className="h-16 w-full rounded" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <AlignLeft className="w-4 h-4" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                    <Skeleton className="h-16 w-full rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right side - Resources skeleton */}
          <div className="flex-[1]">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-32 rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Member card */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-16 rounded mb-3" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 rounded mb-1" />
                      <Skeleton className="h-3 w-40 rounded" />
                    </div>
                  </div>
                </div>
                
                {/* Instructor card */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-20 rounded mb-3" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 rounded mb-1" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  </div>
                </div>
                
                {/* Aircraft card */}
                <div className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-18 rounded mb-3" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 rounded mb-1" />
                      <Skeleton className="h-3 w-32 rounded" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Booking History Collapsible skeleton */}
      <div className="w-full max-w-6xl px-4 pb-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40 rounded" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 mb-3 last:mb-0">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-6 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-32 rounded mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 