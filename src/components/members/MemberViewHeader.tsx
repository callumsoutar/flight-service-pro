"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MemberViewHeader() {
  const router = useRouter();
  return (
    <div className="flex items-center mb-1">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center space-x-2 pl-0 pr-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Members</span>
      </Button>
    </div>
  );
} 