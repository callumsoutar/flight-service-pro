"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GraduationCap, Award, BookOpen, Target } from "lucide-react";

export default function TrainingTab() {
  return (
    <div className="space-y-6">
      {/* Training Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Training Programs
          </CardTitle>
          <CardDescription>
            Configure available training programs and curricula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Training programs configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Certification Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certification Requirements
          </CardTitle>
          <CardDescription>
            Set requirements for different pilot certifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Certification requirements configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Progress Tracking
          </CardTitle>
          <CardDescription>
            Configure how student progress is tracked and reported
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Progress tracking configuration coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Training Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Training Materials
          </CardTitle>
          <CardDescription>
            Manage training resources and reference materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            Training materials management coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}