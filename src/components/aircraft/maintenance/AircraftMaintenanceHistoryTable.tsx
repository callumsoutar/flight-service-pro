"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MaintenanceVisit } from "@/types/maintenance_visits";
import EditMaintenanceModal from "@/components/aircraft/maintenance/EditMaintenanceModal";

export default function AircraftMaintenanceHistoryTable() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  const router = useRouter();
  const [visits, setVisits] = useState<MaintenanceVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const refreshData = () => {
    if (!aircraft_id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/maintenance_visits?aircraft_id=${aircraft_id}`)
      .then((res) => res.json())
      .then((data: MaintenanceVisit[]) => {
        setVisits(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line
  }, [aircraft_id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Maintenance History</h2>
      </div>
      <div className="overflow-x-auto rounded-lg border border-muted bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Visit Date</th>
              <th className="px-4 py-2 text-left font-semibold">Visit Type</th>
              <th className="px-4 py-2 text-left font-semibold">Description</th>
              <th className="px-4 py-2 text-left font-semibold">Technician</th>
              <th className="px-4 py-2 text-left font-semibold">Hours at Visit</th>
              <th className="px-4 py-2 text-left font-semibold">Total Cost</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-left font-semibold">Date Out of Maintenance</th>
              <th className="px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="text-center text-red-500 py-8">{error}</td></tr>
            ) : visits.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8">No maintenance visits found.</td></tr>
            ) : (
              visits.map((visit) => (
                <tr key={visit.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{visit.visit_date ? visit.visit_date.split("T")[0] : "N/A"}</td>
                  <td className="px-4 py-2 font-semibold">{visit.visit_type}</td>
                  <td className="px-4 py-2">{visit.description}</td>
                  <td className="px-4 py-2">{visit.technician_name || "-"}</td>
                  <td className="px-4 py-2">{visit.hours_at_visit !== null && visit.hours_at_visit !== undefined ? visit.hours_at_visit : "-"}</td>
                  <td className="px-4 py-2">{visit.total_cost !== null && visit.total_cost !== undefined ? `$${visit.total_cost.toFixed(2)}` : "-"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={visit.status === "Completed" ? "secondary" : visit.status === "In Progress" ? "outline" : "default"} className="capitalize px-2 py-0.5 text-xs font-medium">{visit.status}</Badge>
                  </td>
                  <td className="px-4 py-2">{visit.date_out_of_maintenance ? visit.date_out_of_maintenance.split("T")[0] : "-"}</td>
                  <td className="px-4 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0"><MoreHorizontal className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          router.push(`/dashboard/aircraft/view/${aircraft_id}/maintenance/${visit.id}`);
                          setSelectedVisitId(visit.id);
                          setEditModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" />Edit Visit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <EditMaintenanceModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setSelectedVisitId(null);
        }}
        maintenanceVisitId={selectedVisitId}
        onSave={refreshData}
      />
    </div>
  );
} 