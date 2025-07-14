import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Info, Plus } from "lucide-react";
import { format } from "date-fns";
import type { EquipmentUpdate, Equipment } from "@/types/equipment";
import React from "react";
import { Button } from "@/components/ui/button";
import { UpdateEquipmentModal } from "@/components/equipment/UpdateEquipmentModal";

interface EquipmentUpdatesTableProps {
  updates: EquipmentUpdate[];
  userMap: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  equipment?: Equipment;
  orgId?: string;
  refresh?: () => void;
}

export const EquipmentUpdatesTable: React.FC<EquipmentUpdatesTableProps> = ({ updates, userMap, loading, error, equipment, orgId, refresh }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  return (
    <Card className="p-0 overflow-x-auto">
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="text-xl font-semibold">Update History</div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Log Update
        </Button>
      </div>
      {equipment && orgId && (
        <UpdateEquipmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          equipment={equipment}
          orgId={orgId}
          refresh={refresh || (() => {})}
        />
      )}
      <div className="px-0 pb-6">
        <table className="min-w-full text-sm border rounded-lg overflow-hidden bg-white">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Info className="w-4 h-4 text-muted-foreground" /> Updated By</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4 text-muted-foreground" /> Updated At</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4 text-muted-foreground" /> Next Due At</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="text-center text-red-500 py-8">{error}</td></tr>
            ) : updates.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8">No update records found.</td></tr>
            ) : (
              updates.map((row) => {
                const updatedAt = row.updated_at ? format(new Date(row.updated_at), 'dd MMM yyyy · HH:mm') : null;
                const nextDueAt = row.next_due_at ? format(new Date(row.next_due_at), 'dd MMM yyyy') : null;
                const notesTruncated = row.notes && row.notes.length > 32 ? row.notes.slice(0, 32) + '…' : row.notes;
                return (
                  <tr
                    key={row.id}
                    className="transition-colors bg-white hover:bg-indigo-50/60 group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{userMap[row.updated_by] || row.updated_by}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{updatedAt ? <span className="text-gray-900">{updatedAt}</span> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{nextDueAt ? <span className="text-gray-900">{nextDueAt}</span> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-3 max-w-[180px] text-muted-foreground">
                      {row.notes && row.notes.length > 32 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <span className="cursor-pointer underline decoration-dotted" tabIndex={0} aria-label="Show full note">{notesTruncated}</span>
                          </PopoverTrigger>
                          <PopoverContent side="top" className="text-sm max-w-xs whitespace-pre-line">{row.notes}</PopoverContent>
                        </Popover>
                      ) : (
                        row.notes || <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}; 