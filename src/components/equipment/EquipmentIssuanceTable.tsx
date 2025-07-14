import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, LogIn } from "lucide-react";
import { format } from "date-fns";
import type { EquipmentIssuance, Equipment } from "@/types/equipment";
import React from "react";
import { Button } from "@/components/ui/button";
import { IssueEquipmentModal } from "@/components/equipment/IssueEquipmentModal";

interface EquipmentIssuanceTableProps {
  issuances: EquipmentIssuance[];
  userMap: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  equipment?: Equipment;
  orgId?: string;
  refresh?: () => void;
}

export const EquipmentIssuanceTable: React.FC<EquipmentIssuanceTableProps> = ({ issuances, userMap, loading, error, equipment, orgId, refresh }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  return (
    <Card className="p-0 overflow-x-auto">
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="text-xl font-semibold">Issuance History</div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" /> Issue Equipment
        </Button>
      </div>
      {equipment && orgId && (
        <IssueEquipmentModal
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
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Issued To</th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Issued By</th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4 text-muted-foreground" /> Issued At</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-muted-foreground" /> Returned At</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4 text-muted-foreground" /> Expected Return</span></th>
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center text-red-500 py-8">{error}</td></tr>
            ) : issuances.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8">No issuance records found.</td></tr>
            ) : (
              issuances.map((row) => {
                const issuedAt = row.issued_at ? format(new Date(row.issued_at), 'dd MMM yyyy · HH:mm') : null;
                const returnedAt = row.returned_at ? format(new Date(row.returned_at), 'dd MMM yyyy · HH:mm') : null;
                const expectedReturn = row.expected_return_date ? format(new Date(row.expected_return_date), 'dd MMM yyyy') : null;
                const notesTruncated = row.notes && row.notes.length > 32 ? row.notes.slice(0, 32) + '…' : row.notes;
                return (
                  <tr
                    key={row.id}
                    className="transition-colors bg-white hover:bg-indigo-50/60 group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{userMap[row.issued_to] || row.issued_to}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{userMap[row.issued_by] || row.issued_by}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {issuedAt ? (
                        <span className="text-gray-900">{issuedAt}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {returnedAt ? (
                        <span className="text-green-700 font-medium">{returnedAt}</span>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700">Issued</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {expectedReturn ? (
                        <span className="text-gray-900">{expectedReturn}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
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