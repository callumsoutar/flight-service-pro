"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/users";
import { Aircraft } from "@/types/aircraft";
import { Observation } from "@/types/observations";
import { Users, User as UserIcon, UserCheck, Plane, AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
}

export default function BookingResources({ member, instructor, aircraft }: BookingResourcesProps) {
  const [observationsOpen, setObservationsOpen] = useState(false);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Check if user has restricted access (member/student)
  const { isRestricted: isRestrictedUser } = useIsRestrictedUser();

  // Fetch observations for the aircraft
  const { data: observations } = useQuery<Observation[]>({
    queryKey: ['aircraft-observations', aircraft?.id],
    queryFn: async () => {
      if (!aircraft?.id) return [];
      const res = await fetch(`/api/observations?aircraft_id=${aircraft.id}`);
      if (!res.ok) throw new Error('Failed to fetch observations');
      return res.json();
    },
    enabled: !!aircraft?.id,
  });

  // Filter observations to show only open and investigation stages
  const activeObservations = observations?.filter(obs => 
    obs.observation_stage === 'open' || obs.observation_stage === 'investigation'
  ) || [];

  const stageColor: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    investigation: 'bg-orange-100 text-orange-800',
  };

  const statusColor: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const handleContactDetailsClick = (userId: string) => {
    setSelectedUserId(userId);
    setContactModalOpen(true);
  };

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
                onClick={() => handleContactDetailsClick(member.id)}
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

          {/* Aircraft Observations - Collapsible */}
          {aircraft?.id && activeObservations.length > 0 && (
            <Collapsible open={observationsOpen} onOpenChange={setObservationsOpen} className="mt-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-800">
                      {activeObservations.length} Active Observation{activeObservations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {observationsOpen ? (
                    <ChevronUp className="w-4 h-4 text-orange-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-orange-600" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {activeObservations.map((obs) => (
                  <div 
                    key={obs.id} 
                    className="bg-white border border-orange-200 rounded-lg p-3 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
                    onClick={() => setSelectedObservationId(obs.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">{obs.name}</div>
                      <div className="flex gap-1">
                        <Badge className={stageColor[obs.observation_stage] || ''} variant="outline">
                          {obs.observation_stage}
                        </Badge>
                        <Badge className={statusColor[obs.status] || ''} variant="outline">
                          {obs.status}
                        </Badge>
                      </div>
                    </div>
                    {obs.description && (
                      <div className="text-xs text-gray-600 mb-2">{obs.description}</div>
                    )}
                    <div className="text-xs text-gray-500">
                      Created {format(new Date(obs.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
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
      />
    </Card>
  );
} 