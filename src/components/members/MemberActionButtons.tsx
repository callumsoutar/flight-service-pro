import { Button } from "@/components/ui/button";
import { FileText, Calendar, AlertTriangle } from "lucide-react";

const actionButtons = [
  { label: "New Invoice", icon: FileText, variant: "outline" as const },
  { label: "New Booking", icon: Calendar, variant: "outline" as const },
  { label: "Report Occurrence", icon: AlertTriangle, variant: "outline" as const, color: "text-red-600" },
];

export default function MemberActionButtons() {
  return (
    <div className="flex space-x-3 mb-6">
      {actionButtons.map((button) => (
        <Button
          key={button.label}
          variant={button.variant}
          className={`flex items-center space-x-2 ${button.color || ""}`}
        >
          <button.icon className="h-4 w-4" />
          <span>{button.label}</span>
        </Button>
      ))}
    </div>
  );
} 