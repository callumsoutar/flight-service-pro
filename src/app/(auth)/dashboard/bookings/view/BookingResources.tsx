"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/users";
import { Aircraft } from "@/types/aircraft";
import { Observation } from "@/types/observations";
import { Users, User as UserIcon, UserCheck, Plane, AlertTriangle, Info } from "lucide-react";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ViewObservationModal } from "@/components/aircraft/ViewObservationModal";
import { ContactDetailsModal } from "@/components/bookings/ContactDetailsModal";
import { useIsRestrictedUser } from "@/hooks/use-role-protection";

// Define a type for the instructor with direct name fields
export type JoinedInstructor = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  users?: User; // Keep users optional for email fallback
};

interface BookingResourcesProps {
  member?: User | null;
  instructor?: JoinedInstructor | null;
  aircraft?: Aircraft | null;
  bookingStatus?: string;
  aircraftObservations?: Observation[];
  isRestrictedUser?: boolean;
}

export default function BookingResources({
  member,
  instructor,
  aircraft,
  bookingStatus,
  aircraftObservations = [],
  isRestrictedUser: serverIsRestrictedUser
}: BookingResourcesProps) {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Use server-provided isRestrictedUser if available, otherwise fall back to client hook
  const { isRestricted: clientIsRestrictedUser } = useIsRestrictedUser();
  const isRestrictedUser = serverIsRestrictedUser !== undefined ? serverIsRestrictedUser : clientIsRestrictedUser;

  // Use pre-loaded observations (already filtered for open/investigation stages)
  const activeObservations = aircraftObservations;


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Resources</CardTitle>
      </CardHeader>
      <CardContent>
        {/* People Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-base font-semibold">
            <Users className="w-5 h-5 text-primary" /> People
          </div>
          <div className="bg-muted/50 rounded-xl p-4 mb-2 flex items-center gap-3">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold">Member <Badge className="ml-2">Student</Badge></div>
              <div className="mt-1">{member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email : "-"}</div>
              <div className="text-gray-500 text-sm">{member?.email || "-"}</div>
            </div>
            {member?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUserId(member.id);
                  setContactModalOpen(true);
                }}
                className="h-8 w-8 p-0 hover:bg-blue-100"
                title="View contact details"
              >
                <Info className="w-4 h-4 text-blue-600" />
              </Button>
            )}
          </div>
{instructor ? (
            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-semibold">Instructor <Badge className="ml-2" variant="secondary">Staff</Badge></div>
                <div className="mt-1">
                  {`${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || "-"}
                </div>
                {!isRestrictedUser && (
                  <div className="text-gray-500 text-sm">{instructor.users?.email || "-"}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-semibold text-muted-foreground">Solo Booking</div>
                <div className="text-sm text-muted-foreground mt-1">No instructor assigned</div>
              </div>
            </div>
          )}
        </div>
        {/* Divider */}
        <div className="my-4 border-t border-muted" />
        {/* Aircraft Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-base font-semibold mt-4">
            <Plane className="w-5 h-5 text-primary" /> Aircraft
          </div>
          <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold mb-1">{aircraft ? `${aircraft.registration} (${aircraft.type || "Unknown"})` : "-"}</div>
              <div className="text-gray-500 text-sm">{aircraft?.manufacturer || ""}{aircraft?.year_manufactured ? `, ${aircraft.year_manufactured}` : ""}</div>
            </div>
          </div>

          {/* Aircraft Observations */}
          {aircraft?.id && activeObservations.length > 0 && bookingStatus !== 'complete' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2 text-sm text-orange-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
                  {activeObservations.length} Active Observation{activeObservations.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5 pl-6">
                {activeObservations.map((obs) => (
                  <button
                    key={obs.id}
                    onClick={() => setSelectedObservationId(obs.id)}
                    className="block text-left text-sm text-orange-800 hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    {obs.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* View Observation Modal */}
      {selectedObservationId && (
        <ViewObservationModal
          open={!!selectedObservationId}
          onClose={() => setSelectedObservationId(null)}
          observationId={selectedObservationId}
        />
      )}

      {/* Contact Details Modal */}
      <ContactDetailsModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        userId={selectedUserId}
        userData={member}
      />
    </Card>
  );
} 