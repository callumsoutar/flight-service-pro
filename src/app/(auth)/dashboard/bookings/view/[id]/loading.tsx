import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function Loading() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center animate-pulse">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row skeleton */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <Skeleton className="h-10 w-48 rounded" />
            <Skeleton className="h-8 w-32 rounded" />
          </div>
          <div className="flex-none flex items-center justify-end">
            <Skeleton className="h-10 w-32 rounded" />
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
          <div className="flex-[2]">
            <Card className="w-full h-full">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-8 w-40 rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded mb-4" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="flex-[1]">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-32 rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded mb-2" />
                ))}
                <Skeleton className="h-10 w-full rounded mt-4" />
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
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 