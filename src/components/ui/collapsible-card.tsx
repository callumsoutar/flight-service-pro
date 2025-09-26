"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  summary?: string;
  quickActions?: React.ReactNode;
  className?: string;
  searchQuery?: string;
}

export function CollapsibleCard({
  title,
  description,
  icon,
  children,
  defaultExpanded = false,
  summary,
  quickActions,
  className,
  searchQuery,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Auto-expand if search query matches title or description
  const shouldShow = !searchQuery || 
    title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    description.toLowerCase().includes(searchQuery.toLowerCase());

  if (!shouldShow) {
    return null;
  }

  return (
    <Card className={cn("transition-all duration-200 shadow-sm hover:shadow-md", className)}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50/50 transition-colors py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center gap-3 mt-0.5">
              {icon}
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
                {summary && !isExpanded && (
                  <span className="text-sm text-gray-600 font-medium">{summary}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {quickActions && !isExpanded && (
              <div onClick={(e) => e.stopPropagation()}>
                {quickActions}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription className="mt-2 text-gray-600 leading-relaxed">{description}</CardDescription>
      </CardHeader>
      {isExpanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
